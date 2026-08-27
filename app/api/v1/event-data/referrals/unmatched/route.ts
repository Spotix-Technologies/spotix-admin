/**
 * app/api/v1/event-data/referrals/unmatched/route.ts
 *
 * GET ?eventId=xxx → { attendees: [{ id, fullName, ticketType, purchaseDate }] }
 *
 * Lists attendees for an event whose ticket carries no referralCode /
 * referralName — i.e. tickets that weren't attributed to a referral at
 * purchase time (see spotix-backend's v1/lib/ticket/write-tickets.js,
 * which stamps referralCode/referralName on both tickets/{ticketId} and
 * events/{eventId}/attendees/{ticketId} at checkout). These are the
 * candidates for a manual match via /api/v1/event-data/referrals/match.
 * Feeds the "Match Transaction" picker in referrals-tab.tsx.
 *
 * Access: admin, customer-support — same role list as the match route
 * itself (see that file for why exec-assistant is excluded).
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status })
}

function tsToDateString(ts: FirebaseFirestore.Timestamp | string | null | undefined): string {
  if (!ts) return "Unknown"
  if (typeof ts === "string") return ts
  try {
    return ts.toDate().toLocaleDateString()
  } catch {
    return "Unknown"
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const eventId = new URL(request.url).searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  const eventRef = adminDb.collection("events").doc(eventId)
  const eventSnap = await eventRef.get()
  if (!eventSnap.exists) return fail("Event not found", 404)

  const attendeesSnap = await eventRef.collection("attendees").get()

  const attendees = attendeesSnap.docs
    .filter((d) => {
      const a = d.data()
      return !a.referralCode && !a.referralName
    })
    .map((d) => {
      const a = d.data()
      return {
        id: d.id,
        fullName: a.fullName ?? "Unknown",
        ticketType: a.ticketType ?? "Standard",
        purchaseDate: tsToDateString(a.purchaseDate),
      }
    })

  return ok({ attendees })
}
