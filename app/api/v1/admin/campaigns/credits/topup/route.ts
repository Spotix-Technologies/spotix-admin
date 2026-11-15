import { NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { callCampaignBackend } from "@/lib/campaign-backend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// POST /api/v1/admin/campaigns/credits/topup  { email, kind: "email"|"sms", amount, reason }
// Admin only. The booker is identified by EMAIL (not event or user id); the
// backend resolves the account. Every adjustment must carry a reason and is
// ledgered as a "manual" transaction in the admin's name — there's no bare
// "set balance to X", only signed deltas (negative = correction).
export async function POST(request: NextRequest) {
  const adminResult = await verifyAdminAccess(request, ["admin"])
  if ("error" in adminResult) return adminResult.error

  const body = await request.json().catch(() => ({}))
  const { email, kind, amount, reason } = body || {}
  if (!email || !kind || !amount || !reason) {
    return NextResponse.json({ success: false, error: "email, kind, amount and reason are required" }, { status: 400 })
  }

  try {
    const { res, data } = await callCampaignBackend("/admin/credits/topup", {
      method: "POST",
      body: JSON.stringify({ email, kind, amount, reason, createdBy: adminResult.username || adminResult.uid }),
    })
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ success: false, error: "Failed to adjust credits" }, { status: 500 })
  }
}
