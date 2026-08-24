/**
 * app/lib/transfers-execute.ts
 *
 * The single place that actually moves money for a Transfer, once it has
 * every required approval. Called from both:
 *   - POST /api/v1/admin/transfer         (when an OTTA key at creation
 *                                           time already covers every
 *                                           other admin, so quorum is hit
 *                                           immediately)
 *   - POST /api/v1/admin/transfer/approve (when the last manual/OTTA
 *                                           approval comes in later)
 *
 * As of this version, the actual Paystack call happens in
 * spotix-backend (see spotix-backend/v1/admin-transfer.js) — this
 * function just asks it to initiate the transfer and records the
 * result. Paystack ACCEPTING the transfer request only means it's
 * started, not that it succeeded — same as the existing booker payout
 * pipeline (see spotix-backend/v1/lib/payout/process.js), terminal
 * resolution (successful/failed) arrives later via the transfer.*
 * webhook, which is also where analytics get recorded under the
 * existing admin/analytics/{daily,monthly,yearly} payout counters (see
 * spotix-backend/v1/lib/admin-transfer/events.js) — NOT here, since we
 * don't yet know the real outcome at this point.
 */

import { initiateBackendTransfer, PaystackError } from "@/lib/paystack-admin"
import { updateTransferStatus, type TransferRow } from "@/lib/transfers-db"

export async function executeApprovedTransfer(transfer: TransferRow): Promise<TransferRow> {
  await updateTransferStatus(transfer.id, { status: "processing", approved_at: new Date().toISOString() })

  try {
    const result = await initiateBackendTransfer({
      reference: transfer.reference,
      amount: transfer.amount_after_fee,
      reason: transfer.reason,
      bankCode: transfer.bank_code,
      accountNumber: transfer.account_number,
      accountName: transfer.account_name,
      recipientCode: transfer.recipient_code,
    })

    // Still "processing" — spotix-backend accepted the request, but the
    // real outcome comes later via the transfer.* webhook.
    return updateTransferStatus(transfer.id, {
      recipient_code: result.recipientCode,
      transfer_code: result.transferCode,
      paystack_reference: transfer.reference,
    })
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Transfer failed to initiate"
    return updateTransferStatus(transfer.id, {
      status: "failed",
      failure_reason: message,
      resolved_at: new Date().toISOString(),
    })
  }
}
