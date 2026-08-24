/**
 * app/api/v1/admin/transfer/pending/route.ts
 *
 * GET → transfers currently awaiting THIS admin's approval.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listPendingApprovalsFor } from "@/lib/transfers-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const transfers = await listPendingApprovalsFor(admin.uid)
  return ok({ transfers })
}
