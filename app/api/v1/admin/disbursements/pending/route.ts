/**
 * app/api/v1/admin/disbursements/pending/route.ts
 *
 * GET → disbursements currently awaiting THIS admin's approval.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listPendingDisbursementApprovalsFor } from "@/lib/disbursements-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const disbursements = await listPendingDisbursementApprovalsFor(admin.uid)
  return ok({ disbursements })
}
