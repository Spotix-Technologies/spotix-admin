"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, CheckCircle2, Clock, HandCoins, Loader2, Plus, Wallet, X, XCircle } from "lucide-react"
import { useMyRequisitions } from "./hooks/use-my-requisitions"
import { useCreateRequisition } from "./hooks/use-create-requisition"
import { STATUS_STYLES, type RequisitionRow } from "./types"

/**
 * app/components/requisition/requisition-client.tsx
 *
 * Shared "Requisition" page rendered on every role dashboard (Admin,
 * Exec Assistant, Customer Support, Marketing, IT — see each role's
 * app/<role>-dashboard/requisition/page.tsx). Lets a staff member
 * request funds for themselves; every full admin must approve (see
 * the admin Disbursements page's Requisitions tab) before the funds
 * show up as withdrawable on this same admin's Payments tab.
 */
export default function RequisitionClient() {
  const { requisitions, loading, error, loadRequisitions } = useMyRequisitions()
  const { creating, createError, createMessage, createRequisition, resetCreateState } = useCreateRequisition(loadRequisitions)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => { loadRequisitions() }, [loadRequisitions])

  const submit = async () => {
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !reason.trim()) return
    const success = await createRequisition({ amount: parsedAmount, reason: reason.trim() })
    if (success) {
      setAmount("")
      setReason("")
      setShowForm(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <HandCoins className="w-5 h-5 text-[#6b2fa5]" /> Requisition
          </h1>
          <p className="text-sm text-slate-400 mt-1">Request funds — every admin must approve before you can claim it.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetCreateState(); setShowForm(true) }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" /> New request
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">New fund request</p>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {createError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {createError}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-500">Amount (₦)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What is this for?"
              rows={3}
              className="mt-1 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={creating || !amount || !reason.trim()}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Submit request
            </button>
          </div>
        </div>
      )}

      {createMessage && (
        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> {createMessage}
        </div>
      )}

      <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
        <Wallet className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
        Once a request is fully approved, it moves to your Payments tab where you can withdraw it to your bank account.
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <p className="text-xs font-semibold text-gray-500 px-5 pt-5 pb-2">Your requests</p>
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
            {requisitions.map((r) => <RequisitionListItem key={r.id} r={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function RequisitionListItem({ r }: { r: RequisitionRow }) {
  return (
    <div className="px-5 py-3.5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{r.reason}</p>
          <p className="text-xs text-slate-400 mt-0.5">{r.reference} · {new Date(r.created_at).toLocaleString()}</p>
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
      {r.status === "approved" && (
        <p className="text-xs text-emerald-600 mt-1.5">Approved — claim it from your Payments tab.</p>
      )}
    </div>
  )
}
