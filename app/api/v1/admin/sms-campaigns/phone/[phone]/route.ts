import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/sms-campaigns/phone/{phone} — the SMS twin of the email
// lookup: the 15 most recent bulk SMS campaigns this number was part of.
export async function GET(request: NextRequest, { params }: { params: Promise<{ phone: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const { phone } = await params
  try {
    const { res, data } = await callCampaignBackend(`/admin/sms/phone/${encodeURIComponent(phone)}`)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to look up that number" }, { status: 500 })
  }
}
