/**
 * app/lib/transfers-db.ts
 *
 * All spotix-admin reads/writes against the Supabase `admin_transfers` /
 * `admin_transfer_approvals` tables — see
 * /supabase/admin-transfers-schema.sql. Separate from lib/payout-admin-db.ts
 * (booker/poll organizer payouts) since these are wallet-to-bank transfers
 * initiated directly by an admin, not settlements owed to a booker.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

export interface TransferRow {
  id: string
  reference: string
  requested_by_uid: string
  requested_by_name: string
  bank_name: string
  bank_code: string
  account_number: string
  account_name: string
  recipient_code: string | null
  reason: string
  amount: number
  fee: number
  amount_after_fee: number
  status: "pending_approval" | "approved" | "processing" | "successful" | "failed" | "rejected"
  failure_reason: string | null
  required_approver_uids: string[]
  approved_uids: string[]
  transfer_code: string | null
  paystack_reference: string | null
  created_at: string
  approved_at: string | null
  resolved_at: string | null
  updated_at: string
}

export interface TransferApprovalRow {
  id: string
  transfer_id: string
  admin_uid: string
  admin_name: string
  method: "manual" | "otta" | "requester"
  otta_key_id: string | null
  approved_at: string
}

function randomLetters(count = 2): string {
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let out = ""
  for (let i = 0; i < count; i++) out += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  return out
}
export function generateTransferReference(): string {
  return `SPTX-XFER-${Date.now()}-${randomLetters(2)}`
}

export async function createTransfer(row: Omit<TransferRow, "id" | "created_at" | "updated_at" | "approved_at" | "resolved_at" | "status" | "failure_reason" | "transfer_code" | "paystack_reference">): Promise<TransferRow> {
  const { data, error } = await supabaseAdmin
    .from("admin_transfers")
    .insert({ ...row, status: "pending_approval" })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TransferRow
}

export async function getTransfer(id: string): Promise<TransferRow | null> {
  const { data, error } = await supabaseAdmin.from("admin_transfers").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as TransferRow) ?? null
}

export async function listTransfers(page: number, perPage = 10): Promise<{ transfers: TransferRow[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data, error, count } = await supabaseAdmin
    .from("admin_transfers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)
  if (error) throw new Error(error.message)
  return { transfers: (data ?? []) as TransferRow[], total: count ?? 0 }
}

export async function listPendingApprovalsFor(adminUid: string): Promise<TransferRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_transfers")
    .select("*")
    .eq("status", "pending_approval")
    .contains("required_approver_uids", [adminUid])
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  // Exclude ones this admin has already approved
  return ((data ?? []) as TransferRow[]).filter((t) => !t.approved_uids.includes(adminUid))
}

export async function recordApproval(row: Omit<TransferApprovalRow, "id" | "approved_at">): Promise<void> {
  const { error } = await supabaseAdmin.from("admin_transfer_approvals").insert(row)
  if (error && !error.message.includes("duplicate key")) throw new Error(error.message)
}

export async function addApprovedUid(transferId: string, uid: string, currentApproved: string[]): Promise<string[]> {
  const updated = Array.from(new Set([...currentApproved, uid]))
  const { error } = await supabaseAdmin.from("admin_transfers").update({ approved_uids: updated, updated_at: new Date().toISOString() }).eq("id", transferId)
  if (error) throw new Error(error.message)
  return updated
}

/**
 * Total of past SUCCESSFUL transfers we've sent to this exact
 * account-number + bank-code pair — surfaced in the Create Transfer
 * modal as "You've sent a total of ₦X to this beneficiary" once the
 * account resolves. Only counts transfers that actually completed.
 */
export async function sumSuccessfulTransfersTo(accountNumber: string, bankCode: string): Promise<{ totalSent: number; transferCount: number }> {
  const { data, error } = await supabaseAdmin
    .from("admin_transfers")
    .select("amount_after_fee")
    .eq("account_number", accountNumber)
    .eq("bank_code", bankCode)
    .eq("status", "successful")
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as { amount_after_fee: number }[]
  return {
    totalSent: rows.reduce((sum, r) => sum + (r.amount_after_fee ?? 0), 0),
    transferCount: rows.length,
  }
}

export async function updateTransferStatus(id: string, patch: Partial<TransferRow>): Promise<TransferRow> {
  const { data, error } = await supabaseAdmin
    .from("admin_transfers")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as TransferRow
}
