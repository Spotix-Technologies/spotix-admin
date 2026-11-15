import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/v1/admin/campaigns/{id}/retry — admin-only (spec §1: IT
// dashboard is for *observing* the campaign process, not acting on it).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const { id } = await params
  const { res, data } = await callCampaignBackend(`/admin/campaigns/${encodeURIComponent(id)}/retry`, {
    method: "POST",
    body: JSON.stringify({ createdBy: adminResult.username || adminResult.uid }),
  })
  return NextResponse.json(data, { status: res.status })
}
