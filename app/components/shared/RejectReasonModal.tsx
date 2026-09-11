"use client"

import { useState } from "react"
import { Loader2, XCircle } from "lucide-react"

interface Props {
  title: string
  onClose: () => void
  onSubmit: (reason: string) => void
  submitting: boolean
}

/**
 * Shared by PendingApprovalsPanel (Transfers) and
 * PendingDisbursementApprovalsPanel (Disbursements) — a reason is
 * mandatory so every admin can see why a request was turned down (see
 * TransferListPanel / DisbursementListPanel).
 */
export function RejectReasonModal({ title, onClose, onSubmit, submitting }: Props) {
  const [reason, setReason] = useState("")
  const trimmed = reason.trim()

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-700">{title}</h3>
              <p className="text-sm text-red-500 mt-1">This reason will be shown to every admin.</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          <textarea
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this being rejected?"
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-red-300 resize-none"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-sm font-medium text-slate-500 hover:text-slate-700 px-3 py-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => trimmed && onSubmit(trimmed)}
              disabled={submitting || !trimmed}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
