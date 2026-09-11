/**
 * app/api/v1/admin/transfer/reject/route.ts
 *
 * POST { transferId, reason }
 *
 * Rejects a transfer that's still pending approval. A reason is
 * required and is shown to every admin (see TransferListPanel +
 * PendingApprovalsPanel). Unlike approval — which needs every required
 * approver to sign off — a single required approver's rejection is
 * enough to stop the transfer; no further approvals can be recorded
 * once status is "rejected".
 *
 * Access: full "admin" only, and only a required approver on this
 * transfer.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getTransfer, rejectTransfer } from "@/lib/transfers-db"

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

  const { transferId } = body
  const reason: string = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!transferId?.trim()) return fail("transferId is required", 400)
  if (!reason) return fail("A rejection reason is required", 400)

  const transfer = await getTransfer(transferId)
  if (!transfer) return fail("Transfer not found", 404)
  if (transfer.status !== "pending_approval") return fail(`This transfer is no longer pending approval (status: ${transfer.status})`, 409)

  if (!transfer.required_approver_uids.includes(admin.uid)) {
    return fail("You are not a required approver on this transfer", 403)
  }

  const rejected = await rejectTransfer(transfer.id, reason, { uid: admin.uid, name: admin.username })
  return ok({ message: "Transfer rejected.", transfer: rejected })
}
