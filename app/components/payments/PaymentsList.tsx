import { AlertCircle, CheckCircle2, Clock, Loader2, Users, User, XCircle } from "lucide-react"
import { DEPARTMENT_LABEL, STATUS_STYLES, type PaymentRow } from "./types"

interface Props {
  payments: PaymentRow[]
  loading: boolean
  error: string | null
  withdrawing: string | null
  withdrawError: string | null
  hasPayoutMethod: boolean
  onWithdraw: (paymentId: string) => void
}

export function PaymentsList({ payments, loading, error, withdrawing, withdrawError, hasPayoutMethod, onWithdraw }: Props) {
  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-red-500 bg-white border border-slate-200 rounded-2xl">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    )
  }
  if (loading) {
    return (
      <div className="py-12 flex justify-center bg-white border border-slate-200 rounded-2xl">
        <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
      </div>
    )
  }
  if (payments.length === 0) {
    return (
      <div className="py-12 text-center bg-white border border-slate-200 rounded-2xl">
        <p className="text-sm text-slate-400">No payments yet</p>
        <p className="text-xs text-slate-400 mt-1">Disbursements sent to you or your department will show up here.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      {withdrawError && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border-b border-red-200 px-5 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {withdrawError}
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {payments.map((p) => (
          <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                {p.disbursement_type === "department" ? <Users className="w-3.5 h-3.5 text-slate-400" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                {p.narration || "Spotix disbursement"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {p.reference} · {new Date(p.created_at).toLocaleString()}
                {p.disbursement_type === "department" && p.recipient_department && (
                  <> · {DEPARTMENT_LABEL[p.recipient_department] ?? p.recipient_department} team</>
                )}
                {p.withdrawn_by_name && <> · withdrawn by {p.withdrawn_by_name}</>}
              </p>
              {p.status === "failed" && p.failure_reason && (
                <p className="text-[11px] text-red-500 mt-1">{p.failure_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <p className="text-sm font-bold text-slate-800">₦{p.amount.toLocaleString()}</p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLES[p.status] ?? ""}`}>
                {p.status === "successful" ? <CheckCircle2 className="w-3 h-3" /> : p.status === "failed" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {p.status}
              </span>
              {p.canWithdraw && (
                <button
                  onClick={() => onWithdraw(p.id)}
                  disabled={withdrawing === p.id || !hasPayoutMethod}
                  title={!hasPayoutMethod ? "Add a payout method first" : undefined}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  {withdrawing === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  {p.status === "failed" ? "Retry withdrawal" : "Withdraw"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
