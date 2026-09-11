/**
 * app/api/v1/admin/requisitions/pending/route.ts
 *
 * GET → requisitions currently awaiting THIS admin's approval. Surfaced
 * on the admin Disbursements page's Requisitions tab (see
 * app/admin-dashboard/disbursements/components/RequisitionApprovalsPanel.tsx).
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listPendingRequisitionApprovalsFor } from "@/lib/requisitions-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const requisitions = await listPendingRequisitionApprovalsFor(admin.uid)
  return ok({ requisitions })
}
