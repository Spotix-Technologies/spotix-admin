import { useState } from "react"
import { Ban, Copy, KeySquare, Loader2 } from "lucide-react"
import type { OttaKey } from "../types"

interface Props {
  ottaKeys: OttaKey[]
  generatingOtta: boolean
  newOttaKey: { plainKey: string; expiresAt: string } | null
  onDismissNewKey: () => void
  onGenerate: (maxAmount: string, durationMinutes: string) => Promise<boolean>
  onRevoke: (keyId: string) => void
}

export function OttaKeysPanel({ ottaKeys, generatingOtta, newOttaKey, onDismissNewKey, onGenerate, onRevoke }: Props) {
  const [showGenerate, setShowGenerate] = useState(false)
  const [maxAmount, setMaxAmount] = useState("")
  const [duration, setDuration] = useState("120")

  async function handleGenerate() {
    const okd = await onGenerate(maxAmount, duration)
    if (okd) { setMaxAmount(""); setDuration("120") }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
          <KeySquare className="w-3.5 h-3.5" /> My OTTA keys
        </p>
        <button
          onClick={() => setShowGenerate((v) => !v)}
          className="text-xs font-semibold text-violet-600 hover:bg-violet-50 px-2 py-1 rounded"
        >
          {showGenerate ? "Cancel" : "Generate key"}
        </button>
      </div>

      {showGenerate && (
        <div className="bg-slate-50 rounded-xl p-3 mb-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input
              type="number"
              min={1}
              placeholder="Max amount (₦)"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="flex-1 min-w-[140px] text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-300"
            />
            <input
              type="number"
              min={1}
              max={120}
              placeholder="Duration (min, max 120)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="flex-1 min-w-[140px] text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-violet-300"
            />
            <button
              onClick={handleGenerate}
              disabled={generatingOtta || !maxAmount || !duration}
              className="text-sm font-semibold text-white bg-[#6b2fa5] hover:bg-[#5a2689] px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {generatingOtta ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate"}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">Give this key to another admin to approve a transfer or Vault sign-off on your behalf. Max 120 minutes.</p>
        </div>
      )}

      {newOttaKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-mono font-bold text-emerald-800">{newOttaKey.plainKey}</p>
            <p className="text-[11px] text-emerald-600">Copy this now — it won't be shown again. Expires {new Date(newOttaKey.expiresAt).toLocaleTimeString()}.</p>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(newOttaKey.plainKey); onDismissNewKey() }}
            className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-lg"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      )}

      {ottaKeys.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center">No OTTA keys generated yet</p>
      ) : (
        <div className="space-y-1.5">
          {ottaKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 text-xs bg-slate-50 rounded-lg px-3 py-2">
              <div>
                <span className="font-semibold text-slate-700">₦{k.maxAmount.toLocaleString()} max</span>
                <span className="text-slate-400"> · {k.durationMinutes}min · {new Date(k.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full font-semibold border ${
                  k.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : k.status === "used" ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                  {k.status}
                </span>
                {k.status === "active" && (
                  <button onClick={() => onRevoke(k.id)} title="Revoke" className="p-1 text-slate-400 hover:text-red-600">
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
