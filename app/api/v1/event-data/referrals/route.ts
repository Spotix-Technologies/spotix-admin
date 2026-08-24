/**
 * app/api/v1/event-data/referrals/route.ts
 *
 * GET ?eventId=xxx → { referrals: [{ code, totalTickets, usages }] }
 *
 * Read-only mirror of spotix-booker's
 * app/api/event/list/[eventId]/referrals GET — same Firestore shape
 * (events/{eventId}/referrals/{code}/usages/{ticketId}), just fetched
 * with the Spotix Admin session instead of a booker JWT so Event Data can
 * show it without needing booker access.
 *
 * Access: any admin role (admin, customer-support, exec-assistant) — this
 * is view-only data, same pattern as /api/v1/event-data/transactions.
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

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  const eventId = new URL(request.url).searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  const eventRef = adminDb.collection("events").doc(eventId)
  const referralsSnap = await eventRef.collection("referrals").get()

  const referrals = await Promise.all(
    referralsSnap.docs.map(async (d) => {
      const data = d.data()
      const usagesSnap = await d.ref.collection("usages").orderBy("purchaseDate", "desc").get().catch(
        () => d.ref.collection("usages").get()
      )
      const usages = usagesSnap.docs.map((u) => {
        const ud = u.data()
        return {
          name: ud.name ?? "Unknown",
          ticketType: ud.ticketType ?? "Standard",
          purchaseDate: ud.purchaseDate ?? null,
        }
      })
      return {
        code: d.id,
        usages,
        totalTickets: data.totalTickets ?? usages.length,
      }
    })
  )

  return ok({ referrals })
}
