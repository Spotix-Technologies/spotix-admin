/**
 * app/lib/requisitions-db.ts
 *
 * All spotix-admin reads/writes against the Supabase `requisitions` /
 * `requisition_approvals` tables — see /supabase/requisitions-schema.sql.
 * Mirrors app/lib/disbursements-db.ts, but the flow is the other way
 * round: a staff member requests funds for THEMSELVES, and every full
 * "admin" (see lib/admin-roster.ts's listAdminApprovers) must approve
 * before they can claim it.
 *
 * Once fully approved, finalizeRequisition inserts a single row into the
 * EXISTING shared `payouts` table with `is_disbursement: true` and
 * `disbursement_type: "member"` — the exact shape a disbursement payout
 * already uses — so the requester's existing Payments tab
 * (app/components/payments/*, app/lib/payments-db.ts,
 * app/api/v1/payments/*) picks it up and lets them withdraw it with NO
 * changes to that already-working code path. `requisition_id` on the
 * payouts row is for traceability only.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"
import type { AdminRole } from "@/lib/verify-admin"

export interface RequisitionRow {
  id: string
  reference: string
  amount: number
  reason: string
  requested_by_uid: string
  requested_by_name: string
  requested_by_role: AdminRole
  required_approver_uids: string[]
  approved_uids: string[]
  status: "pending_approval" | "approved" | "rejected"
  rejection_reason: string | null
  rejected_by_uid: string | null
  rejected_by_name: string | null
  payout_reference: string | null
  created_at: string
  approved_at: string | null
  updated_at: string
}

export interface RequisitionApprovalRow {
  id: string
  requisition_id: string
  admin_uid: string
  admin_name: string
  approved_at: string
}

function randomLetters(count = 2): string {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let out = ""
  for (let i = 0; i < count; i++) out += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  return out
}
export function generateRequisitionReference(): string {
  return `SPTX-REQN-${Date.now()}-${randomLetters(2)}`
}

function getWATDateString(): string {
  // Same "pay_date" convention the disbursement/booker/poll payout
  // pipeline uses — a plain YYYY-MM-DD in Africa/Lagos.
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" })
  return formatter.format(new Date())
}

export async function createRequisition(
  row: Omit<RequisitionRow, "id" | "created_at" | "updated_at" | "approved_at" | "status" | "payout_reference" | "rejection_reason" | "rejected_by_uid" | "rejected_by_name">
): Promise<RequisitionRow> {
  const { data, error } = await supabaseAdmin
    .from("requisitions")
    .insert({ ...row, status: "pending_approval" })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as RequisitionRow
}

export async function getRequisition(id: string): Promise<RequisitionRow | null> {
  const { data, error } = await supabaseAdmin.from("requisitions").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as RequisitionRow) ?? null
}

export async function listRequisitions(page: number, perPage = 10): Promise<{ requisitions: RequisitionRow[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data, error, count } = await supabaseAdmin
    .from("requisitions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { requisitions: (data ?? []) as RequisitionRow[], total: count ?? 0 }
}

export async function listMyRequisitions(uid: string): Promise<RequisitionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("requisitions")
    .select("*")
    .eq("requested_by_uid", uid)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as RequisitionRow[]
}

export async function listPendingRequisitionApprovalsFor(adminUid: string): Promise<RequisitionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("requisitions")
    .select("*")
    .eq("status", "pending_approval")
    .contains("required_approver_uids", [adminUid])
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as RequisitionRow[]).filter((r) => !r.approved_uids.includes(adminUid))
}

export async function recordRequisitionApproval(row: Omit<RequisitionApprovalRow, "id" | "approved_at">): Promise<void> {
  const { error } = await supabaseAdmin.from("requisition_approvals").insert(row)
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message)
}

export async function updateRequisitionStatus(id: string, patch: Partial<RequisitionRow>): Promise<RequisitionRow> {
  const { data, error } = await supabaseAdmin
    .from("requisitions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as RequisitionRow
}

/**
 * Rejects a requisition that's still pending approval. Like Transfers
 * and Disbursements, a single required approver's rejection is enough
 * to stop it — see app/api/v1/admin/requisitions/reject/route.ts.
 */
export async function rejectRequisition(id: string, reason: string, by: { uid: string; name: string }): Promise<RequisitionRow> {
  return updateRequisitionStatus(id, {
    status: "rejected",
    rejection_reason: reason,
    rejected_by_uid: by.uid,
    rejected_by_name: by.name,
  })
}

/**
 * The single place a requisition turns into an actual withdrawable
 * `payouts` row — called the moment the last required approval comes in
 * (see app/api/v1/admin/requisitions/approve/route.ts). Reuses the
 * disbursement payout shape exactly (is_disbursement / disbursement_type
 * "member" / recipient_admin_uid) — see the file header comment for why.
 */
export async function finalizeRequisition(requisition: RequisitionRow): Promise<string> {
  const payDate = getWATDateString()
  const row = {
    is_event: false,
    is_poll: false,
    event_id: null,
    poll_id: null,
    event_name: null,
    poll_name: null,
    pay_date: payDate,
    reference: requisition.reference,
    amount: requisition.amount,
    bank_name: null,
    bank_code: null,
    account_number: null,
    account_name: null,
    recipient_code: null,
    method_id: null,
    vault_locked: false,
    status: "unclaimed",
    narration: requisition.reason,
    duration_seconds: 0,
    admin_initiated: false,
    admin_initiated_by_uid: null,
    admin_initiated_by_name: null,
    is_disbursement: true,
    disbursement_id: null,
    disbursement_type: "member" as const,
    user_id: requisition.requested_by_uid,
    recipient_admin_uid: requisition.requested_by_uid,
    recipient_admin_name: requisition.requested_by_name,
    recipient_department: null,
    is_requisition: true,
    requisition_id: requisition.id,
  }

  const { data, error } = await supabaseAdmin.from("payouts").insert(row).select("reference").single()
  if (error) throw new Error(error.message || "Failed to create requisition payout row")

  const reference = (data as { reference: string }).reference
  await updateRequisitionStatus(requisition.id, { status: "approved", approved_at: new Date().toISOString(), payout_reference: reference })
  return reference
}
