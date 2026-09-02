/**
 * app/lib/payments-db.ts
 *
 * Reads/writes against the shared Supabase `payouts` table, scoped to
 * the disbursement-sourced rows a team member's Payments tab needs (see
 * app/api/v1/payments/*). Separate from lib/payout-admin-db.ts (which
 * owns the booker/poll organizer side of this same table) and from
 * lib/disbursements-db.ts (which owns the approval-workflow rows that
 * produce these).
 */

import { supabaseAdmin } from "@/lib/supabase-admin"
import type { AdminRole } from "@/lib/verify-admin"

export interface DisbursementPayoutRow {
  id: string
  reference: string
  amount: number
  status: "unclaimed" | "processing" | "successful" | "failed"
  failure_reason: string | null
  narration: string | null
  disbursement_type: "member" | "department"
  recipient_admin_uid: string | null
  recipient_department: AdminRole | null
  withdrawn_by_uid: string | null
  withdrawn_by_name: string | null
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  created_at: string
  resolved_at: string | null
}

/**
 * Every disbursement-sourced row a given admin is allowed to see:
 * rows addressed to them personally (type "member"), plus every row
 * addressed to a department they belong to (type "department") —
 * regardless of whether it's still unclaimed or someone already
 * withdrew it, so the team keeps visibility either way.
 */
export async function listPaymentsFor(uid: string, roles: AdminRole[]): Promise<DisbursementPayoutRow[]> {
  const orParts = [`recipient_admin_uid.eq.${uid}`]
  if (roles.length > 0) {
    orParts.push(`recipient_department.in.(${roles.join(",")})`)
  }

  const { data, error } = await supabaseAdmin
    .from("payouts")
    .select("id, reference, amount, status, failure_reason, narration, disbursement_type, recipient_admin_uid, recipient_department, withdrawn_by_uid, withdrawn_by_name, bank_name, account_number, account_name, created_at, resolved_at")
    .eq("is_disbursement", true)
    .or(orParts.join(","))
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as DisbursementPayoutRow[]
}

export async function getDisbursementPayout(id: string): Promise<DisbursementPayoutRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payouts")
    .select("*")
    .eq("id", id)
    .eq("is_disbursement", true)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as DisbursementPayoutRow) ?? null
}

/**
 * Atomically claims a payout for withdrawal — the conditional
 * `.eq("status", fromStatus)` is what makes this race-safe for
 * department-type rows two admins might click "Withdraw" on at the
 * same moment: only one update can actually match a row still in
 * `fromStatus`, the other gets back `null` and a clear "already
 * claimed" error rather than double-paying.
 *
 * `fromStatus` is "unclaimed" for a first attempt, or "failed" when a
 * team member is retrying a withdrawal whose Paystack call failed
 * earlier.
 */
export async function claimDisbursementPayout(
  id: string,
  fromStatus: "unclaimed" | "failed",
  by: { uid: string; name: string }
): Promise<DisbursementPayoutRow | null> {
  const { data, error } = await supabaseAdmin
    .from("payouts")
    .update({
      status: "processing",
      user_id: by.uid,
      withdrawn_by_uid: by.uid,
      withdrawn_by_name: by.name,
      failure_reason: null,
      processing_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", fromStatus)
    .select()
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as DisbursementPayoutRow) ?? null
}

export async function updateDisbursementPayout(id: string, patch: Record<string, unknown>): Promise<DisbursementPayoutRow> {
  const { data, error } = await supabaseAdmin
    .from("payouts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as DisbursementPayoutRow
}
