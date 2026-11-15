import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/v1/admin/sms-campaigns/{id}/reject  { reason }
// The reason is required — it's shown to the booker on their campaigns page
// and in the rejection email.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error
  const { id } = await params

  const { reason } = await request.json().catch(() => ({}))
  if (typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json({ success: false, error: "A reason is required to reject a campaign" }, { status: 400 })
  }
  try {
    const { res, data } = await callCampaignBackend(`/admin/sms/campaigns/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: reason.trim(), adminName: adminResult.username || adminResult.uid }),
    })
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Request failed" }, { status: 500 })
  }
}
