/**
 * app/api/v1/event-data/transactions/route.ts
 * GET ?eventId=...
 *
 * Every per-day transaction record for this event (admin/events/{eventId}
 * in Firestore) — mirrors the booker's own GET /api/payout?action=list,
 * but visible to any registered admin role and not scoped to the
 * organizer's own session.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listEventTransactions } from "@/lib/payout-firestore-admin"

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

    const transactions = await listEventTransactions(eventId)
    return NextResponse.json({ success: true, transactions, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/event-data/transactions error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
