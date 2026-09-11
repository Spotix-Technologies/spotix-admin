/**
 * app/api/v1/admin/disbursements/reject/route.ts
 *
 * POST { disbursementId, reason }
 *
 * Rejects a disbursement that's still pending approval. A reason is
 * required and is shown to every admin (see DisbursementListPanel +
 * PendingDisbursementApprovalsPanel). Unlike approval — which needs
 * every required approver to sign off — a single required approver's
 * rejection is enough to stop it; no further approvals can be recorded
 * once status is "rejected".
 *
 * Access: full "admin" only, and only a required approver on this
 * disbursement.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getDisbursement, rejectDisbursement } from "@/lib/disbursements-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { disbursementId } = body
  const reason: string = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!disbursementId?.trim()) return fail("disbursementId is required", 400)
  if (!reason) return fail("A rejection reason is required", 400)

  const disbursement = await getDisbursement(disbursementId)
  if (!disbursement) return fail("Disbursement not found", 404)
  if (disbursement.status !== "pending_approval") return fail(`This disbursement is no longer pending approval (status: ${disbursement.status})`, 409)

  if (!disbursement.required_approver_uids.includes(admin.uid)) {
    return fail("You are not a required approver on this disbursement", 403)
  }

  const rejected = await rejectDisbursement(disbursement.id, reason, { uid: admin.uid, name: admin.username })
  return ok({ message: "Disbursement rejected.", disbursement: rejected })
}
