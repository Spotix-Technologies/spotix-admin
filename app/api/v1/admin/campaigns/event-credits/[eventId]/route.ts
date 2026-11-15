import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const { eventId } = await params
  const organizerId = request.nextUrl.searchParams.get("organizerId")
  if (!organizerId) return NextResponse.json({ success: false, error: "organizerId is required" }, { status: 400 })

  const { res, data } = await callCampaignBackend(
    `/admin/campaigns/event-credits/${encodeURIComponent(eventId)}?organizerId=${encodeURIComponent(organizerId)}`
  )
  return NextResponse.json(data, { status: res.status })
}
