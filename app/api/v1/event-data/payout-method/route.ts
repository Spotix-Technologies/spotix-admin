/**
 * app/api/v1/event-data/payout-method/route.ts
 * GET ?eventId=...
 *
 * Looks up the event owner's (organizerId's) payout method(s). Admins
 * can NEVER set a payout method — this is read-only, and the
 * admin-payout flow is only enabled client-side when `usable` is
 * non-null, i.e. the owner has EXACTLY one method on file.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getSinglePayoutMethod } from "@/lib/payout-firestore-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")?.trim()
    if (!eventId) return NextResponse.json({ error: "eventId is required", developer: DEV_TAG }, { status: 400 })

    const eventSnap = await adminDb.collection("events").doc(eventId).get()
    if (!eventSnap.exists) return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
    const organizerId = eventSnap.data()?.organizerId
    if (!organizerId) return NextResponse.json({ error: "Event has no organizer on file", developer: DEV_TAG }, { status: 404 })

    const { methods, usable } = await getSinglePayoutMethod(organizerId)
    return NextResponse.json({ success: true, organizerId, methods, usable, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/event-data/payout-method error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
