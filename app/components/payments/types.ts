export interface PaymentRow {
  id: string
  reference: string
  amount: number
  status: "unclaimed" | "processing" | "successful" | "failed"
  failure_reason: string | null
  narration: string | null
  disbursement_type: "member" | "department"
  recipient_admin_uid: string | null
  recipient_department: string | null
  withdrawn_by_uid: string | null
  withdrawn_by_name: string | null
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  created_at: string
  resolved_at: string | null
  canWithdraw: boolean
}

export interface PayoutMethod {
  id: string
  accountName: string
  accountNumber: string
  bankCode: string
  bankName: string
  createdAt: string
  primary: boolean
}

export interface Bank {
  name: string
  code: string
}

export const STATUS_STYLES: Record<string, string> = {
  unclaimed:  "bg-violet-50 text-violet-700 border-violet-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  successful: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
}

export const DEPARTMENT_LABEL: Record<string, string> = {
  admin:              "Admin",
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  marketing:          "Marketing",
  IT:                 "IT",
}
