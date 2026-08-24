/**
 * app/api/v1/admin/transfer/route.ts
 *
 * GET  ?id=xxx           → single transfer detail
 * POST                    → create a new Transfer request
 *   Body: {
 *     bankName, bankCode, accountNumber, accountName,
 *     reason, amount,
 *     ottaKey?   // optional — if supplied, stands in for one other
 *                // admin's approval at request time (see lib/otta.ts)
 *   }
 *
 * Every full "admin" is required to approve a transfer before it's
 * allowed to reach Paystack — see lib/admin-roster.ts. The requester is
 * auto-approved as the initiator. If the requester supplies a valid OTTA
 * key, the key's owner is also auto-approved on their behalf. If that
 * closes out every required approver immediately, the transfer executes
 * right here; otherwise it's created as "pending_approval" and shows up
 * in the outstanding approvers' Pending Approvals list (see
 * app/api/v1/admin/transfer/pending and .../approve).
 *
 * Access: full "admin" only — this whole feature is the new admin-only
 * "Transfers" menu.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { quoteTransferFee, resolveAccount } from "@/lib/paystack-admin"
import { listAdminApprovers } from "@/lib/admin-roster"
import { createTransfer, generateTransferReference, getTransfer, recordApproval, updateTransferStatus } from "@/lib/transfers-db"
import { executeApprovedTransfer } from "@/lib/transfers-execute"
import { verifyOttaKey } from "@/lib/otta"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const id = new URL(request.url).searchParams.get("id")?.trim()
  if (!id) return fail("id is required", 400)

  const transfer = await getTransfer(id)
  if (!transfer) return fail("Transfer not found", 404)

  return ok({ transfer })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { bankName, bankCode, accountNumber, reason, ottaKey } = body
  const amount = Number(body.amount)

  if (!bankName?.trim()) return fail("bankName is required", 400)
  if (!bankCode?.trim()) return fail("bankCode is required", 400)
  if (!accountNumber?.trim() || String(accountNumber).length !== 10) return fail("accountNumber must be 10 digits", 400)
  if (!reason?.trim()) return fail("reason is required", 400)
  if (!Number.isFinite(amount) || amount <= 0) return fail("amount must be a positive number", 400)

  // Resolve the account name from Paystack rather than trusting client input.
  let accountName: string
  try {
    const resolved = await resolveAccount(accountNumber, bankCode)
    accountName = resolved.accountName
  } catch {
    return fail("Could not verify this bank account. Please check the details.", 400)
  }

  const fee = await quoteTransferFee(amount)
  const amountAfterFee = fee.amountAfterFee
  if (amountAfterFee <= 0) return fail("Amount is too small to cover the transfer fee", 400)

  const reference = generateTransferReference()
  const approvers = await listAdminApprovers()
  const requiredApproverUids = approvers.map((a) => a.uid)

  const transfer = await createTransfer({
    reference,
    requested_by_uid: admin.uid,
    requested_by_name: admin.username,
    bank_name: bankName,
    bank_code: bankCode,
    account_number: accountNumber,
    account_name: accountName,
    recipient_code: null,
    reason,
    amount,
    fee: fee.fee,
    amount_after_fee: amountAfterFee,
    required_approver_uids: requiredApproverUids,
    approved_uids: [],
  })

  // The requester is auto-approved as the initiator.
  await recordApproval({ transfer_id: transfer.id, admin_uid: admin.uid, admin_name: admin.username, method: "requester", otta_key_id: null })
  let approvedUids = [admin.uid]

  // Optional: an OTTA key supplied at request time stands in for one more admin's approval.
  let ottaMessage = ""
  if (ottaKey?.trim()) {
    const result = await verifyOttaKey(ottaKey, amount, { type: "transfer", id: transfer.id }, true, admin.uid)
    if (!result.ok) {
      // The transfer was already created — the OTTA just didn't apply.
      // Not fatal: fall through, the requester can still gather approvals normally.
      ottaMessage = ` OTTA key not applied: ${result.error}.`
    } else if (result.ownerUid && requiredApproverUids.includes(result.ownerUid) && result.ownerUid !== admin.uid) {
      await recordApproval({ transfer_id: transfer.id, admin_uid: result.ownerUid, admin_name: result.ownerName ?? "Admin", method: "otta", otta_key_id: result.keyId ?? null })
      approvedUids = [...approvedUids, result.ownerUid]
      ottaMessage = ` OTTA key accepted — approved on behalf of ${result.ownerName}.`
    }
  }

  const outstanding = requiredApproverUids.filter((uid) => !approvedUids.includes(uid))

  if (outstanding.length === 0) {
    await updateTransferStatus(transfer.id, { approved_uids: approvedUids, status: "approved" })
    const executed = await executeApprovedTransfer({ ...transfer, approved_uids: approvedUids, status: "approved" })
    return ok({ message: `Transfer request created and fully approved — executing now.${ottaMessage}`, transfer: executed }, 201)
  }

  const updated = await updateTransferStatus(transfer.id, { approved_uids: approvedUids })
  return ok({
    message: `Transfer request created. Waiting on ${outstanding.length} more admin approval(s).${ottaMessage}`,
    transfer: updated,
  }, 201)
}
