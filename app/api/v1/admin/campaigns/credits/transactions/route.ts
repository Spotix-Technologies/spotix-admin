import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/campaigns/credits/transactions?email=&kind=all|email|sms
// The 15 most recent credit movements (email + SMS) for that booker.
export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const email = request.nextUrl.searchParams.get("email")?.trim()
  const kind = request.nextUrl.searchParams.get("kind") || "all"
  if (!email) return NextResponse.json({ success: false, error: "email is required" }, { status: 400 })

  try {
    const { res, data } = await callCampaignBackend(
      `/admin/credits/transactions?email=${encodeURIComponent(email)}&kind=${encodeURIComponent(kind)}`
    )
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load transactions" }, { status: 500 })
  }
}
