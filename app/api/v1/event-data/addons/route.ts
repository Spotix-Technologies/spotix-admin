/**
 * app/api/v1/event-data/addons/route.ts
 *
 * Addons — per-event extras an organizer asked Spotix to add (e.g.
 * wristbands, lanyards), billed per ticket at checkout. Stored at
 * events/{eventId}/addons/{addonId}.
 *
 * GET   ?eventId=            → list every addon on the event (active + inactive)
 * POST  { eventId, name, pricePerTicket, coveredBy } → create one
 * PATCH { eventId, addonId, action: "toggleActive" } → activate/deactivate
 *
 * This is the admin-dashboard's own API surface — see the identical
 * split at /api/v1/support-event-data/addons for the customer-support
 * dashboard's version, and the attendees route for the precedent on why
 * these stay two separate files rather than one shared, wider-role route.
 *
 * Creating and deactivating are full-admin only, same tier as pricing
 * edits (updatePricing in ../route.ts) — addons directly change what a
 * buyer pays, same as the platform fee does.
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data, developer: DEV_TAG }, { status })
}
function fail(message: string, status: number) {
  return NextResponse.json({ success: false, error: message, developer: DEV_TAG }, { status })
}

function serializeAddon(id: string, d: FirebaseFirestore.DocumentData) {
  return {
    id,
    name: d.name ?? "",
    pricePerTicket: typeof d.pricePerTicket === "number" ? d.pricePerTicket : 0,
    coveredBy: d.coveredBy === "organizer" ? "organizer" : "attendee",
    active: d.active !== false,
    addedBy: d.addedBy ?? "Unknown",
    addedByRole: d.addedByRole ?? null,
    createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? null,
    updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? null,
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccess(request)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  const snap = await adminDb.collection("events").doc(eventId).collection("addons").orderBy("createdAt", "desc").get()
  const addons = snap.docs.map((d) => serializeAddon(d.id, d.data()))
  return ok({ addons })
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["admin"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const eventId = String(body.eventId || "").trim()
  const name = String(body.name || "").trim()
  const pricePerTicket = Number(body.pricePerTicket)
  const coveredBy = body.coveredBy === "organizer" ? "organizer" : body.coveredBy === "attendee" ? "attendee" : null

  if (!eventId) return fail("eventId is required", 400)
  if (!name) return fail("Addon name is required", 400)
  if (!Number.isFinite(pricePerTicket) || pricePerTicket < 0) return fail("pricePerTicket must be a number of 0 or more", 400)
  if (!coveredBy) return fail('coveredBy must be "attendee" or "organizer"', 400)

  const eventRef = adminDb.collection("events").doc(eventId)
  const eventSnap = await eventRef.get()
  if (!eventSnap.exists) return fail("Event not found", 404)

  const now = new Date()
  const addonRef = eventRef.collection("addons").doc()
  await addonRef.set({
    name,
    pricePerTicket,
    coveredBy,
    active: true,
    addedBy: auth.username,
    addedByRole: auth.role,
    createdAt: now,
    updatedAt: now,
  })

  return ok({ message: "Addon created", addon: serializeAddon(addonRef.id, { name, pricePerTicket, coveredBy, active: true, addedBy: auth.username, addedByRole: auth.role, createdAt: now.toISOString(), updatedAt: now.toISOString() }) }, 201)
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["admin"])
  if ("error" in auth) return auth.error

  const body = await request.json().catch(() => ({}))
  const eventId = String(body.eventId || "").trim()
  const addonId = String(body.addonId || "").trim()
  const action = body.action

  if (!eventId || !addonId) return fail("eventId and addonId are required", 400)

  const addonRef = adminDb.collection("events").doc(eventId).collection("addons").doc(addonId)
  const addonSnap = await addonRef.get()
  if (!addonSnap.exists) return fail("Addon not found", 404)

  if (action === "toggleActive") {
    const nextActive = !(addonSnap.data()?.active !== false)
    await addonRef.update({ active: nextActive, updatedAt: FieldValue.serverTimestamp() })
    return ok({ message: nextActive ? "Addon activated" : "Addon deactivated", active: nextActive })
  }

  return fail(`Unknown action: ${action}`, 400)
}
