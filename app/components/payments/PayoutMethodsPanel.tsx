import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle, Landmark, Loader2, Plus, Star, Trash2, X } from "lucide-react"
import type { usePayoutMethods } from "./hooks/use-payout-methods"

interface Props {
  methodsState: ReturnType<typeof usePayoutMethods>
}

export function PayoutMethodsPanel({ methodsState }: Props) {
  const { methods, loadingMethods, methodsError, banks, loadBanks, addMethod, setPrimaryMethod, deleteMethod } = methodsState

  const [showAdd, setShowAdd] = useState(false)
  const [bankCode, setBankCode] = useState("")
  const [bankQuery, setBankQuery] = useState("")
  const [showBankOptions, setShowBankOptions] = useState(false)
  const [accountNumber, setAccountNumber] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => { if (showAdd) loadBanks() }, [showAdd, loadBanks])

  const filteredBanks = bankQuery ? banks.filter((b) => b.name.toLowerCase().includes(bankQuery.toLowerCase())) : banks

  async function handleAdd() {
    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)
    try {
      const selectedBank = banks.find((b) => b.code === bankCode)
      const method = await addMethod({ accountNumber, bankCode, bankName: selectedBank?.name ?? bankQuery })
      setSaveMessage(`Saved — ${method.accountName}`)
      setBankCode(""); setBankQuery(""); setAccountNumber("")
      setTimeout(() => { setShowAdd(false); setSaveMessage(null) }, 1800)
    } catch (e: any) {
      setSaveError(e.message || "Failed to add payout method")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5" /> Your payout methods
        </p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#6b2fa5] hover:bg-violet-50 px-2 py-1 rounded-lg"
        >
          {showAdd ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAdd ? "Cancel" : "Add bank account"}
        </button>
      </div>

      {methodsError && (
        <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {methodsError}</p>
      )}

      {loadingMethods ? (
        <div className="py-4 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
      ) : methods.length === 0 && !showAdd ? (
        <p className="text-sm text-slate-400">No payout method on file yet — add one so you can withdraw payments sent to you.</p>
      ) : (
        <div className="space-y-1.5">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg px-3 py-2">
              <div>
                <p className="font-medium text-slate-800">{m.accountName}</p>
                <p className="text-xs text-slate-400">{m.bankName} · {m.accountNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                {m.primary ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600"><Star className="w-3 h-3 fill-amber-500" /> Primary</span>
                ) : (
                  <button onClick={() => setPrimaryMethod(m.id)} className="text-[11px] text-slate-400 hover:text-[#6b2fa5]">Make primary</button>
                )}
                <button onClick={() => deleteMethod(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="relative">
            <input
              value={bankQuery}
              onChange={(e) => { setBankQuery(e.target.value); setBankCode(""); setShowBankOptions(true) }}
              onFocus={() => setShowBankOptions(true)}
              onBlur={() => setTimeout(() => setShowBankOptions(false), 100)}
              placeholder="Search for your bank"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
            />
            {showBankOptions && filteredBanks.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                {filteredBanks.map((b) => (
                  <button
                    key={b.code}
                    onClick={() => { setBankCode(b.code); setBankQuery(b.name); setShowBankOptions(false) }}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-violet-50"
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="Account number (10 digits)"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-300"
          />

          {saveError && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {saveError}</p>
          )}
          {saveMessage && (
            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {saveMessage}</p>
          )}

          <button
            onClick={handleAdd}
            disabled={saving || !bankCode || accountNumber.length !== 10}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Verify & save
          </button>
        </div>
      )}
    </div>
  )
}
