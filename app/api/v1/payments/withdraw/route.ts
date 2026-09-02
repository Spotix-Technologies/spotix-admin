/**
 * app/api/v1/payments/withdraw/route.ts
 *
 * POST { paymentId }
 *
 * Withdraws a disbursement-sourced `payouts` row the calling admin is
 * eligible for:
 *   - type "member": only the addressed uid may withdraw.
 *   - type "department": any admin whose role/secondaryRoles include
 *     the department may withdraw — first to call this wins, via an
 *     atomic conditional update (see lib/payments-db.ts's
 *     claimDisbursementPayout), so two teammates clicking at once can't
 *     double-pay.
 *
 * Uses the caller's OWN payout method on file (Firestore
 * `payoutMethods/{uid}/methods`, the same collection booker/poll payout
 * methods already live in) — their primary one if they have several.
 * Their name + email travel to Paystack via spotix-backend so the
 * Transfer Recipient record carries them (see spotix-backend's
 * v1/admin-transfer.js).
 *
 * The actual Paystack call happens in spotix-backend — same division of
 * responsibility as Transfers (see lib/transfers-execute.ts). Terminal
 * resolution (successful/failed) arrives later via the transfer.*
 * webhook — v1/webhook.js already routes any `payouts`-table reference
 * that ISN'T an admin_transfers "SPTX-XFER-..." one through
 * v1/payout.js's processTransferEvents, so a "SPTX-DISB-..." reference
 * needs no webhook changes at all.
 *
 * Access: any registered admin role.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { adminDb } from "@/lib/firebase-admin"
import { claimDisbursementPayout, getDisbursementPayout, updateDisbursementPayout } from "@/lib/payments-db"
import { getSinglePayoutMethod } from "@/lib/payout-firestore-admin"
import { initiateBackendTransfer, PaystackError } from "@/lib/paystack-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { paymentId } = body
  if (!paymentId?.trim()) return fail("paymentId is required", 400)

  const payment = await getDisbursementPayout(paymentId)
  if (!payment) return fail("Payment not found", 404)

  const roles = Array.from(new Set([admin.role, ...admin.secondaryRoles].filter(Boolean)))
  const eligible =
    payment.disbursement_type === "member"
      ? payment.recipient_admin_uid === admin.uid
      : payment.recipient_department != null && roles.includes(payment.recipient_department)
  if (!eligible) return fail("You are not eligible to withdraw this payment", 403)

  if (payment.status !== "unclaimed" && payment.status !== "failed") {
    return fail(
      payment.status === "processing" ? "This payment is already being processed" : "This payment has already been withdrawn",
      409
    )
  }

  // Recipient's own bank details — never entered by whoever created the
  // disbursement, only by the recipient themselves via
  // app/api/v1/payments/payout-methods.
  const { methods, usable } = await getSinglePayoutMethod(admin.uid)
  const method = methods.find((m) => m.primary) ?? usable ?? methods[0]
  if (!method) {
    return fail("You don't have a payout method on file yet. Add your bank details first.", 400)
  }

  const claimed = await claimDisbursementPayout(paymentId, payment.status as "unclaimed" | "failed", { uid: admin.uid, name: admin.username })
  if (!claimed) {
    return fail("This payment was just claimed by someone else — refresh to see the latest status.", 409)
  }

  await updateDisbursementPayout(paymentId, {
    bank_name: method.bankName,
    bank_code: method.bankCode,
    account_number: method.accountNumber,
    account_name: method.accountName,
    method_id: method.id,
    recipient_code: method.recipientCode,
  })

  let recipientEmail: string | undefined
  try {
    const userDoc = await adminDb.collection("users").doc(admin.uid).get()
    recipientEmail = userDoc.data()?.email || undefined
  } catch {
    // Non-fatal — Paystack recipient creation just won't carry an email.
  }

  try {
    const result = await initiateBackendTransfer({
      reference: claimed.reference,
      amount: claimed.amount, // full disbursed amount — no fee is deducted from a team disbursement
      reason: claimed.narration || "Spotix team disbursement",
      bankCode: method.bankCode,
      accountNumber: method.accountNumber,
      accountName: method.accountName,
      recipientCode: method.recipientCode,
      recipientEmail,
    })

    const updated = await updateDisbursementPayout(paymentId, {
      recipient_code: result.recipientCode,
      transfer_code: result.transferCode,
      paystack_reference: claimed.reference,
    })
    return ok({ message: "Withdrawal initiated — you'll see it move to \"successful\" shortly.", payment: updated })
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Withdrawal failed to initiate"
    await updateDisbursementPayout(paymentId, {
      status: "failed",
      failure_reason: message,
      resolved_at: new Date().toISOString(),
    })
    return fail(message, 502)
  }
}
