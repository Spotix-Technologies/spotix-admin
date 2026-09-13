"use client"

/**
 * app/components/elections/election-settings-panel.tsx
 *
 * Platform-wide election fee configuration — lives inside each
 * dashboard's Election Management page (see
 * admin-dashboard/election-management and
 * customer-support-dashboard/election-management).
 *
 * Talks to /api/v1/{apiBase}/settings, where apiBase is
 * "admin-elections" for the admin dashboard or "support-elections" for
 * the customer-support dashboard — each dashboard has its own separate
 * API route file (see those routes' header comments for why), this
 * component just gets told which base to call.
 *
 * The platform fee (percent + flat amount) and the Paystack-fee-payer
 * toggle are admin-only to EDIT (canEdit=false renders everything
 * read-only for customer-support, same pattern as PollLimitsPanel's
 * canEditLimits).
 */

import { useState, useEffect, useCallback } from "react"
import { Percent, Banknote, Wallet, Loader2, Save, ShieldAlert } from "lucide-react"

type PaystackFeePayer = "voter" | "organizer" | "none"

interface Settings {
  platformFeePercent: number
  platformFeeFlat: number
  paystackFeePayer: PaystackFeePayer
  updatedAt: string | null
  updatedBy: string | null
}

const PAYER_OPTIONS: { value: PaystackFeePayer; label: string; hint: string }[] = [
  { value: "voter", label: "Candidate", hint: "Added on top of the candidate's total at checkout (default)" },
  { value: "organizer", label: "Organizer", hint: "Deducted from the office's payable net instead" },
  { value: "none", label: "Remove entirely", hint: "Absorbed by Spotix — charged to neither side" },
]

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">{children}</div>
}

function CardHead({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-2.5">
        <Icon className="w-4 h-4 text-[#6b2fa5]" />
        <div>
          <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
          <p className="text-xs mt-0.5 text-gray-500">{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

export default function ElectionSettingsPanel({
  apiBase,
  canEdit,
}: {
  apiBase: "admin-elections" | "support-elections"
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
      const res = await fetch(`/api/v1/${apiBase}/settings`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load settings")
      setSettings(data.settings)
      setPercentInput(String(data.settings.platformFeePercent))
      setFlatInput(String(data.settings.platformFeeFlat))
      setPayerInput(data.settings.paystackFeePayer)
    } catch (e: any) {
      setError(e.message || "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [apiBase])

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
      const res = await fetch(`/api/v1/${apiBase}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformFeePercent: percent, platformFeeFlat: flat, paystackFeePayer: payerInput }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save settings")
      setSettings(data.settings)
      setMessage("Platform fee settings updated")
    } catch (e: any) {
      setError(e.message || "Failed to save settings")
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
    <Card>
      <CardHead
        icon={Percent}
        title="Election Platform Fee"
        subtitle={
          canEdit
            ? "Applies to every paid election form across the platform"
            : "View only — configuring this is an admin-only capability"
        }
      />

      <div className="p-5 space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {!loading && message && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{message}</div>
        )}

        {!loading && settings && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
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
                    className="w-full text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                  <Banknote className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </label>
            </div>

            <p className="text-xs text-gray-500">
              Example: a ₦1,000 form fee currently costs the candidate an extra{" "}
              <span className="font-medium text-gray-700">
                ₦{Math.round(1000 * (Number(percentInput || 0) / 100) + Number(flatInput || 0)).toLocaleString()}
              </span>{" "}
              platform fee, before Paystack's own charge.
            </p>

            <div>
              <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" /> Who pays Paystack's processing fee?
              </span>
              <div className="mt-2 space-y-2">
                {PAYER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      payerInput === opt.value ? "border-[#6b2fa5] bg-[#6b2fa5]/5" : "border-gray-200"
                    } ${canEdit ? "cursor-pointer" : "cursor-default opacity-90"}`}
                  >
                    <input
                      type="radio"
                      name="paystackFeePayer"
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
              <p className="text-xs text-gray-400">
                Last updated {new Date(settings.updatedAt).toLocaleString()}
                {settings.updatedBy ? ` by ${settings.updatedBy}` : ""}
              </p>
            )}

            {canEdit && (
              <div className="flex justify-end pt-2">
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
    </Card>
  )
}
