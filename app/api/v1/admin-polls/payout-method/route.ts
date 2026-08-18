/**
 * app/api/v1/admin-polls/payout-method/route.ts
 * GET ?pollId=...
 *
 * See event-data/payout-method/route.ts for the full rationale — same
 * rule here: admins can never set a payout method, only use the one on
 * file when the poll creator has exactly one.
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
    const pollId = searchParams.get("pollId")?.trim()
    if (!pollId) return NextResponse.json({ error: "pollId is required", developer: DEV_TAG }, { status: 400 })

    const pollSnap = await adminDb.collection("voting").doc(pollId).get()
    if (!pollSnap.exists) return NextResponse.json({ error: "Poll not found", developer: DEV_TAG }, { status: 404 })
    const ownerId = pollSnap.data()?.creatorId ?? pollSnap.data()?.organizerId
    if (!ownerId) return NextResponse.json({ error: "Poll has no creator on file", developer: DEV_TAG }, { status: 404 })

    const { methods, usable } = await getSinglePayoutMethod(ownerId)
    return NextResponse.json({ success: true, ownerId, methods, usable, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/admin-polls/payout-method error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
