import { useState } from "react"
import { AlertCircle, CheckCircle, Clock, KeySquare, Loader2 } from "lucide-react"
import type { TransferRow } from "../types"

interface Props {
  pending: TransferRow[]
  pendingError: string | null
  approving: string | null
  onApprove: (transferId: string, ottaKey?: string) => void
}

export function PendingApprovalsPanel({ pending, pendingError, approving, onApprove }: Props) {
  const [approveOttaFor, setApproveOttaFor] = useState<string | null>(null)
  const [approveOttaKey, setApproveOttaKey] = useState("")

  return (
    <>
      {pendingError && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {pendingError}
        </div>
      )}
      {pending.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-3">
            <Clock className="w-3.5 h-3.5" /> Pending your approval ({pending.length})
          </p>
          <div className="space-y-2">
            {pending.map((t) => (
              <div key={t.id} className="border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">₦{t.amount.toLocaleString()} → {t.account_name}</p>
                    <p className="text-xs text-slate-500">{t.reason} · requested by {t.requested_by_name}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {t.approved_uids.length}/{t.required_approver_uids.length} approved
                  </span>
                </div>
                {approveOttaFor === t.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={approveOttaKey}
                      onChange={(e) => setApproveOttaKey(e.target.value)}
                      placeholder="Enter OTTA key"
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-300"
                    />
                    <button
                      onClick={() => { onApprove(t.id, approveOttaKey); setApproveOttaKey("") }}
                      disabled={approving === t.id || !approveOttaKey}
                      className="text-xs font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Submit
                    </button>
                    <button onClick={() => setApproveOttaFor(null)} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApprove(t.id)}
                      disabled={approving === t.id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {approving === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => setApproveOttaFor(t.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg"
                    >
                      <KeySquare className="w-3 h-3" /> Approve with OTTA key
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
