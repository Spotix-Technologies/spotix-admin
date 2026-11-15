import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/v1/admin/sms-campaigns/{id}/deliver — admin only.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error
  const { id } = await params
  try {
    const { res, data } = await callCampaignBackend(`/admin/sms/campaigns/${encodeURIComponent(id)}/deliver`, {
      method: "POST",
      body: JSON.stringify({ adminName: adminResult.username || adminResult.uid }),
    })
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Request failed" }, { status: 500 })
  }
}
