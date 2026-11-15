import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/campaigns/purchases/{eventId} — every credit
// purchase made against this event, any organizer.
export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const { eventId } = await params
  const { res, data } = await callCampaignBackend(`/admin/campaigns/purchases/${encodeURIComponent(eventId)}`)
  return NextResponse.json(data, { status: res.status })
}
