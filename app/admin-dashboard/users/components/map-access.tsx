"use client"

/**
 * app/admin-dashboard/users/components/map-access.tsx
 *
 * Lets an admin, per organizer:
 *   - force a map provider on/off (overriding the env-wide IS_*_AVAILABLE
 *     kill switch for just this user)
 *   - raise (or lower) that user's daily call cap for a provider, which
 *     replaces the env-wide MAX_*_MAPS_CALL default for them
 *
 * Deliberately does NOT show today's usage/consumption numbers — that's
 * a separate page still to be built. This only shows/edits the
 * *configured* access + limit, not how much of it has been used.
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, MapPin } from "lucide-react"

const PROVIDERS = [
  { key: "google", label: "Google Maps" },
  { key: "mapbox", label: "Mapbox" },
  { key: "geoapify", label: "Geoapify" },
] as const

type ProviderKey = (typeof PROVIDERS)[number]["key"]

interface ProviderOverrideForm {
  /** "inherit" = no override (use the env default), "on" = force enabled, "off" = force disabled */
  access: "inherit" | "on" | "off"
  /** empty string = no override (use the env default daily cap) */
  dailyLimit: string
}

type FormState = Record<ProviderKey, ProviderOverrideForm>

const EMPTY_FORM: FormState = {
  google: { access: "inherit", dailyLimit: "" },
  mapbox: { access: "inherit", dailyLimit: "" },
  geoapify: { access: "inherit", dailyLimit: "" },
}

export function MapAccessComponent({ email, userId }: { email: string; userId: string }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSavedMessage(null)
    try {
      const res = await fetch(`/api/v1/users/${encodeURIComponent(email)}/map-access`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load map access")
        return
      }
      const next: FormState = { ...EMPTY_FORM }
      for (const { key } of PROVIDERS) {
        const override = data.overrides?.[key]
        next[key] = {
          access: override?.enabled === true ? "on" : override?.enabled === false ? "off" : "inherit",
          dailyLimit: override?.dailyLimit !== undefined && override?.dailyLimit !== null ? String(override.dailyLimit) : "",
        }
      }
      setForm(next)
    } catch (err) {
      console.error("[v0] Map access load error:", err)
      setError("Failed to load map access")
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSavedMessage(null)
    try {
      const body: Record<string, { enabled?: boolean; dailyLimit?: number }> = {}
      for (const { key } of PROVIDERS) {
        const entry = form[key]
        body[key] = {
          enabled: entry.access === "inherit" ? undefined : entry.access === "on",
          dailyLimit: entry.dailyLimit.trim() === "" ? undefined : Number(entry.dailyLimit),
        }
      }

      const res = await fetch(`/api/v1/users/${encodeURIComponent(email)}/map-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save map access")
        return
      }
      setSavedMessage("Saved")
    } catch (err) {
      console.error("[v0] Map access save error:", err)
      setError("Failed to save map access")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-slate-500" />
        <h2 className="text-lg font-semibold text-slate-900">Map Access</h2>
      </div>

      <div className="p-6 space-y-6">
        <p className="text-sm text-slate-500">
          Override this organizer's access and daily call cap per map provider. Leaving a field on
          "Use default" keeps it tied to the platform-wide setting for that provider. Setting a daily
          limit here replaces the platform-wide cap for this user only.
        </p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="space-y-5">
          {PROVIDERS.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:items-center border border-slate-200 rounded-lg p-4">
              <div className="font-medium text-slate-900 text-sm">{label}</div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Access</label>
                <select
                  value={form[key].access}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: { ...prev[key], access: e.target.value as ProviderOverrideForm["access"] } }))
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/40 focus:border-[#6b2fa5]"
                >
                  <option value="inherit">Use default</option>
                  <option value="on">Force enabled</option>
                  <option value="off">Force disabled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Daily limit override</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Use default"
                  value={form[key].dailyLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: { ...prev[key], dailyLimit: e.target.value } }))
                  }
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/40 focus:border-[#6b2fa5]"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#6b2fa5] text-white rounded-lg font-medium text-sm hover:bg-[#5a2589] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
          {savedMessage && <span className="text-sm text-emerald-600">{savedMessage}</span>}
        </div>
      </div>
    </div>
  )
}
