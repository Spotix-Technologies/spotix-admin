/**
 * app/api/v1/requisitions/route.ts
 *
 * GET  ?mine=1 → the calling admin's own requisitions (any status)
 * POST         → create a new requisition (a request for funds FOR the
 *                caller themselves)
 *   Body: { amount: number, reason: string }
 *
 * Every full "admin" (see lib/admin-roster.ts's listAdminApprovers) must
 * approve before the requester can claim the funds — see
 * .../admin/requisitions/approve. Unlike Disbursements, the requester is
 * never auto-approved here, even if they themselves hold the full
 * "admin" role — approving your own fund request would defeat the
 * point of requiring every admin's sign-off. If there happen to be no
 * OTHER full admins to approve it (e.g. a single-admin company, or the
 * requester is the only admin), it's finalized immediately since there's
 * nobody left who could ever approve it.
 *
 * Access: any registered admin role (every role dashboard gets a
 * Requisition menu item).
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listAdminApprovers } from "@/lib/admin-roster"
import {
  createRequisition,
  finalizeRequisition,
  generateRequisitionReference,
  getRequisition,
  listMyRequisitions,
} from "@/lib/requisitions-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  const requisitions = await listMyRequisitions(admin.uid)
  return ok({ requisitions })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const reason: string = typeof body.reason === "string" ? body.reason.trim() : ""
  const amount = Number(body.amount)
  if (!reason) return fail("reason is required", 400)
  if (!Number.isFinite(amount) || amount <= 0) return fail("amount must be a positive number", 400)

  const reference = generateRequisitionReference()
  const approvers = await listAdminApprovers()
  const requiredApproverUids = approvers.map((a) => a.uid).filter((uid) => uid !== admin.uid)

  const requisition = await createRequisition({
    reference,
    amount,
    reason,
    requested_by_uid: admin.uid,
    requested_by_name: admin.username,
    requested_by_role: admin.role,
    required_approver_uids: requiredApproverUids,
    approved_uids: [],
  })

  if (requiredApproverUids.length === 0) {
    await finalizeRequisition(requisition)
    const finalRow = await getRequisition(requisition.id)
    return ok({
      message: "Requisition created and fully approved — funds are now available to claim from your Payments tab.",
      requisition: finalRow,
    }, 201)
  }

  return ok({
    message: `Requisition submitted. Waiting on ${requiredApproverUids.length} admin approval(s).`,
    requisition,
  }, 201)
}
