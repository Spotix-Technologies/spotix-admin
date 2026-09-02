/**
 * app/lib/disbursements-db.ts
 *
 * All spotix-admin reads/writes against the Supabase `disbursements` /
 * `disbursement_approvals` tables (the approval workflow itself — see
 * /supabase/disbursements-schema.sql), plus the helpers that, once a
 * disbursement is fully approved, insert the actual withdrawable row(s)
 * into the EXISTING shared `payouts` table (same table
 * lib/payout-admin-db.ts uses for booker/poll payouts) so a team
 * member's Payments tab and this admin's Disbursements tab are both
 * reading/writing one ledger.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"
import { adminDb } from "@/lib/firebase-admin"
import type { AdminRole } from "@/lib/verify-admin"

export interface DisbursementRow {
  id: string
  reference: string
  type: "member" | "department"
  department: AdminRole | null
  recipient_uids: string[]
  amount: number
  reason: string
  created_by_uid: string
  created_by_name: string
  required_approver_uids: string[]
  approved_uids: string[]
  status: "pending_approval" | "approved" | "rejected"
  payout_references: string[]
  created_at: string
  approved_at: string | null
  updated_at: string
}

export interface DisbursementApprovalRow {
  id: string
  disbursement_id: string
  admin_uid: string
  admin_name: string
  method: "manual" | "requester"
  approved_at: string
}

/**
 * The actual money-movement status of one recipient's payout row — this
 * is what's missing from `DisbursementRow.status` alone, which only ever
 * reflects the APPROVAL workflow (pending_approval/approved/rejected)
 * and stays "approved" forever even after every recipient has been
 * paid. This is what changes when the Paystack transfer.success /
 * transfer.failed webhook lands (see app/api/v1/payments/withdraw's
 * doc comment for the exact webhook path — no code there changes for
 * this fix, it already flows through v1/payout.js's
 * processTransferEvents).
 */
export interface DisbursementPayoutSummary {
  id: string
  reference: string
  amount: number
  status: "unclaimed" | "processing" | "successful" | "failed"
  recipient_admin_uid: string | null
  recipient_admin_name: string | null
  recipient_department: AdminRole | null
  withdrawn_by_name: string | null
  failure_reason: string | null
  resolved_at: string | null
}

function randomLetters(count = 2): string {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let out = ""
  for (let i = 0; i < count; i++) out += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  return out
}
export function generateDisbursementReference(): string {
  return `SPTX-DISB-${Date.now()}-${randomLetters(2)}`
}

function getWATDateString(): string {
  // Same "pay_date" convention the booker/poll payout pipeline uses —
  // a plain YYYY-MM-DD in Africa/Lagos, not a full timestamp.
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" })
  return formatter.format(new Date())
}

export async function createDisbursement(row: Omit<DisbursementRow, "id" | "created_at" | "updated_at" | "approved_at" | "status" | "payout_references">): Promise<DisbursementRow> {
  const { data, error } = await supabaseAdmin
    .from("disbursements")
    .insert({ ...row, status: "pending_approval" })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DisbursementRow
}

export async function getDisbursement(id: string): Promise<DisbursementRow | null> {
  const { data, error } = await supabaseAdmin.from("disbursements").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as DisbursementRow) ?? null
}

export async function listDisbursements(page: number, perPage = 10): Promise<{ disbursements: DisbursementRow[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data, error, count } = await supabaseAdmin
    .from("disbursements")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { disbursements: (data ?? []) as DisbursementRow[], total: count ?? 0 }
}

export async function listPendingDisbursementApprovalsFor(adminUid: string): Promise<DisbursementRow[]> {
  const { data, error } = await supabaseAdmin
    .from("disbursements")
    .select("*")
    .eq("status", "pending_approval")
    .contains("required_approver_uids", [adminUid])
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return ((data ?? []) as DisbursementRow[]).filter((d) => !d.approved_uids.includes(adminUid))
}

export async function recordDisbursementApproval(row: Omit<DisbursementApprovalRow, "id" | "approved_at">): Promise<void> {
  const { error } = await supabaseAdmin.from("disbursement_approvals").insert(row)
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message)
}

export async function updateDisbursementStatus(id: string, patch: Partial<DisbursementRow>): Promise<DisbursementRow> {
  const { data, error } = await supabaseAdmin
    .from("disbursements")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DisbursementRow
}

/**
 * The per-recipient payout status for one or more disbursements — this
 * is what the Disbursements list/detail views need to actually show
 * whether recipients have been paid, rather than just the frozen
 * "approved" workflow status. Called by
 * app/api/v1/admin/disbursements/list and .../route.ts (GET by id) and
 * attached to each disbursement as `payouts`.
 */
export async function listPayoutsForDisbursementIds(disbursementIds: string[]): Promise<Record<string, DisbursementPayoutSummary[]>> {
  if (disbursementIds.length === 0) return {}
  const { data, error } = await supabaseAdmin
    .from("payouts")
    .select("id, reference, amount, status, disbursement_id, recipient_admin_uid, recipient_admin_name, recipient_department, withdrawn_by_name, failure_reason, resolved_at")
    .in("disbursement_id", disbursementIds)
  if (error) throw new Error(error.message)

  const grouped: Record<string, DisbursementPayoutSummary[]> = {}
  for (const row of (data ?? []) as (DisbursementPayoutSummary & { disbursement_id: string })[]) {
    const key = row.disbursement_id
    if (!grouped[key]) grouped[key] = []
    const { disbursement_id, ...summary } = row
    grouped[key].push(summary)
  }
  return grouped
}

/**
 * The single place a disbursement turns into actual withdrawable
 * `payouts` row(s) — called the moment the last required approval comes
 * in (see app/api/v1/admin/disbursements/route.ts and .../approve).
 *
 * - type "member": one row PER recipient, each already tied to that
 *   uid — only they can ever see or withdraw it (see
 *   app/api/v1/payments/route.ts).
 * - type "department": a single shared row with no user_id yet —
 *   every admin whose role/secondaryRoles include `department` can see
 *   it, but only the first to withdraw claims it (see
 *   app/api/v1/payments/withdraw/route.ts's conditional
 *   status="unclaimed" update, which is what makes that race-safe).
 */
export async function finalizeDisbursement(disbursement: DisbursementRow): Promise<string[]> {
  const payDate = getWATDateString()
  const baseRow = {
    is_event: false,
    is_poll: false,
    event_id: null,
    poll_id: null,
    event_name: null,
    poll_name: null,
    pay_date: payDate,
    amount: disbursement.amount,
    bank_name: null,
    bank_code: null,
    account_number: null,
    account_name: null,
    recipient_code: null,
    method_id: null,
    vault_locked: false,
    status: "unclaimed",
    narration: disbursement.reason,
    duration_seconds: 0,
    admin_initiated: true,
    admin_initiated_by_uid: disbursement.created_by_uid,
    admin_initiated_by_name: disbursement.created_by_name,
    is_disbursement: true,
    disbursement_id: disbursement.id,
  }

  let rows: Record<string, unknown>[]

  if (disbursement.type === "member") {
    // Names aren't sent by the create-disbursement request (only uids
    // are) — look them up once here so the list/detail view can show
    // "Jane Doe — successful" instead of a bare Firebase uid.
    const userDocs = await adminDb.getAll(...disbursement.recipient_uids.map((uid) => adminDb.collection("users").doc(uid)))
    const namesByUid: Record<string, string> = {}
    disbursement.recipient_uids.forEach((uid, i) => { namesByUid[uid] = userDocs[i].data()?.username || "Unknown" })

    rows = disbursement.recipient_uids.map((uid, i) => ({
      ...baseRow,
      reference: `${disbursement.reference}-${i + 1}`,
      user_id: uid,
      disbursement_type: "member" as const,
      recipient_admin_uid: uid,
      recipient_admin_name: namesByUid[uid],
      recipient_department: null,
    }))
  } else {
    rows = [
      {
        ...baseRow,
        reference: disbursement.reference,
        user_id: null,
        disbursement_type: "department" as const,
        recipient_admin_uid: null,
        recipient_admin_name: null,
        recipient_department: disbursement.department,
      },
    ]
  }

  const { data, error } = await supabaseAdmin.from("payouts").insert(rows).select("reference")
  if (error) throw new Error(error.message || "Failed to create disbursement payout row(s)")

  const references = (data ?? []).map((r: { reference: string }) => r.reference)
  await updateDisbursementStatus(disbursement.id, { status: "approved", approved_at: new Date().toISOString(), payout_references: references })
  return references
}
