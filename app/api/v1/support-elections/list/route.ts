/**
 * app/api/v1/support-elections/list/route.ts
 *
 * GET → same election lookup list as /api/v1/admin-elections/list, kept
 * as its own route/file (rather than widening that route's role check)
 * so the two dashboards' access can evolve independently — same
 * reasoning as admin-polls vs support-polls.
 *
 * Access: "customer-support" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listElectionsForAdmin } from "@/lib/election-settings"

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
    const elections = await listElectionsForAdmin()
    return ok({ elections })
  } catch (err: any) {
    return fail(err.message ?? "Failed to load elections", 500)
  }
}

export async function POST() {
  return fail("Method Not Allowed", 405)
}
export async function PUT() {
  return fail("Method Not Allowed", 405)
}
export async function DELETE() {
  return fail("Method Not Allowed", 405)
}
