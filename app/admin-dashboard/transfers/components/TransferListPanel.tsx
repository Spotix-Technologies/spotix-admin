import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, XCircle } from "lucide-react"
import { STATUS_STYLES, type TransferRow } from "../types"

interface Props {
  transfers: TransferRow[]
  loadingList: boolean
  listError: string | null
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function TransferListPanel({ transfers, loadingList, listError, page, totalPages, onPageChange }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <p className="text-xs font-semibold text-gray-500 px-5 pt-5 pb-2">All transfers</p>
      {listError ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" /> {listError}
        </div>
      ) : loadingList ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : transfers.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No transfers yet</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {transfers.map((t) => (
            <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{t.account_name} · {t.bank_name}</p>
                <p className="text-xs text-slate-400">{t.reference} · {t.reason} · {new Date(t.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">₦{t.amount_after_fee.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400">fee ₦{t.fee.toLocaleString()}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLES[t.status] ?? ""}`}>
                  {t.status === "successful" ? <CheckCircle2 className="w-3 h-3" /> : t.status === "failed" || t.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {t.status.replace("_", " ")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
