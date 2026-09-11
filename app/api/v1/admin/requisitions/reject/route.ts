/**
 * app/api/v1/admin/requisitions/reject/route.ts
 *
 * POST { requisitionId, reason }
 *
 * Rejects a requisition that's still pending approval. A reason is
 * required and shown to the requester and every admin. A single
 * required approver's rejection is enough to stop it, matching
 * Transfers and Disbursements.
 *
 * Access: full "admin" only, and only a required approver on this
 * requisition.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getRequisition, rejectRequisition } from "@/lib/requisitions-db"

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
  const reason: string = typeof body.reason === "string" ? body.reason.trim() : ""
  if (!requisitionId?.trim()) return fail("requisitionId is required", 400)
  if (!reason) return fail("A rejection reason is required", 400)

  const requisition = await getRequisition(requisitionId)
  if (!requisition) return fail("Requisition not found", 404)
  if (requisition.status !== "pending_approval") return fail(`This requisition is no longer pending approval (status: ${requisition.status})`, 409)

  if (requisition.requested_by_uid === admin.uid) {
    return fail("You cannot reject your own requisition", 403)
  }
  if (!requisition.required_approver_uids.includes(admin.uid)) {
    return fail("You are not a required approver on this requisition", 403)
  }

  const rejected = await rejectRequisition(requisition.id, reason, { uid: admin.uid, name: admin.username })
  return ok({ message: "Requisition rejected.", requisition: rejected })
}
