import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/sms-campaigns/{id} — includes a short-lived signed link to the numbers .txt
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error
  const { id } = await params
  try {
    const { res, data } = await callCampaignBackend(`/admin/sms/campaigns/${encodeURIComponent(id)}`)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load campaign" }, { status: 500 })
  }
}
