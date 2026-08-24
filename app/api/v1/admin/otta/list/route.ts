/**
 * app/api/v1/admin/otta/list/route.ts
 *
 * GET → the calling admin's own OTTA keys (never the plain key itself,
 * only status/metadata — see lib/otta.ts listMyOttaKeys).
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listMyOttaKeys } from "@/lib/otta"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const keys = await listMyOttaKeys(admin.uid)
  return ok({ keys })
}
