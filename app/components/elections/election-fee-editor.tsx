"use client"

/**
 * app/components/elections/election-fee-editor.tsx
 *
 * Inline, per-election platform fee editor — expands underneath one
 * election's row in ElectionsListPanel (replaces the old
 * election-settings-panel.tsx, which configured a single platform-wide
 * fee; fees are now configured PER ELECTION — see
 * /supabase/election-per-election-fees-schema.sql).
 *
 * Talks to /api/v1/{apiBase}/{electionId}/settings, where apiBase is
 * "admin-elections" for the admin dashboard or "support-elections" for
 * the customer-support dashboard.
 *
 * canEdit=false (customer-support) renders every control disabled and
 * hides Save/Reset — same pattern the old global panel used.
 */

import { useState, useEffect, useCallback } from "react"
import { Percent, Banknote, Wallet, Loader2, Save, ShieldAlert, RotateCcw } from "lucide-react"

type PaystackFeePayer = "voter" | "organizer" | "none"

interface Settings {
  platformFeePercent: number
  platformFeeFlat: number
  paystackFeePayer: PaystackFeePayer
  isCustomized: boolean
  updatedAt: string | null
  updatedBy: string | null
}

const PAYER_OPTIONS: { value: PaystackFeePayer; label: string; hint: string }[] = [
  { value: "voter", label: "Candidate", hint: "Added on top of the candidate's total at checkout (default)" },
  { value: "organizer", label: "Organizer", hint: "Deducted from the office's payable net instead" },
  { value: "none", label: "Remove entirely", hint: "Absorbed by Spotix — charged to neither side" },
]

export default function ElectionFeeEditor({
  apiBase,
  electionId,
  canEdit,
}: {
  apiBase: "admin-elections" | "support-elections"
  electionId: string
  canEdit: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [settings, setSettings] = useState<Settings | null>(null)
  const [percentInput, setPercentInput] = useState("")
  const [flatInput, setFlatInput] = useState("")
  const [payerInput, setPayerInput] = useState<PaystackFeePayer>("voter")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/${apiBase}/${electionId}/settings`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load fee settings")
      setSettings(data.settings)
      setPercentInput(String(data.settings.platformFeePercent))
      setFlatInput(String(data.settings.platformFeeFlat))
      setPayerInput(data.settings.paystackFeePayer)
    } catch (e: any) {
      setError(e.message || "Failed to load fee settings")
    } finally {
      setLoading(false)
    }
  }, [apiBase, electionId])

  useEffect(() => {
    load()
  }, [load])

  async function save() {
    if (!canEdit) return
    const percent = Number(percentInput)
    const flat = Number(flatInput)
    if (!Number.isFinite(percent) || percent < 0) {
      setError("Platform fee percentage must be a non-negative number")
      return
    }
    if (!Number.isFinite(flat) || flat < 0) {
      setError("Platform fee flat amount must be a non-negative number")
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/v1/${apiBase}/${electionId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeePercent: percent, platformFeeFlat: flat, paystackFeePayer: payerInput }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save fee settings")
      setSettings(data.settings)
      setMessage("Fee settings updated for this election")
    } catch (e: any) {
      setError(e.message || "Failed to save fee settings")
    } finally {
      setSaving(false)
    }
  }

  async function resetToDefault() {
    if (!canEdit) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/v1/${apiBase}/${electionId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToDefault: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to reset fee settings")
      setSettings(data.settings)
      setPercentInput(String(data.settings.platformFeePercent))
      setFlatInput(String(data.settings.platformFeeFlat))
      setPayerInput(data.settings.paystackFeePayer)
      setMessage("Reset to the platform default for this election")
    } catch (e: any) {
      setError(e.message || "Failed to reset fee settings")
    } finally {
      setSaving(false)
    }
  }

  const isDirty =
    settings != null &&
    (percentInput !== String(settings.platformFeePercent) ||
      flatInput !== String(settings.platformFeeFlat) ||
      payerInput !== settings.paystackFeePayer)

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 p-4">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading fee settings…
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mb-3">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {!loading && message && (
        <div className="p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-3">{message}</div>
      )}

      {!loading && settings && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">
              {canEdit ? "This election's platform fee" : "This election's platform fee (view only)"}
            </p>
            {!settings.isCustomized && <span className="text-xs text-gray-400">Using platform default</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-500">Platform fee percentage</span>
              <div className="mt-1 relative">
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  disabled={!canEdit}
                  value={percentInput}
                  onChange={(e) => setPercentInput(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
                <Percent className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-500">Platform flat fee (₦)</span>
              <div className="mt-1 relative">
                <input
                  type="number"
                  min={0}
                  step="1"
                  disabled={!canEdit}
                  value={flatInput}
                  onChange={(e) => setFlatInput(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />
                <Banknote className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </label>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Example: a ₦1,000 form fee for this election currently costs the candidate an extra{" "}
            <span className="font-medium text-gray-700">
              ₦{Math.round(1000 * (Number(percentInput || 0) / 100) + Number(flatInput || 0)).toLocaleString()}
            </span>{" "}
            platform fee, before Paystack's own charge.
          </p>

          <div className="mt-3">
            <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Who pays Paystack's processing fee?
            </span>
            <div className="mt-2 space-y-1.5">
              {PAYER_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border bg-white transition-colors ${
                    payerInput === opt.value ? "border-[#6b2fa5] bg-[#6b2fa5]/5" : "border-gray-200"
                  } ${canEdit ? "cursor-pointer" : "cursor-default opacity-90"}`}
                >
                  <input
                    type="radio"
                    name={`paystackFeePayer-${electionId}`}
                    className="mt-0.5 accent-[#6b2fa5]"
                    disabled={!canEdit}
                    checked={payerInput === opt.value}
                    onChange={() => setPayerInput(opt.value)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">{opt.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {settings.updatedAt && (
            <p className="text-xs text-gray-400 mt-3">
              Last updated {new Date(settings.updatedAt).toLocaleString()}
              {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}
            </p>
          )}

          {canEdit && (
            <div className="flex justify-end gap-2 pt-3">
              {settings.isCustomized && (
                <button
                  type="button"
                  onClick={resetToDefault}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg px-3.5 py-2 border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to default
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving || !isDirty}
                className="inline-flex items-center gap-2 text-sm font-medium rounded-lg px-4 py-2 bg-[#6b2fa5] text-white hover:bg-[#5a259a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
