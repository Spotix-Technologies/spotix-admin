import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, XCircle } from "lucide-react"
import { STATUS_STYLES, type RequisitionRow } from "@/components/requisition/types"

interface Props {
  requisitions: RequisitionRow[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function RequisitionListPanel({ requisitions, loading, error, page, totalPages, total, onPageChange }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">All requisitions</p>
        <p className="text-xs text-slate-400">{total} total</p>
      </div>

      {error ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : requisitions.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No requisitions yet</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {requisitions.map((r) => (
            <div key={r.id} className="px-5 py-3.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.reason}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.reference} · requested by {r.requested_by_name} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <p className="text-sm font-bold text-slate-800">₦{r.amount.toLocaleString()}</p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLES[r.status] ?? ""}`}>
                    {r.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> : r.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {r.status === "pending_approval" ? `${r.approved_uids.length}/${r.required_approver_uids.length} approved` : r.status}
                  </span>
                </div>
              </div>
              {r.status === "rejected" && r.rejection_reason && (
                <p className="text-xs text-red-500 mt-1.5">Rejected by {r.rejected_by_name ?? "an admin"}: {r.rejection_reason}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="text-xs text-slate-400">Page {page} of {totalPages}</p>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
