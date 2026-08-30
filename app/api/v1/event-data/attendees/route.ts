/**
 * app/api/v1/event-data/attendees/route.ts
 *
 * GET /api/v1/event-data/attendees?eventId=xxx
 *
 *   Default (browse):  ?limit=15&cursor=<lastDocId>
 *     → { attendees, nextCursor, hasMore, totalCount, verifiedCount, unverifiedCount }
 *     Reads only `limit` docs (+ one cursor-doc re-fetch when paging), not
 *     the whole collection. totalCount/verifiedCount use Firestore's
 *     count() aggregation, a single read regardless of collection size.
 *
 *   Full list:          ?all=true
 *     → { attendees }  (every attendee — used for the "search everyone"
 *       fallback and the guest-registry export dialog, both of which
 *       genuinely need the complete set. Mirrors spotix-booker's
 *       app/api/event/list/[eventId]/attendees/route.ts.)
 *
 * Access: admin only. customer-support and exec-assistant now call their
 * own separate route, /api/v1/support-event-data/attendees, instead of
 * this one — see that file for why.
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}
function fail(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function tsToDateString(ts: FirebaseFirestore.Timestamp | string | null | undefined): string {
  if (!ts) return "Unknown"
  if (typeof ts === "string") return ts
  try { return ts.toDate().toLocaleDateString() } catch { return "Unknown" }
}

function mapAttendeeDoc(d: FirebaseFirestore.QueryDocumentSnapshot) {
  const a = d.data()
  return {
    id: d.id,
    fullName: a.fullName ?? "Unknown",
    email: a.email ?? "no-email@example.com",
    ticketType: a.ticketType ?? "Standard",
    verified: a.verified ?? false,
    purchaseDate: tsToDateString(a.purchaseDate),
    ticketReference: a.ticketReference ?? "Unknown",
    facialEnroll: a.faceEmbedding ? "enrolled" as const : "unenrolled" as const,
    faceEmbedding: a.faceEmbedding ?? null,
  }
}

const DEFAULT_PAGE_SIZE = 15
const MAX_PAGE_SIZE = 50

export async function GET(req: NextRequest) {
  const auth = await verifyAdminAccess(req, ["admin"])
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  const eventRef = adminDb.collection("events").doc(eventId)
  const eventSnap = await eventRef.get()
  if (!eventSnap.exists) return fail("Event not found", 404)

  const eventName = eventSnap.data()?.eventName ?? ""
  const attendeesCol = eventRef.collection("attendees")
  const wantsAll = searchParams.get("all") === "true"

  // ── Full list — only for the "search everyone" fallback and the guest
  // registry export dialog, both of which genuinely need every record. ──
  if (wantsAll) {
    try {
      const snap = await attendeesCol.get()
      return ok({ attendees: snap.docs.map(mapAttendeeDoc), eventName })
    } catch (e) {
      console.error("[GET admin attendees] full-list fetch failed", e)
      return fail("Failed to load attendees", 500)
    }
  }

  // ── Default: paginated browse, 15 at a time ──
  const limitParam = parseInt(searchParams.get("limit") ?? "", 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE
  const cursorId = searchParams.get("cursor")

  try {
    let query = attendeesCol.orderBy("purchaseDate", "desc").limit(limit + 1)

    if (cursorId) {
      const cursorSnap = await attendeesCol.doc(cursorId).get()
      if (cursorSnap.exists) query = query.startAfter(cursorSnap)
    }

    const [pageSnap, totalAgg, verifiedAgg] = await Promise.all([
      query.get(),
      attendeesCol.count().get(),
      attendeesCol.where("verified", "==", true).count().get(),
    ])

    const docs = pageSnap.docs
    const hasMore = docs.length > limit
    const pageDocs = hasMore ? docs.slice(0, limit) : docs

    const totalCount = totalAgg.data().count
    const verifiedCount = verifiedAgg.data().count

    return ok({
      attendees: pageDocs.map(mapAttendeeDoc),
      nextCursor: hasMore ? pageDocs[pageDocs.length - 1].id : null,
      hasMore,
      totalCount,
      verifiedCount,
      unverifiedCount: totalCount - verifiedCount,
      eventName,
    })
  } catch (e) {
    console.error("[GET admin attendees] paginated fetch failed", e)
    return fail("Failed to load attendees", 500)
  }
}

/**
 * POST /api/v1/event-data/attendees
 * Body: { eventId, fullName, email, phone, ticketType, quantity, referralCode }
 *
 * "Add attendee" — manually issues ticket(s) for a walk-in / offline /
 * comped attendee. Writes a Reference doc pre-marked "successful" (no
 * Paystack involved, since no online payment happened) and hands it
 * straight to spotix-backend's POST /v1/ticket, which is the exact same
 * generateTickets() pipeline every real Paystack purchase goes through
 * (see spotix-backend/v1/lib/ticket/index.js) — so the ticket(s), the
 * attendees/ doc, referral usage, and the organizer's daily sales
 * aggregate all come out identical to a normal sale, just admin-issued
 * instead of Paystack-verified.
 *
 * Ticket price is read straight off the event's own canonical
 * ticketPrices (never trusted from the client) — same source of truth
 * create-pay-ref uses for real purchases (spotix-user). No platform fee
 * is applied here (transactionFee/paystackFee are frozen at 0) since no
 * processing actually happened — the full canonical price rolls into the
 * organizer's bookerNetAmount for this sale.
 *
 * Access: admin only, same as the GET above.
 */
const MAX_ADD_QTY = 20
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const REF_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

/** Mints a reference in the exact SPTX-REF-{timestamp}-{2 letters} shape
 *  spotix-backend's isValidTicketReference() requires — mirrors
 *  buildTicketReference() in spotix-user/src/app/lib/reference-id.ts. */
function buildAdminReference(timestamp: number): string {
  let suffix = ""
  for (let i = 0; i < 2; i++) suffix += REF_ALPHA[Math.floor(Math.random() * REF_ALPHA.length)]
  return `SPTX-REF-${timestamp}-${suffix}`
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminAccess(req, ["admin"])
  if ("error" in auth) return auth.error

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return fail("Invalid request body", 400)
  }

  const eventId = String(body.eventId ?? "").trim()
  const fullName = String(body.fullName ?? "").trim()
  const email = String(body.email ?? "").trim().toLowerCase()
  const phone = String(body.phone ?? "").trim()
  const ticketType = String(body.ticketType ?? "").trim()
  const quantity = Number(body.quantity)
  const referralCode = body.referralCode ? String(body.referralCode).replace(/\s+/g, "") : null

  if (!eventId) return fail("eventId is required", 400)
  if (!fullName) return fail("Attendee name is required", 400)
  if (!email || !EMAIL_RE.test(email)) return fail("A valid email is required", 400)
  if (!ticketType) return fail("Ticket type is required", 400)
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ADD_QTY) {
    return fail(`Quantity must be a whole number between 1 and ${MAX_ADD_QTY}`, 400)
  }

  const eventRef = adminDb.collection("events").doc(eventId)
  const eventSnap = await eventRef.get()
  if (!eventSnap.exists) return fail("Event not found", 404)
  const eventDoc = eventSnap.data()!

  if (eventDoc.suspended) return fail("This event is currently suspended", 403)

  // Canonical policy → price lookup, straight off the event doc — the
  // dropdown on the client is a convenience, never trusted for the amount.
  const canonicalPriceByPolicy = new Map<string, number>(
    (Array.isArray(eventDoc.ticketPrices) ? eventDoc.ticketPrices : []).map((t: { policy: string; price: string }) => [
      String(t.policy),
      Number(t.price) || 0,
    ])
  )
  const canonicalPrice = canonicalPriceByPolicy.get(ticketType)
  if (canonicalPrice === undefined) {
    return fail(`"${ticketType}" is not a valid ticket type for this event`, 400)
  }

  // Best-effort organizer lookup for the confirmation email's event_host /
  // booker_email fields — never blocks ticket issuance if it fails.
  let bookerName = ""
  let bookerEmail = ""
  try {
    if (eventDoc.organizerId) {
      const organizerSnap = await adminDb.collection("users").doc(eventDoc.organizerId).get()
      if (organizerSnap.exists) {
        const o = organizerSnap.data()!
        bookerName = o.fullName || ""
        bookerEmail = o.email || ""
      }
    }
  } catch (e) {
    console.error("[POST admin attendees] organizer lookup failed (non-blocking)", e)
  }

  const ticketPrice = canonicalPrice * quantity
  const timestamp = Date.now()
  const reference = buildAdminReference(timestamp)
  const nowIso = new Date().toISOString()

  const referenceDoc = {
    reference,
    userId: email, // guest-style identity, same convention as a buyer checkout
    userEmail: email,
    userFullName: fullName,
    userPhone: phone || null,
    eventId,
    eventCreatorId: eventDoc.organizerId || "",
    eventName: eventDoc.eventName || "",
    eventVenue: eventDoc.eventVenue || "",
    eventType: eventDoc.eventType || "",
    eventDate: eventDoc.eventDate || "",
    eventEndDate: eventDoc.eventEndDate || "",
    eventStart: eventDoc.eventStart || "",
    eventEnd: eventDoc.eventEnd || "",
    stopDate: eventDoc.stopDate || "",
    bookerName,
    bookerEmail,

    ticketTypes: [{ type: ticketType, quantity, price: canonicalPrice }],
    ticketType,
    ticketPrice,
    totalAmount: ticketPrice,
    transactionFee: 0,
    appliedFeeRates: { percentageFee: 0, flatFee: 0 },
    feeBurden: { coversPaystackFee: false, coversSpotixFee: false, paystackFeeAbsorbedBy: "organizer" as const },
    buyerBearsBurden: true,
    paystackFee: 0,
    paystackFeeChargedToBuyer: false,
    organizerPaystackFeeCost: 0,
    appliedAddons: [],
    addonFeeTotal: 0,
    organizerAddonCostTotal: 0,
    totalTicketCount: quantity,

    vendor: "admin",
    status: "successful",
    paymentCreationDate: nowIso,
    paymentCreationTimestamp: timestamp,

    discountCode: null,
    discountData: null,
    discountAmount: 0,
    referralCode,
    referralName: referralCode,

    surveyResponses: null,

    addedByAdmin: { adminUid: auth.uid, adminUsername: auth.username },
    source: "admin-manual",

    createdAt: nowIso,
    updatedAt: nowIso,
  }

  try {
    await adminDb.collection("Reference").doc(reference).set(referenceDoc)
  } catch (e) {
    console.error("[POST admin attendees] failed to write Reference doc", e)
    return fail("Failed to create payment reference", 500)
  }

  const BACKEND_URL = process.env.BACKEND_URL
  if (!BACKEND_URL) {
    return fail(
      `Reference ${reference} was created but BACKEND_URL is not configured, so tickets were not generated. ` +
        `Once it's set, POST { reference: "${reference}" } to /v1/ticket to finish issuing.`,
      500
    )
  }

  try {
    const res = await fetch(`${BACKEND_URL}/v1/ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ reference }),
    })
    const data = await res.json().catch(() => ({}))

    if (!res.ok || !data.success) {
      return fail(
        (data.message as string) ||
          `Reference ${reference} was created but ticket generation failed — retry by POSTing it to /v1/ticket.`,
        res.status || 500
      )
    }

    return ok(
      {
        message: data.message,
        reference,
        ticketIds: data.ticketIds ?? [],
        totalTickets: data.totalTickets ?? quantity,
        eventName: data.eventName ?? eventDoc.eventName ?? "",
      },
      201
    )
  } catch (e) {
    console.error("[POST admin attendees] ticket generation call failed", e)
    return fail(
      `Reference ${reference} was created but the ticket-generation request failed — retry by POSTing it to /v1/ticket.`,
      502
    )
  }
}
