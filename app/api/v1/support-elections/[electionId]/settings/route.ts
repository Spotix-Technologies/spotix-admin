/**
 * app/api/v1/support-elections/[electionId]/settings/route.ts
 *
 * GET → this election's effective platform fee settings (read-only).
 *
 * Customer-support's own read-only counterpart to
 * /api/v1/admin-elections/[electionId]/settings — deliberately a
 * separate route/file (not a shared one with a wider role list) so the
 * admin and customer-support surfaces can be locked down and evolve
 * independently. Configuring a per-election fee override is an
 * admin-only capability; customer-support can only view what's
 * currently in effect for a given election (no PUT here at all).
 *
 * Access: "customer-support" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getElectionFeeSettings } from "@/lib/election-settings"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  const auth = await verifyAdminAccess(request, ["customer-support"])
  if ("error" in auth) return auth.error

  const { electionId } = await params
  try {
    const settings = await getElectionFeeSettings(electionId)
    return ok({ settings })
  } catch (err: any) {
    return fail(err.message ?? "Failed to load election fee settings", err.message === "Election not found" ? 404 : 500)
  }
}

export async function PUT() {
  return fail("Method Not Allowed — platform fee settings are admin-only, view only here", 403)
}
export async function POST() {
  return fail("Method Not Allowed", 405)
}
export async function DELETE() {
  return fail("Method Not Allowed", 405)
}
