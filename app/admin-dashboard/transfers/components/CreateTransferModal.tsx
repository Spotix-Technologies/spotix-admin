import { AlertCircle, CheckCircle, History, Loader2, ShieldCheck, Users, X } from "lucide-react"
import { previewFee } from "../types"
import { BankSearchInput } from "./BankSearchInput"
import type { useCreateTransfer } from "../hooks/use-create-transfer"

interface Props {
  form: ReturnType<typeof useCreateTransfer>
  onClose: () => void
}

export function CreateTransferModal({ form, onClose }: Props) {
  const {
    banks, bankCode, setBankCode, bankQuery, setBankQuery, showBankOptions, setShowBankOptions,
    accountNumber, setAccountNumber, reason, setReason, amount, setAmount,
    ottaAtRequest, setOttaAtRequest,
    resolution, resolving, resolveError,
    creating, createError, createMessage,
    submitTransfer,
  } = form

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Create Transfer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <BankSearchInput
          banks={banks}
          bankCode={bankCode}
          bankQuery={bankQuery}
          showOptions={showBankOptions}
          onQueryChange={(v) => { setBankQuery(v); setBankCode(""); setShowBankOptions(true) }}
          onSelect={(b) => { setBankCode(b.code); setBankQuery(b.name); setShowBankOptions(false) }}
          onFocus={() => setShowBankOptions(true)}
          onBlur={() => setTimeout(() => setShowBankOptions(false), 100)}
        />

        <div>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Account number (10 digits)"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
          />
          {resolving && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Resolving account…</p>
          )}
          {resolveError && !resolving && (
            <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {resolveError}</p>
          )}
          {resolution && !resolving && (
            <div className="mt-1 space-y-0.5">
              <p className="text-[11px] text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {resolution.accountName}</p>
              {resolution.transferCount > 0 && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <History className="w-3 h-3" /> You've sent a total of ₦{resolution.totalSent.toLocaleString()} to this beneficiary ({resolution.transferCount} prior transfer{resolution.transferCount === 1 ? "" : "s"})
                </p>
              )}
            </div>
          )}
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for transfer"
          rows={2}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300 resize-none"
        />

        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (₦)"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
        />
        {Number(amount) > 0 && (
          <p className="text-xs text-slate-500">
            Fee: ₦{previewFee(Number(amount)).toLocaleString()} · You will send: ₦{(Number(amount) - previewFee(Number(amount))).toLocaleString()}
          </p>
        )}

        <div>
          <input
            value={ottaAtRequest}
            onChange={(e) => setOttaAtRequest(e.target.value)}
            placeholder="OTTA key (optional — covers one admin's approval)"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
          />
          <p className="text-[11px] text-gray-400 mt-1">If another admin gave you their OTTA key, enter it here to auto-approve on their behalf.</p>
        </div>

        <p className="text-[11px] text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> Every full admin must approve before this transfer executes.</p>

        {createError && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {createError}
          </div>
        )}
        {createMessage && (
          <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> {createMessage}
          </div>
        )}

        <button
          onClick={submitTransfer}
          disabled={creating || !bankCode || accountNumber.length !== 10 || !reason || !amount}
          className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2.5 rounded-lg disabled:opacity-50"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Submit for approval
        </button>
      </div>
    </div>
  )
}
