/**
 * app/api/v1/event-data/referrals/match/route.ts
 *
 * POST { eventId, ticketId, referralCode, reason }
 *   → Manually attributes an existing ticket/attendee to a referral code,
 *     for tickets that were bought without going through the referral
 *     capture at checkout (see spotix-backend's v1/lib/ticket/referral.js,
 *     which does the same writes automatically when a referral code IS
 *     present at purchase — this route is the manual-correction path for
 *     when it wasn't).
 *
 *   Writes, atomically (single batch):
 *     - events/{eventId}/referrals/{code}/usages/{ticketId}   (new doc —
 *       same shape referral.js writes: name, ticketType, ticketId,
 *       purchaseDate)
 *     - events/{eventId}/referrals/{code}.totalTickets          (+1)
 *     - events/{eventId}/referrals/{code}.matchAudit             (arrayUnion —
 *       who matched it, which ticket, and why; this changes numbers that
 *       affiliate/agent commission math reads, so it's audited the same
 *       way flag/suspend/toggleQueue are on the main event-data route)
 *     - events/{eventId}/attendees/{ticketId}.referralCode       (set)
 *     - tickets/{ticketId}.referralCode                          (set, if
 *       that root ticket doc exists — kept in sync since other surfaces,
 *       e.g. user ticket lookups, read from tickets/ rather than the
 *       per-event attendees/ mirror)
 *
 *   purchaseDate on the usage doc is carried over from the attendee's
 *   original purchase, not "now" — so referral reporting still reflects
 *   when the ticket was actually bought, not when it was corrected.
 *
 * Guards against: referral code not existing for this event, ticket/
 * attendee not existing, and double-matching (the attendee already has a
 * referralCode/referralName, or a usages/{ticketId} doc already exists
 * under the target code).
 *
 * Access: admin, customer-support. Not exec-assistant — this changes
 * referral totals that commission/payout numbers are read from, same
 * write-sensitivity tier as agent-verification's verify/reject actions.
 */

import { type NextRequest, NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const body = await request.json().catch(() => null)
  const eventId = (body?.eventId ?? "").trim()
  const ticketId = (body?.ticketId ?? "").trim()
  const referralCode = (body?.referralCode ?? "").trim()
  const reason = (body?.reason ?? "").trim()

  if (!eventId || !ticketId || !referralCode) {
    return fail("eventId, ticketId and referralCode are required", 400)
  }
  if (!reason) {
    return fail("A reason is required for this action", 400)
  }

  const eventRef = adminDb.collection("events").doc(eventId)
  const attendeeRef = eventRef.collection("attendees").doc(ticketId)
  const referralRef = eventRef.collection("referrals").doc(referralCode)
  const usageRef = referralRef.collection("usages").doc(ticketId)
  const ticketRef = adminDb.collection("tickets").doc(ticketId)

  const [attendeeSnap, referralSnap, usageSnap, ticketSnap] = await Promise.all([
    attendeeRef.get(),
    referralRef.get(),
    usageRef.get(),
    ticketRef.get(),
  ])

  if (!attendeeSnap.exists) return fail("Attendee/ticket not found for this event", 404)
  if (!referralSnap.exists) return fail(`Referral code "${referralCode}" does not exist for this event`, 404)
  if (usageSnap.exists) return fail("This ticket is already matched to that referral code", 409)

  const attendee = attendeeSnap.data()!
  if (attendee.referralCode || attendee.referralName) {
    return fail("This ticket already has a referral attributed to it", 409)
  }

  const nowIso = new Date().toISOString()
  const auditEntry = {
    adminUid: admin.uid,
    adminUsername: admin.username,
    ticketId,
    referralCode,
    reason,
    timestamp: nowIso,
  }

  const batch = adminDb.batch()

  batch.set(usageRef, {
    name: attendee.fullName ?? "Unknown",
    ticketType: attendee.ticketType ?? "Standard",
    ticketId,
    purchaseDate: attendee.purchaseDate ?? nowIso,
  })

  batch.update(referralRef, {
    totalTickets: FieldValue.increment(1),
    matchAudit: FieldValue.arrayUnion(auditEntry),
  })

  batch.update(attendeeRef, { referralCode })

  if (ticketSnap.exists) {
    batch.update(ticketRef, { referralCode })
  }

  await batch.commit()

  return ok({ message: `Ticket matched to referral "${referralCode}"` })
}
