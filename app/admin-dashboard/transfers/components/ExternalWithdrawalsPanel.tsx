import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Loader2 } from "lucide-react"
import type { ExternalTransferRow } from "../types"

interface Props {
  transfers: ExternalTransferRow[]
  loading: boolean
  error: string | null
  page: number
  onPageChange: (page: number) => void
}

export function ExternalWithdrawalsPanel({ transfers, loading, error, page, onPageChange }: Props) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <ExternalLink className="w-3.5 h-3.5" /> Withdrawals made directly on Paystack
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">Primarily initiated by bookers from the Paystack.</p>
      </div>
      {error ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-red-500">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      ) : loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : transfers.length === 0 ? (
        <p className="text-sm text-slate-400 py-8 text-center">No external withdrawals on this page</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {transfers.map((t) => (
            <div key={t.reference} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {t.beneficiaryName ?? "Unknown beneficiary"}{t.bankName ? ` · ${t.bankName}` : ""}
                </p>
                <p className="text-xs text-slate-400">
                  {t.reference}{t.createdAt ? ` · ${new Date(t.createdAt).toLocaleString()}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm font-bold text-slate-800">₦{t.amount.toLocaleString()}</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-slate-100 text-slate-500 border-slate-200">
                  {t.status}
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
        <span className="text-xs text-slate-400">Page {page}</span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={transfers.length === 0}
          className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
