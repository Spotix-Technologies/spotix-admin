import { useState } from "react"
import { AlertCircle, Building2, CheckCircle2, Loader2, UserRound, XCircle } from "lucide-react"
import type { DisbursementRow } from "../types"
import { DEPARTMENT_OPTIONS } from "../types"
import { RejectReasonModal } from "@/components/shared/RejectReasonModal"

interface Props {
  pending: DisbursementRow[]
  loading: boolean
  approving: string | null
  rejecting: string | null
  approveError: string | null
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => Promise<boolean>
}

const DEPT_LABEL = Object.fromEntries(DEPARTMENT_OPTIONS.map((d) => [d.value, d.label]))

export function PendingDisbursementApprovalsPanel({ pending, loading, approving, rejecting, approveError, onApprove, onReject }: Props) {
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  if (loading) {
    return <div className="py-6 flex justify-center bg-white border border-slate-200 rounded-2xl"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
  }
  if (pending.length === 0) return null

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
        <p className="text-sm font-bold text-amber-800">Awaiting your approval ({pending.length})</p>
      </div>
      {approveError && (
        <p className="text-sm text-red-600 flex items-center gap-1.5 px-5 pt-3"><AlertCircle className="w-4 h-4" /> {approveError}</p>
      )}
      <div className="divide-y divide-slate-100">
        {pending.map((d) => (
          <div key={d.id} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                {d.type === "department" ? <Building2 className="w-3.5 h-3.5 text-slate-400" /> : <UserRound className="w-3.5 h-3.5 text-slate-400" />}
                {d.reason}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {d.type === "department"
                  ? `${DEPT_LABEL[d.department ?? ""] ?? d.department} department`
                  : `${d.recipient_uids.length} recipient${d.recipient_uids.length > 1 ? "s" : ""}`}
                {" · "}₦{d.amount.toLocaleString()} {d.type === "member" && d.recipient_uids.length > 1 ? "each" : ""} · requested by {d.created_by_name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{d.approved_uids.length}/{d.required_approver_uids.length} admins approved</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onApprove(d.id)}
                disabled={approving === d.id || rejecting === d.id}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {approving === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve
              </button>
              <button
                onClick={() => setRejectingId(d.id)}
                disabled={approving === d.id || rejecting === d.id}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {rejecting === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejectingId && (
        <RejectReasonModal
          title="Reject disbursement"
          submitting={rejecting === rejectingId}
          onClose={() => setRejectingId(null)}
          onSubmit={async (reason) => {
            const success = await onReject(rejectingId, reason)
            if (success) setRejectingId(null)
          }}
        />
      )}
    </div>
  )
}
