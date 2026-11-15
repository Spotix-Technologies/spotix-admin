import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/v1/admin/events/{eventId}/email-credits  { organizerId, amount, reason }
// spec §42 — every adjustment must carry a reason; there's no bare
// "set balance to X" here, only signed deltas that ledger themselves.
export async function POST(request: NextRequest, { params }: { params: Promise<{ eventId: string }> }) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const { eventId } = await params
  const body = await request.json().catch(() => ({}))
  const { organizerId, amount, reason } = body || {}
  if (!organizerId || !amount || !reason) {
    return NextResponse.json({ success: false, error: "organizerId, amount, and reason are required" }, { status: 400 })
  }

  const { res, data } = await callCampaignBackend(`/admin/events/${encodeURIComponent(eventId)}/email-credits`, {
    method: "POST",
    body: JSON.stringify({ organizerId, amount, reason, createdBy: adminResult.username || adminResult.uid }),
  })
  return NextResponse.json(data, { status: res.status })
}
