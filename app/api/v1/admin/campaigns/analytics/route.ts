import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// GET /api/v1/admin/campaigns/analytics?since=&until= (ISO dates)
export async function GET(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const since = request.nextUrl.searchParams.get("since")
  const until = request.nextUrl.searchParams.get("until")
  const qs = new URLSearchParams()
  if (since) qs.set("since", since)
  if (until) qs.set("until", until)

  const { res, data } = await callCampaignBackend(`/admin/campaigns/analytics?${qs.toString()}`)
  return NextResponse.json(data, { status: res.status })
}
