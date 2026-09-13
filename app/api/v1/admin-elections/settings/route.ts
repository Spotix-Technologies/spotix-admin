/**
 * app/api/v1/admin-elections/settings/route.ts
 *
 * GET → the current election platform-fee settings (percent, flat
 *       amount, and who bears Paystack's own fee).
 * PUT { platformFeePercent?, platformFeeFlat?, paystackFeePayer? }
 *   Each field is optional — only the ones present are updated, the
 *   rest keep their current value.
 *
 * This is the ADMIN dashboard's own route for configuring the
 * platform-wide election fee settings (see spotix-vote's
 * lib/election/fees.ts for how the vote app consumes this). Deliberately
 * a separate route/file from /api/v1/support-elections/settings
 * (customer-support's view-only counterpart) rather than one shared
 * route with a role list, so the two surfaces can be locked down and
 * evolve independently — same pattern as admin-polls/limits vs
 * support-polls/limits.
 *
 * Access: full "admin" only, both GET and PUT — configuring the
 * platform fee is an admin-only capability per product decision;
 * customer-support gets a read-only view via its own route instead.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getElectionPlatformSettings, setElectionPlatformSettings, type ElectionPlatformSettingsInput } from "@/lib/election-settings"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  try {
    const settings = await getElectionPlatformSettings()
    return ok({ settings })
  } catch (err: any) {
    return fail(err.message ?? "Failed to load election settings", 500)
  }
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: ElectionPlatformSettingsInput
  try {
    body = await request.json()
  } catch {
    return fail("Invalid JSON", 400)
  }

  try {
    const settings = await setElectionPlatformSettings(body, admin.uid)
    return ok({ message: "Election platform settings updated", settings })
  } catch (err: any) {
    return fail(err.message ?? "Failed to save election settings", 400)
  }
}

export async function POST() {
  return fail("Method Not Allowed", 405)
}
export async function DELETE() {
  return fail("Method Not Allowed", 405)
}
