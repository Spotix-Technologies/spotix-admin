export interface DisbursementPayoutSummary {
  id: string
  reference: string
  amount: number
  status: "unclaimed" | "processing" | "successful" | "failed"
  recipient_admin_uid: string | null
  recipient_admin_name: string | null
  recipient_department: string | null
  withdrawn_by_name: string | null
  failure_reason: string | null
  resolved_at: string | null
}

export interface DisbursementRow {
  id: string
  reference: string
  type: "member" | "department"
  department: string | null
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
  /** The actual money-movement status per recipient — only present once `status` is "approved". See app/lib/disbursements-db.ts's listPayoutsForDisbursementIds. */
  payouts?: DisbursementPayoutSummary[]
}

export interface RosterAdmin {
  uid: string
  email: string
  username: string
  fullName: string
  role: string
  secondaryRoles: string[]
}

export const DEPARTMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "exec-assistant", label: "Exec Assistant" },
  { value: "customer-support", label: "Customer Support" },
  { value: "marketing", label: "Marketing" },
  { value: "IT", label: "IT" },
]
