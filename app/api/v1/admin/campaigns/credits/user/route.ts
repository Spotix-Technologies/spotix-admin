import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/campaigns/credits/user?email=
// Finds a booker by email and returns who they are plus their email + SMS
// credit balances. Read-only: looking someone up never changes a balance.
export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const email = request.nextUrl.searchParams.get("email")?.trim()
  if (!email) return NextResponse.json({ success: false, error: "email is required" }, { status: 400 })

  try {
    const { res, data } = await callCampaignBackend(`/admin/credits/user?email=${encodeURIComponent(email)}`)
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load credits" }, { status: 500 })
  }
}
