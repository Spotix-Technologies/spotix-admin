/**
 * app/api/v1/admin/disbursements/route.ts
 *
 * GET  ?id=xxx  → single disbursement detail
 * POST           → create a new disbursement request
 *   Body: {
 *     type: "member" | "department",
 *     recipientUids?: string[],   // type "member" — one or more admin uids.
 *                                 // `amount` below is paid to EACH of them,
 *                                 // not split between them.
 *     department?: AdminRole,    // type "department" — every admin whose
 *                                 // role/secondaryRoles include this can
 *                                 // see + withdraw the one shared amount.
 *     amount: number,
 *     reason: string,
 *   }
 *
 * Exactly like Transfers (see app/api/v1/admin/transfer/route.ts): every
 * full "admin" must approve before a team member can withdraw anything —
 * see lib/admin-roster.ts. The requester is auto-approved as the
 * initiator. If that's every required approver (e.g. a one-admin
 * company), the payout row(s) are created immediately; otherwise the
 * disbursement sits as "pending_approval" until the rest sign off via
 * POST .../approve.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, type AdminRole } from "@/lib/verify-admin"
import { adminDb } from "@/lib/firebase-admin"
import { listAdminApprovers } from "@/lib/admin-roster"
import {
  createDisbursement,
  finalizeDisbursement,
  generateDisbursementReference,
  getDisbursement,
  listPayoutsForDisbursementIds,
  recordDisbursementApproval,
  updateDisbursementStatus,
} from "@/lib/disbursements-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const VALID_ROLES: AdminRole[] = ["admin", "exec-assistant", "customer-support", "marketing", "IT"]

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

  const disbursement = await getDisbursement(id)
  if (!disbursement) return fail("Disbursement not found", 404)

  const payoutsByDisbursement = await listPayoutsForDisbursementIds([disbursement.id])
  return ok({ disbursement: { ...disbursement, payouts: payoutsByDisbursement[disbursement.id] ?? [] } })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { type, reason } = body
  const amount = Number(body.amount)

  if (type !== "member" && type !== "department") return fail("type must be \"member\" or \"department\"", 400)
  if (!reason?.trim()) return fail("reason is required", 400)
  if (!Number.isFinite(amount) || amount <= 0) return fail("amount must be a positive number", 400)

  let recipientUids: string[] = []
  let department: AdminRole | null = null

  if (type === "member") {
    recipientUids = Array.isArray(body.recipientUids) ? [...new Set(body.recipientUids.filter((u: unknown) => typeof u === "string" && u.trim()))] : []
    if (recipientUids.length === 0) return fail("recipientUids must include at least one admin", 400)

    // Confirm every chosen uid is actually a registered admin (any role).
    const adminDocs = await adminDb.getAll(...recipientUids.map((uid) => adminDb.collection("admins").doc(uid)))
    const missing = adminDocs.filter((d) => !d.exists)
    if (missing.length > 0) return fail("One or more selected recipients are not registered admins", 400)
  } else {
    department = body.department
    if (!department || !VALID_ROLES.includes(department)) return fail("department must be a valid admin role", 400)

    // Must have at least one current admin in that department, or this
    // disbursement would be created with nobody able to ever see it.
    const [primarySnap, secondarySnap] = await Promise.all([
      adminDb.collection("admins").where("role", "==", department).limit(1).get(),
      adminDb.collection("admins").where("secondaryRoles", "array-contains", department).limit(1).get(),
    ])
    if (primarySnap.empty && secondarySnap.empty) return fail(`No admins are currently in the "${department}" department`, 400)
  }

  const reference = generateDisbursementReference()
  const approvers = await listAdminApprovers()
  const requiredApproverUids = approvers.map((a) => a.uid)

  const disbursement = await createDisbursement({
    reference,
    type,
    department,
    recipient_uids: recipientUids,
    amount,
    reason,
    created_by_uid: admin.uid,
    created_by_name: admin.username,
    required_approver_uids: requiredApproverUids,
    approved_uids: [],
  })

  // The requester is auto-approved as the initiator — same convention as Transfers.
  await recordDisbursementApproval({ disbursement_id: disbursement.id, admin_uid: admin.uid, admin_name: admin.username, method: "requester" })
  const approvedUids = [admin.uid]
  const outstanding = requiredApproverUids.filter((uid) => !approvedUids.includes(uid))

  if (outstanding.length === 0) {
    await finalizeDisbursement({ ...disbursement, approved_uids: approvedUids })
    const finalRow = await getDisbursement(disbursement.id)
    const payoutsByDisbursement = finalRow ? await listPayoutsForDisbursementIds([finalRow.id]) : {}
    return ok({
      message: "Disbursement created and fully approved — payout(s) are now available for withdrawal.",
      disbursement: finalRow ? { ...finalRow, payouts: payoutsByDisbursement[finalRow.id] ?? [] } : finalRow,
    }, 201)
  }

  const updated = await updateDisbursementStatus(disbursement.id, { approved_uids: approvedUids })
  return ok({
    message: `Disbursement created. Waiting on ${outstanding.length} more admin approval(s).`,
    disbursement: updated,
  }, 201)
}
