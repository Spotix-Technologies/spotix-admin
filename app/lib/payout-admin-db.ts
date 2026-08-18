/**
 * lib/payout-admin-db.ts
 *
 * All spotix-admin reads/writes against the shared Supabase `payouts`
 * table (see /supabase/payout-schema.sql + payout-schema-admin.sql).
 *
 * Two things only admin can do that the booker app never does:
 *   1. createAdminInitiatedPayout() — inserts a row that is ALREADY
 *      "successful", bypassing Paystack and Vault entirely. This exists
 *      for cases where an admin has settled a booker manually (outside
 *      Paystack) and needs the books to reflect it, or needs to force a
 *      payout through despite a stuck Vault.
 *   2. revertPayout() — deletes a row outright (per spec: "this will
 *      delete the Supabase entry"), after archiving a full snapshot to
 *      `reverted_payouts` for accountability. Never a silent delete.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"
import { DuplicateRequestError, isPayoutUniqueViolation } from "@/lib/payout-idempotency"

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
function randomLetters(count = 2): string {
  let out = ""
  for (let i = 0; i < count; i++) out += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  return out
}
export function generatePayoutReference(): string {
  return `SPTX-TRNS-${Date.now()}-${randomLetters(2)}`
}

export function buildNarration({
  isEvent, isPoll, eventName, pollName, payDate,
}: { isEvent: boolean; isPoll: boolean; eventName?: string | null; pollName?: string | null; payDate: string }): string {
  if (isEvent) return `Payout for your ${eventName || "event"} event for ${payDate}`
  if (isPoll) return `Payout for your ${pollName || "poll"} poll for ${payDate}`
  return `Spotix payout for ${payDate}`
}

export interface PayoutRow {
  id: string
  reference: string
  is_event: boolean
  is_poll: boolean
  event_id: string | null
  poll_id: string | null
  event_name: string | null
  poll_name: string | null
  pay_date: string
  user_id: string
  amount: number
  bank_name: string | null
  bank_code: string | null
  account_number: string | null
  account_name: string | null
  recipient_code: string | null
  method_id: string | null
  vault_locked: boolean
  status: "initializing" | "processing" | "successful" | "failed"
  failure_reason: string | null
  transfer_code: string | null
  paystack_reference: string | null
  narration: string | null
  duration_seconds: number
  admin_initiated: boolean
  admin_initiated_by_uid: string | null
  admin_initiated_by_name: string | null
  created_at: string
  processing_at: string | null
  resolved_at: string | null
  updated_at: string
}

export async function getPayoutsForEvent(eventId: string): Promise<PayoutRow[]> {
  const { data, error } = await supabaseAdmin.from("payouts").select("*").eq("event_id", eventId).order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PayoutRow[]
}

export async function getPayoutsForPoll(pollId: string): Promise<PayoutRow[]> {
  const { data, error } = await supabaseAdmin.from("payouts").select("*").eq("poll_id", pollId).order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PayoutRow[]
}

export async function getPayoutByReference(reference: string): Promise<PayoutRow | null> {
  const { data, error } = await supabaseAdmin.from("payouts").select("*").eq("reference", reference).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PayoutRow) ?? null
}

/** Same dedupe rule as the booker app: any non-"failed" row for this date blocks a new one. */
export async function hasActiveOrSuccessfulPayout(scope: { eventId?: string; pollId?: string }, payDate: string): Promise<boolean> {
  let query = supabaseAdmin.from("payouts").select("id, status").eq("pay_date", payDate)
  query = scope.eventId ? query.eq("event_id", scope.eventId) : query.eq("poll_id", scope.pollId!)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).some((r) => r.status !== "failed")
}

export interface AdminPayoutMethod {
  methodId: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  recipientCode: string | null
}

export interface CreateAdminPayoutInput {
  isEvent: boolean
  isPoll: boolean
  eventId?: string | null
  pollId?: string | null
  eventName?: string | null
  pollName?: string | null
  payDate: string
  /** The BENEFICIARY (event/poll owner) — not the admin. totalPaidOut analytics attach to this uid. */
  beneficiaryUserId: string
  amount: number
  method: AdminPayoutMethod
  vaultLocked: boolean // true if a Vault exists on this event and was overridden
  adminUid: string
  adminName: string
}

/**
 * Inserts a row that is ALREADY "successful" — no Paystack call, no
 * initializing/processing window. The same partial unique index that
 * protects the booker flow (one non-failed row per event/date, or
 * poll/date) applies here identically, so this can't double-pay a date
 * that already has an active or successful payout from ANY source —
 * booker-initiated or admin-initiated.
 */
export async function createAdminInitiatedPayout(input: CreateAdminPayoutInput): Promise<PayoutRow> {
  const reference = generatePayoutReference()
  const narration = buildNarration({
    isEvent: input.isEvent, isPoll: input.isPoll, eventName: input.eventName, pollName: input.pollName, payDate: input.payDate,
  })
  const now = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from("payouts")
    .insert({
      reference,
      is_event: input.isEvent,
      is_poll: input.isPoll,
      event_id: input.eventId ?? null,
      poll_id: input.pollId ?? null,
      event_name: input.eventName ?? null,
      poll_name: input.pollName ?? null,
      pay_date: input.payDate,
      user_id: input.beneficiaryUserId,
      amount: input.amount,
      bank_name: input.method.bankName,
      bank_code: input.method.bankCode,
      account_number: input.method.accountNumber,
      account_name: input.method.accountName,
      recipient_code: input.method.recipientCode,
      method_id: input.method.methodId,
      vault_locked: input.vaultLocked,
      status: "successful",
      narration,
      admin_initiated: true,
      admin_initiated_by_uid: input.adminUid,
      admin_initiated_by_name: input.adminName,
      duration_seconds: 0,
      processing_at: now,
      resolved_at: now,
    })
    .select()
    .single()

  if (error) {
    if (isPayoutUniqueViolation(error)) {
      throw new DuplicateRequestError("A payout for this date is already in progress or has already succeeded.")
    }
    throw new Error(error.message || "Failed to create admin-initiated payout")
  }
  return data as PayoutRow
}

export interface RevertResult {
  snapshot: PayoutRow
}

/**
 * Archives the full row to `reverted_payouts`, then deletes it from
 * `payouts`. The caller (the route handler) is responsible for the
 * side-effects a revert implies: clearing the reference off the
 * Firestore date doc, and — if the reverted row was "successful" —
 * reversing the totalPaidOut/analytics increments that were applied
 * when it resolved. Those touch Firestore, not Supabase, so they live
 * in the route, not here.
 */
export async function revertPayout(reference: string, reason: string, adminUid: string, adminName: string): Promise<RevertResult> {
  const row = await getPayoutByReference(reference)
  if (!row) throw new Error("Payout not found")

  const { error: archiveError } = await supabaseAdmin.from("reverted_payouts").insert({
    original_row: row,
    reference: row.reference,
    previous_status: row.status,
    reverted_by_uid: adminUid,
    reverted_by_name: adminName,
    reason,
  })
  if (archiveError) throw new Error(archiveError.message || "Failed to archive payout before reverting")

  const { error: deleteError } = await supabaseAdmin.from("payouts").delete().eq("reference", reference)
  if (deleteError) throw new Error(deleteError.message || "Failed to delete payout")

  return { snapshot: row }
}
