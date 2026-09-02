/**
 * app/api/v1/admin/disbursements/approve/route.ts
 *
 * POST { disbursementId } — records the CALLING admin's approval.
 *
 * Once every required approver (every full "admin", see
 * lib/admin-roster.ts) has signed off, the disbursement moves to
 * "approved" and the withdrawable payout row(s) are created immediately
 * — see lib/disbursements-db.ts's finalizeDisbursement.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { finalizeDisbursement, getDisbursement, listPayoutsForDisbursementIds, recordDisbursementApproval, updateDisbursementStatus } from "@/lib/disbursements-db"

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
  if (!disbursementId?.trim()) return fail("disbursementId is required", 400)

  const disbursement = await getDisbursement(disbursementId)
  if (!disbursement) return fail("Disbursement not found", 404)
  if (disbursement.status !== "pending_approval") return fail(`This disbursement is no longer pending approval (status: ${disbursement.status})`, 409)

  if (!disbursement.required_approver_uids.includes(admin.uid)) {
    return fail("You are not a required approver on this disbursement", 403)
  }
  if (disbursement.approved_uids.includes(admin.uid)) {
    return fail("You have already approved this disbursement", 409)
  }

  await recordDisbursementApproval({ disbursement_id: disbursement.id, admin_uid: admin.uid, admin_name: admin.username, method: "manual" })
  const approvedUids = [...disbursement.approved_uids, admin.uid]
  const outstanding = disbursement.required_approver_uids.filter((uid) => !approvedUids.includes(uid))

  if (outstanding.length > 0) {
    const updated = await updateDisbursementStatus(disbursement.id, { approved_uids: approvedUids })
    return ok({ message: `Approval recorded. Waiting on ${outstanding.length} more admin approval(s).`, disbursement: updated })
  }

  await finalizeDisbursement({ ...disbursement, approved_uids: approvedUids })
  const finalRow = await getDisbursement(disbursement.id)
  const payoutsByDisbursement = finalRow ? await listPayoutsForDisbursementIds([finalRow.id]) : {}
  return ok({
    message: "All approvals gathered — payout(s) are now available for withdrawal.",
    disbursement: finalRow ? { ...finalRow, payouts: payoutsByDisbursement[finalRow.id] ?? [] } : finalRow,
  })
}
