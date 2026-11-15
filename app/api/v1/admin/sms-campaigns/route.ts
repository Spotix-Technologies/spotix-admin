import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/sms-campaigns?status=created|approved|rejected|delivered
export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const status = request.nextUrl.searchParams.get("status")
  const qs = status ? `?status=${encodeURIComponent(status)}` : ""
  try {
    const { res, data } = await callCampaignBackend(`/admin/sms/campaigns${qs}`)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load bulk SMS campaigns" }, { status: 500 })
  }
}
