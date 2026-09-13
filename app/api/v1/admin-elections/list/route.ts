/**
 * app/api/v1/admin-elections/list/route.ts
 *
 * GET → the most recent elections across the platform (name, status,
 *       organizer, voting window, Allow Voters Pre-fill flag), for the
 *       Election Management page's lookup list. Read-only — election
 *       creation/editing itself stays in spotix-booker; this is just
 *       enough context for admin/support to see what's out there.
 *
 * Access: any registered admin role (matches the Votes page's own
 * access level — see app/admin-dashboard/votes/page.tsx).
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
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

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
