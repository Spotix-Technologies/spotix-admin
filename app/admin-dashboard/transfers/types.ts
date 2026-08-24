export interface TransferRow {
  id: string
  reference: string
  requested_by_uid: string
  requested_by_name: string
  bank_name: string
  bank_code: string
  account_number: string
  account_name: string
  reason: string
  amount: number
  fee: number
  amount_after_fee: number
  status: "pending_approval" | "approved" | "processing" | "successful" | "failed" | "rejected"
  failure_reason: string | null
  required_approver_uids: string[]
  approved_uids: string[]
  created_at: string
}

export interface OttaKey {
  id: string
  maxAmount: number
  durationMinutes: number
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt: string | null
  usedForType: "transfer" | "vault" | null
  revoked: boolean
  status: "active" | "used" | "expired" | "revoked"
}

/** A withdrawal made directly on Paystack's dashboard, not through this admin panel. */
export interface ExternalTransferRow {
  reference: string
  amount: number
  status: string
  createdAt: string | null
  beneficiaryName: string | null
  bankName: string | null
  accountNumber: string | null
}

export interface Bank {
  name: string
  code: string
}

/** Result of resolving a beneficiary's account number + bank code. */
export interface AccountResolution {
  accountName: string
  totalSent: number
  transferCount: number
}

export const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  approved:         "bg-blue-50 text-blue-700 border-blue-200",
  processing:       "bg-blue-50 text-blue-700 border-blue-200",
  successful:       "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:           "bg-red-50 text-red-700 border-red-200",
  rejected:         "bg-red-50 text-red-700 border-red-200",
}

// Mirrors spotix-backend's v1/lib/paystack.js calculateTransferFee —
// client-side preview only, the server (via spotix-backend) is the
// source of truth for the actual amount charged.
export function previewFee(amount: number): number {
  if (!amount || amount <= 0) return 0
  if (amount <= 5_000) return 10
  if (amount <= 50_000) return 25
  return 50
}
