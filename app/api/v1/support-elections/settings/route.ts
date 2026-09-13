/**
 * app/api/v1/support-elections/settings/route.ts
 *
 * GET → the current election platform-fee settings (read-only).
 *
 * Customer-support's own read-only counterpart to
 * /api/v1/admin-elections/settings — deliberately a separate route/file
 * (not a shared one with a wider role list) so the admin and
 * customer-support surfaces can be locked down and evolve
 * independently. Configuring the platform fee is an admin-only
 * capability; customer-support can only view what's currently
 * configured (no PUT here at all).
 *
 * Access: "customer-support" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getElectionPlatformSettings } from "@/lib/election-settings"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["customer-support"])
  if ("error" in auth) return auth.error

  try {
    const settings = await getElectionPlatformSettings()
    return ok({ settings })
  } catch (err: any) {
    return fail(err.message ?? "Failed to load election settings", 500)
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
