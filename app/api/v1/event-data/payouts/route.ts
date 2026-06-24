/**
 * app/api/v1/event-data/payouts/route.ts
 * GET ?eventId=...
 * Returns all payout documents in the `payouts` collection where eventId matches.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")?.trim()

    if (!eventId) {
      return NextResponse.json({ error: "eventId is required", developer: DEV_TAG }, { status: 400 })
    }

    const snap = await adminDb
      .collection("payouts")
      .where("eventId", "==", eventId)
      .get()

    const payouts = snap.docs.map((doc) => {
      const d = doc.data()
      return {
        payoutId: doc.id,
        amount: d.amount ?? 0,
        status: d.status ?? "pending",
      }
    })

    return NextResponse.json({ success: true, payouts, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/event-data/payouts error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
