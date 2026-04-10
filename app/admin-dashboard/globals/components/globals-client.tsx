"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Trash2, Plus, AlertTriangle, X, Settings, Calendar, Clock, ShieldAlert, Banknote } from "lucide-react"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface RestrictedDate {
  date: string
  isRestricted: boolean
  reason?: string
}

interface RestrictedDay {
  day: string
  isRestricted: boolean
  reason?: string
}

interface GlobalSettings {
  isPayoutAllowed: boolean
  isPayoutNotAllowedReason?: string
  isMaintenance: boolean
  maintenanceReason?: string
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/* ─────────────────────────────────────────────
   MODAL
   Rendered via fixed overlay. Lives at the
   root of the component tree, completely
   outside the scrollable page content.
───────────────────────────────────────────── */
function Modal({
  open,
  onClose,
  title,
  description,
  danger,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: string
  danger?: boolean
  children: React.ReactNode
  footer: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ isolation: "isolate" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className={`flex items-start justify-between gap-3 p-5 border-b ${danger ? "border-red-100 bg-red-50/50" : "border-gray-100"}`}>
          <div>
            <h2 className={`font-semibold text-base ${danger ? "text-red-700" : "text-gray-900"}`}>
              {title}
            </h2>
            {description && (
              <p className="text-sm text-gray-500 mt-1 leading-snug">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 mt-0.5 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 px-5 pb-5">{footer}</div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   TOGGLE SWITCH
───────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? "bg-[#6b2fa5]" : "bg-gray-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </button>
  )
}

/* ─────────────────────────────────────────────
   BUTTON
───────────────────────────────────────────── */
function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "danger" | "outline"
  size?: "sm" | "md"
  disabled?: boolean
  className?: string
}) {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
  const sizes = { sm: "text-xs px-3 py-1.5 gap-1.5", md: "text-sm px-4 py-2 gap-2" }
  const variants = {
    primary: "bg-[#6b2fa5] text-white hover:bg-[#5a259a] focus:ring-[#6b2fa5]",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-400",
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────
   CARD
───────────────────────────────────────────── */
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

function CardHead({
  icon: Icon,
  title,
  subtitle,
  danger,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
  danger?: boolean
}) {
  return (
    <div className={`px-5 py-4 border-b ${danger ? "border-red-200 bg-red-50" : "border-gray-100 bg-gray-50/50"}`}>
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-[#6b2fa5]"}`} />
        <div>
          <h3 className={`font-semibold text-sm ${danger ? "text-red-800" : "text-gray-900"}`}>{title}</h3>
          <p className={`text-xs mt-0.5 ${danger ? "text-red-600" : "text-gray-500"}`}>{subtitle}</p>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export function GlobalsClient() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    isPayoutAllowed: true,
    isMaintenance: false,
  })
  const [restrictedDates, setRestrictedDates] = useState<RestrictedDate[]>([])
  const [restrictedDays, setRestrictedDays] = useState<RestrictedDay[]>([])
  const [newDate, setNewDate] = useState("")
  const [newDateReason, setNewDateReason] = useState("")
  const [dayReasons, setDayReasons] = useState<Record<string, string>>({})
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [maintenanceReason, setMaintenanceReason] = useState("")
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [payoutReason, setPayoutReason] = useState("")
  const [saving, setSaving] = useState<string | null>(null)

  const fetchGlobalSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/v1/admin/global")
      if (!res.ok) throw new Error("Failed to fetch settings")
      const data = await res.json()
      setGlobalSettings(data.globalSettings || { isPayoutAllowed: true, isMaintenance: false })
      setRestrictedDates(data.restrictedDates || [])
      setRestrictedDays(data.restrictedDays || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGlobalSettings()
  }, [fetchGlobalSettings])

  const handleAddDate = async () => {
    if (!newDate || !newDateReason) return
    setSaving("date")
    try {
      const res = await fetch("/api/v1/admin/global/restricted-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, isRestricted: true, reason: newDateReason }),
      })
      if (!res.ok) throw new Error("Failed to add restricted date")
      setNewDate("")
      setNewDateReason("")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(null)
    }
  }

  const handleDeleteDate = async (date: string) => {
    try {
      const res = await fetch(`/api/v1/admin/global/restricted-date/${date}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete restricted date")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleDayToggle = async (day: string, isRestricted: boolean) => {
    if (isRestricted && !dayReasons[day]) {
      setError(`Enter a reason for restricting ${day} first`)
      return
    }
    setSaving(day)
    try {
      const res = await fetch("/api/v1/admin/global/restricted-day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, isRestricted, reason: isRestricted ? dayReasons[day] : "" }),
      })
      if (!res.ok) throw new Error("Failed to update restricted day")
      if (!isRestricted) {
        setDayReasons((prev) => {
          const u = { ...prev }
          delete u[day]
          return u
        })
      }
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(null)
    }
  }

  const handleMaintenanceToggle = async (enabled: boolean) => {
    if (enabled) {
      setShowMaintenanceModal(true)
      return
    }
    setSaving("maintenance")
    try {
      const res = await fetch("/api/v1/admin/global/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMaintenance: false }),
      })
      if (!res.ok) throw new Error("Failed to disable maintenance")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(null)
    }
  }

  const confirmMaintenance = async () => {
    setSaving("maintenance")
    try {
      const res = await fetch("/api/v1/admin/global/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isMaintenance: true, maintenanceReason }),
      })
      if (!res.ok) throw new Error("Failed to enable maintenance")
      setShowMaintenanceModal(false)
      setMaintenanceReason("")
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(null)
    }
  }

  const handlePayoutToggle = (allowed: boolean) => {
    if (!allowed) {
      setShowPayoutModal(true)
      return
    }
    submitPayoutChange(true, "")
  }

  const submitPayoutChange = async (allowed: boolean, reason: string) => {
    setSaving("payout")
    try {
      const res = await fetch("/api/v1/admin/global/payout-allow", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPayoutAllowed: allowed,
          isPayoutNotAllowedReason: allowed ? "" : reason,
        }),
      })
      if (!res.ok) throw new Error("Failed to update payout settings")
      setPayoutReason("")
      setShowPayoutModal(false)
      await fetchGlobalSettings()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#6b2fa5] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Loading settings…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* ─── PAGE CONTENT ─── */}
      <div className="space-y-5 p-4 md:p-6 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center">
            <Settings className="w-4 h-4 text-[#6b2fa5]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Global Settings</h1>
            <p className="text-xs text-gray-500">Platform-wide configurations and payout restrictions</p>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── RESTRICTED DATES ── */}
        <Card>
          <CardHead icon={Calendar} title="Restricted Dates" subtitle="Block payouts on specific calendar dates" />
          <div className="p-5 space-y-4">
            <div className="space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent"
                />
                <Btn
                  onClick={handleAddDate}
                  disabled={!newDate || !newDateReason || saving === "date"}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </Btn>
              </div>
              <textarea
                value={newDateReason}
                onChange={(e) => setNewDateReason(e.target.value)}
                placeholder="Reason for restriction (required)"
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent placeholder:text-gray-400"
              />
            </div>

            {newDate && (
              <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 font-medium">
                📅{" "}
                {new Date(newDate).toLocaleDateString("en-NG", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            )}

            {restrictedDates.length > 0 ? (
              <div className="space-y-2 pt-3 border-t border-gray-100">
                {restrictedDates.map((rd) => (
                  <div
                    key={rd.date}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(rd.date).toLocaleDateString("en-NG", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {rd.reason && <p className="text-xs text-gray-500 mt-0.5">{rd.reason}</p>}
                    </div>
                    <button
                      onClick={() => handleDeleteDate(rd.date)}
                      className="shrink-0 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3 border-t border-gray-100">
                No restricted dates added
              </p>
            )}
          </div>
        </Card>

        {/* ── RESTRICTED DAYS ── */}
        <Card>
          <CardHead
            icon={Clock}
            title="Restricted Days"
            subtitle="Disable payouts on recurring days of the week"
          />
          <div className="p-5 space-y-2">
            {DAYS_OF_WEEK.map((day) => {
              const dayObj = restrictedDays.find((d) => d.day === day) || { day, isRestricted: false }
              const isRestricted = dayObj.isRestricted
              const hasLocalReason = dayReasons[day] !== undefined
              return (
                <div
                  key={day}
                  className={`rounded-lg border transition-colors ${isRestricted ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-gray-50/50"}`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Toggle
                      checked={isRestricted}
                      onChange={(checked) => handleDayToggle(day, checked)}
                      disabled={saving === day}
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1">{day}</span>
                    {isRestricted && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        Restricted
                      </span>
                    )}
                  </div>
                  {(isRestricted || hasLocalReason) && (
                    <div className="px-4 pb-3">
                      <textarea
                        value={dayReasons[day] ?? dayObj.reason ?? ""}
                        onChange={(e) =>
                          setDayReasons((prev) => ({ ...prev, [day]: e.target.value }))
                        }
                        placeholder={`Reason for restricting ${day} (required to enable)`}
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent placeholder:text-gray-400 bg-white"
                      />
                    </div>
                  )}
                  {!isRestricted && !hasLocalReason && (
                    <div className="px-4 pb-3">
                      <textarea
                        value=""
                        onFocus={() => setDayReasons((prev) => ({ ...prev, [day]: "" }))}
                        onChange={(e) =>
                          setDayReasons((prev) => ({ ...prev, [day]: e.target.value }))
                        }
                        placeholder={`Add reason to restrict ${day}…`}
                        rows={1}
                        className="w-full text-xs border border-gray-100 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent placeholder:text-gray-300 bg-transparent"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── DANGEROUS ZONE ── */}
        <Card className="border-red-200">
          <CardHead
            icon={ShieldAlert}
            title="Dangerous Zone"
            subtitle="Critical platform operations — handle with extreme care"
            danger
          />
          <div className="p-5 space-y-4">

            {/* Maintenance */}
            <div
              className={`rounded-lg border p-4 ${globalSettings.isMaintenance ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${globalSettings.isMaintenance ? "text-red-500" : "text-gray-400"}`}
                    />
                    <h4 className="text-sm font-semibold text-gray-900">Maintenance Mode</h4>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {globalSettings.isMaintenance
                      ? "Spotix is currently offline for all users"
                      : "Blocks all users from accessing Spotix"}
                  </p>
                  {globalSettings.isMaintenance && globalSettings.maintenanceReason && (
                    <p className="text-xs text-red-700 mt-2 ml-6 p-2 bg-red-100/70 rounded-md italic">
                      "{globalSettings.maintenanceReason}"
                    </p>
                  )}
                </div>
                <Toggle
                  checked={globalSettings.isMaintenance}
                  onChange={handleMaintenanceToggle}
                  disabled={saving === "maintenance"}
                />
              </div>
            </div>

            {/* Payouts */}
            <div
              className={`rounded-lg border p-4 ${!globalSettings.isPayoutAllowed ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Banknote
                      className={`w-4 h-4 shrink-0 ${!globalSettings.isPayoutAllowed ? "text-orange-500" : "text-gray-400"}`}
                    />
                    <h4 className="text-sm font-semibold text-gray-900">Allow Payouts</h4>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    {globalSettings.isPayoutAllowed
                      ? "Organizers can request withdrawals"
                      : "All payout requests are currently blocked"}
                  </p>
                  {!globalSettings.isPayoutAllowed && globalSettings.isPayoutNotAllowedReason && (
                    <p className="text-xs text-orange-700 mt-2 ml-6 p-2 bg-orange-100/70 rounded-md italic">
                      "{globalSettings.isPayoutNotAllowedReason}"
                    </p>
                  )}
                  {!globalSettings.isPayoutAllowed && (
                    <button
                      onClick={() => handlePayoutToggle(true)}
                      disabled={saving === "payout"}
                      className="ml-6 mt-2.5 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                    >
                      ✓ Re-enable Payouts
                    </button>
                  )}
                </div>
                {globalSettings.isPayoutAllowed && (
                  <Toggle
                    checked={globalSettings.isPayoutAllowed}
                    onChange={handlePayoutToggle}
                    disabled={saving === "payout"}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ─── MODALS — fixed overlays, outside page flow ─── */}

      <Modal
        open={showMaintenanceModal}
        onClose={() => {
          setShowMaintenanceModal(false)
          setMaintenanceReason("")
        }}
        danger
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Enable Maintenance Mode
          </span>
        }
        description="This will block ALL users from accessing Spotix immediately. Consult the CTO before proceeding."
        footer={
          <>
            <Btn
              variant="outline"
              onClick={() => {
                setShowMaintenanceModal(false)
                setMaintenanceReason("")
              }}
            >
              Cancel
            </Btn>
            <Btn
              variant="danger"
              onClick={confirmMaintenance}
              disabled={!maintenanceReason || saving === "maintenance"}
            >
              {saving === "maintenance" ? "Enabling…" : "Confirm & Enable"}
            </Btn>
          </>
        }
      >
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ⚠️ Every active session will see a maintenance screen until you disable this.
        </div>
        <textarea
          value={maintenanceReason}
          onChange={(e) => setMaintenanceReason(e.target.value)}
          placeholder="Reason for maintenance (required)…"
          rows={3}
          autoFocus
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-gray-400"
        />
      </Modal>

      <Modal
        open={showPayoutModal}
        onClose={() => {
          setShowPayoutModal(false)
          setPayoutReason("")
        }}
        danger
        title={
          <span className="flex items-center gap-2">
            <Banknote className="w-4 h-4" /> Disable Payouts
          </span>
        }
        description="Organizers will be unable to request withdrawals until payouts are re-enabled."
        footer={
          <>
            <Btn
              variant="outline"
              onClick={() => {
                setShowPayoutModal(false)
                setPayoutReason("")
              }}
            >
              Cancel
            </Btn>
            <Btn
              variant="danger"
              onClick={() => submitPayoutChange(false, payoutReason)}
              disabled={!payoutReason || saving === "payout"}
            >
              {saving === "payout" ? "Disabling…" : "Confirm & Disable"}
            </Btn>
          </>
        }
      >
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-800">
          ⚠️ All pending and new payout requests will be frozen until you re-enable this.
        </div>
        <textarea
          value={payoutReason}
          onChange={(e) => setPayoutReason(e.target.value)}
          placeholder="Reason for disabling payouts (required)…"
          rows={3}
          autoFocus
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent placeholder:text-gray-400"
        />
      </Modal>
    </>
  )
}