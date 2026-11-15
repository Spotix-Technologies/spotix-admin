import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"
import { adminDb } from "@/lib/firebase-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/campaigns/event/{eventId} — admin + IT can both look
// up campaigns for an event (spec §38); only admin can retry/adjust.
//
// The campaign backend has no notion of whether an eventId is real — it
// just filters campaigns by event_id, so a typo'd/nonexistent eventId
// silently comes back as an empty list indistinguishable from "this real
// event just has no campaigns yet". Look the event up in Firestore here
// (already available to this app) so the frontend can tell those two
// cases apart and hide the credit-grant form for the former.
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const { eventId } = await params
  const [eventDoc, backendResult] = await Promise.all([
    adminDb.collection("events").doc(eventId).get(),
    callCampaignBackend(`/admin/campaigns/event/${encodeURIComponent(eventId)}`),
  ])

  if (!eventDoc.exists) {
    return NextResponse.json({ success: false, eventExists: false, error: "Event not found" }, { status: 404 })
  }

  const { res, data } = backendResult
  return NextResponse.json({ ...data, eventExists: true, eventName: eventDoc.data()?.eventName || null }, { status: res.status })
}
