/**
 * app/api/v1/admin-elections/[electionId]/settings/route.ts
 *
 * GET → this election's effective platform fee settings (its own
 *       override if set, otherwise the platform default), plus
 *       whether it's actually customized.
 * PUT { platformFeePercent?, platformFeeFlat?, paystackFeePayer?, resetToDefault? }
 *   Each field optional — only the ones present are updated. Pass
 *   `resetToDefault: true` to clear all three overrides back to the
 *   platform default in one call (takes priority over the other fields
 *   if both are somehow sent).
 *
 * Replaces the old flat (platform-wide) /api/v1/admin-elections/settings
 * route — fee configuration is now PER ELECTION, so every request is
 * scoped to one electionId. Deliberately a separate route/file from
 * /api/v1/support-elections/[electionId]/settings (customer-support's
 * view-only counterpart) so the two surfaces can be locked down and
 * evolve independently — same pattern as admin-polls/limits vs
 * support-polls/limits.
 *
 * Access: full "admin" only, both GET and PUT.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getElectionFeeSettings, setElectionFeeSettings, type ElectionFeeSettingsInput } from "@/lib/election-settings"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const { electionId } = await params
  try {
    const settings = await getElectionFeeSettings(electionId)
    return ok({ settings })
  } catch (err: any) {
    return fail(err.message ?? "Failed to load election fee settings", err.message === "Election not found" ? 404 : 500)
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const { electionId } = await params
  let body: ElectionFeeSettingsInput
  try {
    body = await request.json()
  } catch {
    return fail("Invalid JSON", 400)
  }

  try {
    const settings = await setElectionFeeSettings(electionId, body, admin.uid)
    return ok({ message: "Election fee settings updated", settings })
  } catch (err: any) {
    return fail(err.message ?? "Failed to save election fee settings", 400)
  }
}

export async function POST() {
  return fail("Method Not Allowed", 405)
}
export async function DELETE() {
  return fail("Method Not Allowed", 405)
}
