"use client"

/**
 * app/customer-support-dashboard/event-data/addons-tab.tsx
 *
 * Addons — per-event extras (wristbands, lanyards, whatever the organizer
 * asked for) billed per ticket at checkout, or absorbed by the organizer
 * instead — see coveredBy on each addon. Backed by
 * /api/v1/support-event-data/addons — the admin dashboard has its own
 * parallel version at /api/v1/event-data/addons; see that route's header
 * comment for why these stay two separate files.
 *
 * Creating and deactivating addons is gated by canCreate, which the
 * parent page sets from role (customer-support / exec-assistant) —
 * everyone with the Event Data tab can still view the list.
 */

import { useState, useEffect, useCallback } from "react"
import { Loader2, AlertCircle, Package, Plus, X, User, CheckCircle2, Ban, RotateCcw, Users2 } from "lucide-react"

interface Addon {
  id: string
  name: string
  pricePerTicket: number
  coveredBy: "attendee" | "organizer"
  active: boolean
  addedBy: string
  addedByRole: string | null
  createdAt: string | null
}

export default function AddonsTab({ eventId, canCreate = false }: { eventId: string; canCreate?: boolean }) {
  const [addons, setAddons] = useState<Addon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const [createModal, setCreateModal] = useState(false)
  const [nameInput, setNameInput] = useState("")
  const [priceInput, setPriceInput] = useState("")
  const [coveredByInput, setCoveredByInput] = useState<"attendee" | "organizer">("attendee")
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/support-event-data/addons?eventId=${eventId}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to load addons")
      setAddons(data.addons || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load addons")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setNameInput("")
    setPriceInput("")
    setCoveredByInput("attendee")
  }

  const handleCreate = async () => {
    const price = Number(priceInput)
    if (!nameInput.trim() || !Number.isFinite(price) || price < 0) return
    setCreating(true)
    try {
      const res = await fetch("/api/v1/support-event-data/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, name: nameInput.trim(), pricePerTicket: price, coveredBy: coveredByInput }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to create addon")
      setAddons((prev) => [data.addon, ...prev])
      setCreateModal(false)
      resetForm()
      showToast("Addon created", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to create addon", "error")
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (addon: Addon) => {
    setTogglingId(addon.id)
    try {
      const res = await fetch("/api/v1/support-event-data/addons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, addonId: addon.id, action: "toggleActive" }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update addon")
      setAddons((prev) => prev.map((a) => (a.id === addon.id ? { ...a, active: data.active } : a)))
      showToast(data.active ? "Addon activated" : "Addon deactivated", "success")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update addon", "error")
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#6b2fa5]" />
            Addons
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Extras the organizer asked Spotix to add — billed per ticket at checkout, or covered by the organizer.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] transition-colors"
          >
            <Plus className="w-4 h-4" /> New Addon
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!error && addons.length === 0 && (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl">
          <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No addons on this event yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {addons.map((addon) => (
          <div
            key={addon.id}
            className={`rounded-xl border p-4 ${addon.active ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50 opacity-70"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800">{addon.name}</p>
                  {!addon.active && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">INACTIVE</span>
                  )}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${addon.coveredBy === "organizer" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    <Users2 className="w-2.5 h-2.5" />
                    {addon.coveredBy === "organizer" ? "Organizer pays" : "Attendee pays"}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">₦{addon.pricePerTicket.toLocaleString()} per ticket</p>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Added by {addon.addedBy}
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={() => handleToggleActive(addon)}
                  disabled={togglingId === addon.id}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                    addon.active
                      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {togglingId === addon.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : addon.active ? (
                    <><Ban className="w-3.5 h-3.5" /> Deactivate</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5" /> Reactivate</>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {createModal && (
        <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center p-4" onClick={() => setCreateModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-900">New Addon</h4>
              <button onClick={() => setCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Addon name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Wristband"
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Price per ticket (₦)</label>
              <input
                type="number"
                min={0}
                step="1"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Who pays for this?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCoveredByInput("attendee")}
                  className={`text-xs font-semibold py-2.5 rounded-lg border transition-colors ${coveredByInput === "attendee" ? "border-[#6b2fa5] bg-[#6b2fa5]/5 text-[#6b2fa5]" : "border-slate-200 text-slate-500"}`}
                >
                  Attendee
                </button>
                <button
                  type="button"
                  onClick={() => setCoveredByInput("organizer")}
                  className={`text-xs font-semibold py-2.5 rounded-lg border transition-colors ${coveredByInput === "organizer" ? "border-[#6b2fa5] bg-[#6b2fa5]/5 text-[#6b2fa5]" : "border-slate-200 text-slate-500"}`}
                >
                  Organizer
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {coveredByInput === "attendee"
                  ? "Added to checkout price, per ticket."
                  : "Deducted from the organizer's payout balance per ticket sold, instead. Never shown at checkout."}
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating || !nameInput.trim() || priceInput.trim() === ""}
              className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Addon
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
