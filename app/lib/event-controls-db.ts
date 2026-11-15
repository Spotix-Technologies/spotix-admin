// Server-side data access for the admin "Event Controls" page.
//
// The Spotix user app reads two Firestore collections straight from the
// client (src/components/landing/Events.tsx, src/app/home/lib/featured.ts):
//
//   featuredEvents/{id}  { eventId, creatorID, eventName, imageURL, eventType,
//                          venue, eventStartDate, freeOrPaid, bookerName, addedAt }
//   themedEvents/{id}    same shape + { theme }
//
// Both are ordered by `addedAt` desc and capped (see CONTROL_LIMITS), and
// entries without eventId/creatorID are skipped. This module writes docs in
// exactly that shape, denormalised from the live `events/{eventId}` doc.
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import {
  ADMIN_LIST_LIMIT,
  CONTROL_COLLECTIONS,
  CONTROL_LIMITS,
  DEFAULT_THEME,
  MAX_THEME_LENGTH,
} from "@/admin-dashboard/event-controls/constants"
import type { ControlEvent, ControlKind, ControlsPayload } from "@/admin-dashboard/event-controls/types"

export class ControlsError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

const iso = (v: any): string | null =>
  v?.toDate ? v.toDate().toISOString() : typeof v === "string" ? v : null

export const isKind = (v: unknown): v is ControlKind => v === "featured" || v === "themed"

export function normalizeTheme(raw: unknown): string {
  const t = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : ""
  if (!t) return DEFAULT_THEME
  if (t.length > MAX_THEME_LENGTH) throw new ControlsError(`Theme must be ${MAX_THEME_LENGTH} characters or fewer`, 400)
  return t
}

function toControlEvent(kind: ControlKind, doc: FirebaseFirestore.QueryDocumentSnapshot, index: number): ControlEvent {
  const d = doc.data()
  const invalid = !d.eventId || !d.creatorID
  return {
    id: doc.id,
    kind,
    eventId: d.eventId ?? "",
    eventName: d.eventName ?? "Untitled",
    imageURL: d.imageURL ?? "",
    eventType: d.eventType ?? "",
    venue: d.venue ?? "",
    eventStartDate: d.eventStartDate ?? "",
    freeOrPaid: d.freeOrPaid === true,
    creatorID: d.creatorID ?? "",
    bookerName: d.bookerName || "Event Organizer",
    theme: kind === "themed" ? d.theme || DEFAULT_THEME : null,
    addedAt: iso(d.addedAt),
    addedBy: d.addedBy ?? null,
    live: !invalid && index < CONTROL_LIMITS[kind],
    invalid,
  }
}

async function listKind(kind: ControlKind): Promise<ControlEvent[]> {
  const snap = await adminDb
    .collection(CONTROL_COLLECTIONS[kind])
    .orderBy("addedAt", "desc")
    .limit(ADMIN_LIST_LIMIT)
    .get()
  return snap.docs.map((doc, i) => toControlEvent(kind, doc, i))
}

export async function listControls(): Promise<ControlsPayload> {
  const [featured, themed] = await Promise.all([listKind("featured"), listKind("themed")])
  const themes = [...new Set(themed.map((e) => e.theme).filter((t): t is string => !!t))].sort()
  return { featured, themed, limits: CONTROL_LIMITS, themes }
}

export async function addControl(
  kind: ControlKind,
  eventId: string,
  themeInput: unknown,
  admin: { uid: string; username: string },
): Promise<ControlEvent> {
  const id = eventId.trim()
  if (!id || id.includes("/")) throw new ControlsError("A valid eventId is required", 400)

  const eventSnap = await adminDb.collection("events").doc(id).get()
  if (!eventSnap.exists) throw new ControlsError("Event not found", 404)
  const e = eventSnap.data()!

  if (e.suspended === true) throw new ControlsError("This event is suspended and can't be promoted", 422)
  if (e.status === "cancelled") throw new ControlsError("This event is cancelled and can't be promoted", 422)
  if (!e.organizerId) throw new ControlsError("This event has no organizer on record", 422)

  const col = adminDb.collection(CONTROL_COLLECTIONS[kind])
  const existing = await col.where("eventId", "==", id).limit(1).get()
  if (!existing.empty) {
    throw new ControlsError(`This event is already in ${kind === "featured" ? "Featured" : "Themed"} events`, 409)
  }

  let bookerName = "Event Organizer"
  try {
    const org = await adminDb.collection("users").doc(e.organizerId).get()
    bookerName = org.data()?.fullName || bookerName
  } catch {
    // organizer name is cosmetic — never block on it
  }

  const payload: Record<string, unknown> = {
    eventId: id,
    creatorID: e.organizerId,
    eventName: e.eventName || "Untitled",
    imageURL: e.eventImage || "",
    eventType: e.eventType || "",
    venue: e.eventVenue || "",
    eventStartDate: e.eventDate || "",
    freeOrPaid: e.isFree !== true,
    bookerName,
    addedAt: FieldValue.serverTimestamp(),
    addedBy: admin.username || admin.uid,
    addedByUid: admin.uid,
  }
  if (kind === "themed") payload.theme = normalizeTheme(themeInput)

  // Doc id = eventId so two concurrent adds can't both succeed.
  const ref = col.doc(id)
  try {
    await ref.create(payload)
  } catch (err: any) {
    if (err?.code === 6) throw new ControlsError("This event is already in the list", 409)
    throw err
  }

  const saved = await ref.get()
  return toControlEvent(kind, saved as FirebaseFirestore.QueryDocumentSnapshot, 0)
}

export async function updateTheme(id: string, themeInput: unknown): Promise<string> {
  const theme = normalizeTheme(themeInput)
  const ref = adminDb.collection(CONTROL_COLLECTIONS.themed).doc(id)
  if (!(await ref.get()).exists) throw new ControlsError("Themed event not found", 404)
  await ref.update({ theme, updatedAt: FieldValue.serverTimestamp() })
  return theme
}

export async function removeControl(kind: ControlKind, id: string): Promise<void> {
  const ref = adminDb.collection(CONTROL_COLLECTIONS[kind]).doc(id)
  if (!(await ref.get()).exists) throw new ControlsError("Entry not found — it may already be removed", 404)
  await ref.delete()
}
