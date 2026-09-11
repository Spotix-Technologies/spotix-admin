export interface RequisitionRow {
  id: string
  reference: string
  amount: number
  reason: string
  requested_by_uid: string
  requested_by_name: string
  requested_by_role: string
  required_approver_uids: string[]
  approved_uids: string[]
  status: "pending_approval" | "approved" | "rejected"
  rejection_reason: string | null
  rejected_by_uid: string | null
  rejected_by_name: string | null
  payout_reference: string | null
  created_at: string
  approved_at: string | null
}

export const STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  approved:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:         "bg-red-50 text-red-700 border-red-200",
}

export const ROLE_LABEL: Record<string, string> = {
  admin:              "Admin",
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  marketing:          "Marketing",
  IT:                 "IT",
}
