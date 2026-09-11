/**
 * app/api/v1/admin/requisitions/approve/route.ts
 *
 * POST { requisitionId } — records the CALLING admin's approval.
 *
 * Once every required approver (every full "admin" other than the
 * requester themselves, see lib/admin-roster.ts) has signed off, the
 * requisition moves to "approved" and the withdrawable payout row is
 * created immediately — see lib/requisitions-db.ts's finalizeRequisition.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { finalizeRequisition, getRequisition, recordRequisitionApproval, updateRequisitionStatus } from "@/lib/requisitions-db"

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

  const { requisitionId } = body
  if (!requisitionId?.trim()) return fail("requisitionId is required", 400)

  const requisition = await getRequisition(requisitionId)
  if (!requisition) return fail("Requisition not found", 404)
  if (requisition.status !== "pending_approval") return fail(`This requisition is no longer pending approval (status: ${requisition.status})`, 409)

  if (requisition.requested_by_uid === admin.uid) {
    return fail("You cannot approve your own requisition", 403)
  }
  if (!requisition.required_approver_uids.includes(admin.uid)) {
    return fail("You are not a required approver on this requisition", 403)
  }
  if (requisition.approved_uids.includes(admin.uid)) {
    return fail("You have already approved this requisition", 409)
  }

  await recordRequisitionApproval({ requisition_id: requisition.id, admin_uid: admin.uid, admin_name: admin.username })
  const approvedUids = [...requisition.approved_uids, admin.uid]
  const outstanding = requisition.required_approver_uids.filter((uid) => !approvedUids.includes(uid))

  if (outstanding.length > 0) {
    const updated = await updateRequisitionStatus(requisition.id, { approved_uids: approvedUids })
    return ok({ message: `Approval recorded. Waiting on ${outstanding.length} more admin approval(s).`, requisition: updated })
  }

  await finalizeRequisition({ ...requisition, approved_uids: approvedUids })
  const finalRow = await getRequisition(requisition.id)
  return ok({
    message: "All approvals gathered — the requester can now claim the funds from their Payments tab.",
    requisition: finalRow,
  })
}
