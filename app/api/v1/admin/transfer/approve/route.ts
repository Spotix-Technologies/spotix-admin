/**
 * app/api/v1/admin/transfer/approve/route.ts
 *
 * POST { transferId, ottaKey? }
 *   Without ottaKey: records the CALLING admin's own manual approval.
 *   With ottaKey: the key's owner is recorded as approving instead of
 *     (or in addition to, if the caller is also a required approver and
 *     hasn't approved yet) the calling admin — see lib/otta.ts.
 *
 * Once every required approver has signed off, the transfer moves to
 * "approved" and is executed immediately (Paystack transfer fired) — see
 * lib/transfers-execute.ts.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getTransfer, recordApproval, updateTransferStatus } from "@/lib/transfers-db"
import { executeApprovedTransfer } from "@/lib/transfers-execute"
import { verifyOttaKey } from "@/lib/otta"

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

  const { transferId, ottaKey } = body
  if (!transferId?.trim()) return fail("transferId is required", 400)

  const transfer = await getTransfer(transferId)
  if (!transfer) return fail("Transfer not found", 404)
  if (transfer.status !== "pending_approval") return fail(`This transfer is no longer pending approval (status: ${transfer.status})`, 409)

  let approverUid = admin.uid
  let approverName = admin.username
  let method: "manual" | "otta" = "manual"
  let ottaKeyId: string | null = null

  if (ottaKey?.trim()) {
    const result = await verifyOttaKey(ottaKey, transfer.amount, { type: "transfer", id: transfer.id }, true, admin.uid)
    if (!result.ok) return fail(result.error ?? "Invalid OTTA key", 400)
    approverUid = result.ownerUid!
    approverName = result.ownerName ?? "Admin"
    method = "otta"
    ottaKeyId = result.keyId ?? null
  }

  if (!transfer.required_approver_uids.includes(approverUid)) {
    return fail("This admin is not a required approver on this transfer", 403)
  }
  if (transfer.approved_uids.includes(approverUid)) {
    return fail(`${approverName} has already approved this transfer`, 409)
  }

  await recordApproval({ transfer_id: transfer.id, admin_uid: approverUid, admin_name: approverName, method, otta_key_id: ottaKeyId })
  const approvedUids = [...transfer.approved_uids, approverUid]
  const outstanding = transfer.required_approver_uids.filter((uid) => !approvedUids.includes(uid))

  if (outstanding.length > 0) {
    const updated = await updateTransferStatus(transfer.id, { approved_uids: approvedUids })
    return ok({ message: `Approval recorded. Waiting on ${outstanding.length} more admin approval(s).`, transfer: updated })
  }

  await updateTransferStatus(transfer.id, { approved_uids: approvedUids, status: "approved" })
  const executed = await executeApprovedTransfer({ ...transfer, approved_uids: approvedUids, status: "approved" })
  return ok({ message: "All approvals gathered — transfer executing now.", transfer: executed })
}
