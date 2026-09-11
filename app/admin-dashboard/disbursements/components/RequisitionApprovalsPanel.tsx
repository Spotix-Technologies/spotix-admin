import { useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, UserRound, XCircle } from "lucide-react"
import type { RequisitionRow } from "@/components/requisition/types"
import { RejectReasonModal } from "@/components/shared/RejectReasonModal"

interface Props {
  pending: RequisitionRow[]
  loading: boolean
  approving: string | null
  rejecting: string | null
  approveError: string | null
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => Promise<boolean>
}

export function RequisitionApprovalsPanel({ pending, loading, approving, rejecting, approveError, onApprove, onReject }: Props) {
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  if (loading) {
    return <div className="py-6 flex justify-center bg-white border border-slate-200 rounded-2xl"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
  }
  if (pending.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-10 bg-white border border-slate-200 rounded-2xl">No requisitions awaiting your approval</p>
  }

  return (
    <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
        <p className="text-sm font-bold text-amber-800">Awaiting your approval ({pending.length})</p>
      </div>
      {approveError && (
        <p className="text-sm text-red-600 flex items-center gap-1.5 px-5 pt-3"><AlertCircle className="w-4 h-4" /> {approveError}</p>
      )}
      <div className="divide-y divide-slate-100">
        {pending.map((r) => (
          <div key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <UserRound className="w-3.5 h-3.5 text-slate-400" /> {r.reason}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                ₦{r.amount.toLocaleString()} · requested by {r.requested_by_name}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{r.approved_uids.length}/{r.required_approver_uids.length} admins approved</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onApprove(r.id)}
                disabled={approving === r.id || rejecting === r.id}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {approving === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                Approve
              </button>
              <button
                onClick={() => setRejectingId(r.id)}
                disabled={approving === r.id || rejecting === r.id}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                {rejecting === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejectingId && (
        <RejectReasonModal
          title="Reject requisition"
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
