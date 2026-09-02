import { useState } from "react"
import { AlertCircle, Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, Loader2, UserRound, XCircle } from "lucide-react"
import type { DisbursementRow } from "../types"
import { DEPARTMENT_OPTIONS } from "../types"

interface Props {
  disbursements: DisbursementRow[]
  loading: boolean
  error: string | null
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

const DEPT_LABEL = Object.fromEntries(DEPARTMENT_OPTIONS.map((d) => [d.value, d.label]))

const WORKFLOW_STATUS_STYLES: Record<string, string> = {
  pending_approval: "bg-amber-50 text-amber-700 border-amber-200",
  approved:          "bg-slate-50 text-slate-600 border-slate-200",
  rejected:          "bg-red-50 text-red-700 border-red-200",
}

const PAYOUT_STATUS_STYLES: Record<string, string> = {
  unclaimed:  "bg-violet-50 text-violet-700 border-violet-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  successful: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
}

function PayoutStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full font-semibold border ${PAYOUT_STATUS_STYLES[status] ?? ""}`}>
      {status === "successful" ? <CheckCircle2 className="w-2.5 h-2.5" /> : status === "failed" ? <XCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
      {status}
    </span>
  )
}

/**
 * Summarises the per-recipient `payouts` rows (which is where the
 * REAL money-movement status lives, updated by the Paystack webhook)
 * into a short "2/3 paid out" style line next to the frozen
 * "approved" workflow badge — see types.ts's DisbursementRow.payouts.
 */
function PayoutSummaryLine({ payouts }: { payouts: NonNullable<DisbursementRow["payouts"]> }) {
  if (payouts.length === 0) return <span className="text-xs text-slate-400">No payout rows found</span>
  const successful = payouts.filter((p) => p.status === "successful").length
  const failed = payouts.filter((p) => p.status === "failed").length

  if (payouts.length === 1) return <PayoutStatusBadge status={payouts[0].status} />

  return (
    <span className="text-xs font-medium text-slate-500">
      {successful}/{payouts.length} paid out{failed > 0 && <span className="text-red-500"> · {failed} failed</span>}
    </span>
  )
}

export function DisbursementListPanel({ disbursements, loading, error, page, totalPages, total, onPageChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-800">All disbursements</p>
        <p className="text-xs text-slate-400">{total} total</p>
      </div>

      {error && (
        <p className="text-sm text-red-600 flex items-center gap-1.5 px-5 py-4"><AlertCircle className="w-4 h-4" /> {error}</p>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-300" /></div>
      ) : disbursements.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">No disbursements yet</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {disbursements.map((d) => {
            const hasPayouts = d.status === "approved" && (d.payouts?.length ?? 0) > 0
            const isExpanded = expandedId === d.id
            return (
              <div key={d.id}>
                <button
                  onClick={() => hasPayouts && setExpandedId(isExpanded ? null : d.id)}
                  className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap ${hasPayouts ? "cursor-pointer hover:bg-slate-50" : "cursor-default"}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                      {d.type === "department" ? <Building2 className="w-3.5 h-3.5 text-slate-400" /> : <UserRound className="w-3.5 h-3.5 text-slate-400" />}
                      {d.reason}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {d.type === "department" ? `${DEPT_LABEL[d.department ?? ""] ?? d.department} department` : `${d.recipient_uids.length} recipient${d.recipient_uids.length > 1 ? "s" : ""}`}
                      {" · "}{d.reference} · {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <p className="text-sm font-bold text-slate-800">₦{d.amount.toLocaleString()}</p>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${WORKFLOW_STATUS_STYLES[d.status] ?? ""}`}>
                      {d.status === "pending_approval" ? <Clock className="w-3 h-3" /> : d.status === "rejected" ? <XCircle className="w-3 h-3" /> : null}
                      {d.status === "pending_approval" ? `${d.approved_uids.length}/${d.required_approver_uids.length} approved` : d.status}
                    </span>
                    {hasPayouts && d.payouts && (
                      <>
                        <PayoutSummaryLine payouts={d.payouts} />
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </>
                    )}
                  </div>
                </button>

                {isExpanded && hasPayouts && d.payouts && (
                  <div className="px-5 pb-3.5 -mt-1 space-y-1.5">
                    {d.payouts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-700 truncate">
                            {d.type === "department" ? (p.withdrawn_by_name ?? "Not yet withdrawn") : (p.recipient_admin_name ?? p.recipient_admin_uid)}
                          </p>
                          {p.status === "failed" && p.failure_reason && <p className="text-red-500 mt-0.5">{p.failure_reason}</p>}
                        </div>
                        <PayoutStatusBadge status={p.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
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
