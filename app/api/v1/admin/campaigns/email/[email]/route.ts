import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin", "IT"])
  if ("error" in adminResult) return adminResult.error

  const { email } = await params
  const { res, data } = await callCampaignBackend(`/admin/campaigns/email/${encodeURIComponent(email)}`)
  return NextResponse.json(data, { status: res.status })
}
