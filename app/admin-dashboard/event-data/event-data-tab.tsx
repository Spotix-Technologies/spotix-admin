"use client"

import { useState, useEffect } from "react"
import {
  MapPin, Calendar, Clock, Ticket, Users, TrendingUp, Heart,
  Flag, EyeOff, Eye, ShieldBan, Trash2, AlertTriangle,
  X, CheckCircle, DollarSign, Link2, Tag, Info, Wallet,
  Loader2, AlertCircle, Percent, Settings2, Package,
} from "lucide-react"
import AdminAttendeesTab from "./admin-attendees-tab"
import PassesTab from "./passes-tab"
import ReferralsTab from "./referrals-tab"
import AddonsTab from "./addons-tab"
import AdminEditPanel from "./admin-edit-panel"
import AdminEventPayoutsPanel from "@/components/payout/admin-event-payouts-panel"
import type { DiscountData, EventLike } from "./admin-edit/types"

interface TicketTier {
  policy: string
  price: string
  description: string
  ticketsSold: number
  availableTickets: number
}

interface EventData {
  id: string
  eventName: string
  eventDescription: string
  eventImage: string
  eventImages: string[]
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  eventVenue: string
  venueCoordinates: { lat: number; lng: number } | null
  eventType: string
  isFree: boolean
  ticketPrices: TicketTier[]
  ticketsSold: number
  revenue: number
  totalRevenue: number
  paidAmount: number
  totalPaidOut: number
  likeCount: number
  status: string
  flagged: boolean
  suspended: boolean
  organizerId: string
  affiliateId: string | null
  affiliateName: string | null
  allowAgents: boolean
  virtualQueueEnabled: boolean
  queueBatchSize: number
  queueSessionTTL: number
  enabledCollaboration: boolean
  hasStopDate: boolean
  stopDate: string | null
  /** null = not overridden for this event — checkout falls back to the
   *  system default (5%). See priceUtility.ts (spotix-user). */
  platformPercentageFee: number | null
  /** null = not overridden — checkout falls back to ₦0, NOT the ₦100
   *  system default (an unset flat fee means one was deliberately not added). */
  platformFlatFee: number | null
  /** Who pays Paystack's processing fee / Spotix's own platform fee for
   *  this event — independent of the fee amounts above. See
   *  resolveFeeBurden() in spotix-user's priceUtility.ts. */
  feeBurden: {
    coversPaystackFee: boolean
    coversSpotixFee: boolean
    /** Only meaningful when coversPaystackFee is true. "organizer" (default)
     *  deducts it from the organizer's payout; "spotix" leaves the
     *  organizer's payout untouched and Spotix absorbs it instead. */
    paystackFeeAbsorbedBy: "organizer" | "spotix"
  }
  createdAt: string | null
  updatedAt: string | null
  attendeeCount: number
  /** Populated by GET ?action=getEventDetails. Kept optional so existing
   *  callers that don't pass it (or haven't loaded it yet) still compile. */
  discounts?: DiscountData[]
}

interface Props {
  eventData: EventData
  onUpdate: (updated: EventData) => void
  onDeleted: () => void
  adminUsername: string
  /** Only the full "admin" role can record an admin-payout or revert one — see the panel component for why. */
  canManagePayouts: boolean
  /** Only the full "admin" role can flag/deactivate/suspend/delete an event —
   *  the API routes behind these actions (PATCH/DELETE /api/v1/event-data,
   *  POST /api/v1/event-data/deleted) are admin-only. customer-support and
   *  exec-assistant are view-only here, so the Dangerous Zone is hidden
   *  entirely for them instead of showing buttons that would just 403. */
  canModerate: boolean
  /** Admin + customer-support can manually match a referral-less attendee to a referral code. */
  canMatchReferrals: boolean
  /** Who can create/deactivate Addons from this dashboard — full admin
   *  only here (see api/v1/event-data/addons). Everyone with this tab
   *  can still view the list. */
  canCreateAddons: boolean
  /** Admin + customer-support can edit core event fields and manage discount
   *  codes — matches the PATCH route's allowed roles for editEvent/
   *  addDiscount/editDiscount/toggleDiscount/deleteDiscount. exec-assistant
   *  doesn't get this tab at all, same reasoning as canModerate above. */
  canEditEvent: boolean
}

/* ── Sub-components ── */
function Badge({ children, color }: { children: React.ReactNode; color: "green" | "red" | "amber" | "blue" | "slate" }) {
  const map = {
    green: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red: "bg-red-100 text-red-700 border-red-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  }
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${map[color]}`}>
      {children}
    </span>
  )
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ElementType; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${accent || "text-slate-400"}`} />
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

function ActionModal({
  open, onClose, title, description, warning, onConfirm, confirmLabel, danger, children, loading, confirmDisabled,
}: {
  open: boolean; onClose: () => void; title: string; description: string; warning?: string
  onConfirm: () => void; confirmLabel: string; danger?: boolean; children?: React.ReactNode; loading?: boolean; confirmDisabled?: boolean
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className={`px-6 py-5 border-b ${danger ? "border-red-100 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className={`font-semibold text-base ${danger ? "text-red-700" : "text-slate-800"}`}>{title}</h3>
              <p className="text-sm text-slate-500 mt-1">{description}</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 mt-0.5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          {warning && (
            <div className={`flex items-start gap-2.5 p-3 rounded-lg text-xs ${danger ? "bg-red-50 border border-red-200 text-red-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          )}
          {children}
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${danger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-[#6b2fa5] hover:bg-[#5a2589] text-white"}`}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReasonTextarea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "Reason for this action (required)…"}
      rows={3}
      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
    />
  )
}

/* ── Main ── */
export default function EventDataTab({ eventData, onUpdate, onDeleted, adminUsername, canManagePayouts, canModerate, canMatchReferrals, canCreateAddons, canEditEvent }: Props) {
  const [event, setEvent] = useState(eventData)
  const [discounts, setDiscounts] = useState<DiscountData[]>(eventData.discounts ?? [])
  const [activeImage, setActiveImage] = useState(event.eventImage)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "attendees" | "payouts" | "passes" | "referrals" | "addons" | "editEvent">("overview")

  const [flagModal, setFlagModal] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const [statusModal, setStatusModal] = useState(false)
  const [statusTarget, setStatusTarget] = useState<"active" | "inactive">("inactive")
  const [statusReason, setStatusReason] = useState("")
  const [suspendModal, setSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
  const [queueModal, setQueueModal] = useState(false)
  const [queueReason, setQueueReason] = useState("")
  const [queueSettingsModal, setQueueSettingsModal] = useState(false)
  const [batchSizeInput, setBatchSizeInput] = useState("50")
  const [waitMinutesInput, setWaitMinutesInput] = useState("8")
  const [queueSettingsReason, setQueueSettingsReason] = useState("")
  const [pricingModal, setPricingModal] = useState(false)
  const [pctFeeInput, setPctFeeInput] = useState("5")
  const [flatFeeInput, setFlatFeeInput] = useState("0")
  const [pricingReason, setPricingReason] = useState("")
  const [feeBurdenModal, setFeeBurdenModal] = useState(false)
  const [feeBurdenReason, setFeeBurdenReason] = useState("")
  const [paystackPayerChoice, setPaystackPayerChoice] = useState<"attendee" | "organizer" | "spotix">("attendee")
  const [deleteModal, setDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleteReason, setDeleteReason] = useState("")

  const allImages = [event.eventImage, ...(event.eventImages || [])].filter(Boolean)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  /* Admin identity comes from the session cookie — the API reads it from
     middleware headers (x-user-uid, x-user-username, x-is-admin).
     No need to pass it from the client. */
  const patchEvent = async (action: string, payload: Record<string, unknown>, reason: string) => {
    const res = await fetch("/api/v1/event-data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, action, reason, ...payload }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || "Failed to update")
    return json
  }

  const handleFlagConfirm = async () => {
    if (!flagReason.trim()) return
    setSaving("flag")
    try {
      await patchEvent("flag", { flagged: !event.flagged }, flagReason)
      const updated = { ...event, flagged: !event.flagged }
      setEvent(updated); onUpdate(updated)
      setFlagModal(false); setFlagReason("")
      showToast(`Event ${!event.flagged ? "flagged" : "unflagged"} successfully`, "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const handleStatusConfirm = async () => {
    if (!statusReason.trim()) return
    setSaving("status")
    try {
      await patchEvent("setStatus", { status: statusTarget }, statusReason)
      const updated = { ...event, status: statusTarget }
      setEvent(updated); onUpdate(updated)
      setStatusModal(false); setStatusReason("")
      showToast(`Event set to ${statusTarget}`, "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const handleSuspendConfirm = async () => {
    if (!suspendReason.trim()) return
    setSaving("suspend")
    try {
      await patchEvent("suspend", { suspended: !event.suspended }, suspendReason)
      const updated = { ...event, suspended: !event.suspended }
      setEvent(updated); onUpdate(updated)
      setSuspendModal(false); setSuspendReason("")
      showToast(`Event ${!event.suspended ? "suspended" : "unsuspended"} successfully`, "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const handleToggleQueueConfirm = async () => {
    if (!queueReason.trim()) return
    setSaving("queue")
    try {
      await patchEvent("toggleQueue", { virtualQueueEnabled: !event.virtualQueueEnabled }, queueReason)
      const updated = { ...event, virtualQueueEnabled: !event.virtualQueueEnabled }
      setEvent(updated); onUpdate(updated)
      setQueueModal(false); setQueueReason("")
      showToast(`Virtual queue ${!event.virtualQueueEnabled ? "enabled" : "disabled"} for this event`, "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const handleUpdateQueueSettingsConfirm = async () => {
    const batchSize = parseInt(batchSizeInput, 10)
    const waitMinutes = parseInt(waitMinutesInput, 10)
    if (!queueSettingsReason.trim() || !Number.isInteger(batchSize) || batchSize < 1 || !Number.isInteger(waitMinutes) || waitMinutes < 1) return
    setSaving("queueSettings")
    try {
      await patchEvent("updateQueueConfig", { queueBatchSize: batchSize, queueWaitMinutes: waitMinutes }, queueSettingsReason)
      const updated = { ...event, queueBatchSize: batchSize, queueSessionTTL: waitMinutes * 60 }
      setEvent(updated); onUpdate(updated)
      setQueueSettingsModal(false); setQueueSettingsReason("")
      showToast(`Queue settings updated — ${batchSize} admitted at a time, ${waitMinutes} min to check out`, "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const handleUpdatePricingConfirm = async () => {
    const pct = Number(pctFeeInput)
    const flat = Number(flatFeeInput)
    if (!pricingReason.trim() || !Number.isFinite(pct) || pct < 0 || pct > 100 || !Number.isFinite(flat) || flat < 0) return
    setSaving("pricing")
    try {
      await patchEvent("updatePricing", { platformPercentageFee: pct, platformFlatFee: flat }, pricingReason)
      const updated = { ...event, platformPercentageFee: pct, platformFlatFee: flat }
      setEvent(updated); onUpdate(updated)
      setPricingModal(false); setPricingReason("")
      showToast(`Platform fee updated — ${pct}% + ${money(flat)} per ticket`, "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const handleResetPricingConfirm = async () => {
    if (!pricingReason.trim()) return
    setSaving("pricing")
    try {
      await patchEvent("updatePricing", { platformPercentageFee: null, platformFlatFee: null }, pricingReason)
      const updated = { ...event, platformPercentageFee: null, platformFlatFee: null }
      setEvent(updated); onUpdate(updated)
      setPricingModal(false); setPricingReason("")
      showToast("Platform fee reset to system default (5% + ₦0)", "success")
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const currentPaystackPayer: "attendee" | "organizer" | "spotix" = !event.feeBurden.coversPaystackFee
    ? "attendee"
    : event.feeBurden.paystackFeeAbsorbedBy

  const handleUpdateFeeBurdenConfirm = async () => {
    if (!feeBurdenReason.trim()) return
    setSaving("feeBurden")
    try {
      const coversPaystackFee = paystackPayerChoice !== "attendee"
      const payload: Record<string, unknown> = { coversPaystackFee }
      if (coversPaystackFee) payload.paystackFeeAbsorbedBy = paystackPayerChoice
      await patchEvent("updateFeeBurden", payload, feeBurdenReason)
      const updated = {
        ...event,
        feeBurden: {
          ...event.feeBurden,
          coversPaystackFee,
          paystackFeeAbsorbedBy: coversPaystackFee ? (paystackPayerChoice as "organizer" | "spotix") : event.feeBurden.paystackFeeAbsorbedBy,
        },
      }
      setEvent(updated); onUpdate(updated)
      setFeeBurdenModal(false); setFeeBurdenReason("")
      showToast(
        paystackPayerChoice === "attendee"
          ? "Attendees are charged Paystack's fee again"
          : paystackPayerChoice === "spotix"
            ? "Spotix now absorbs Paystack's fee — organizer's payout is unaffected"
            : "The organizer now absorbs Paystack's fee, deducted from their payout",
        "success"
      )
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  /**
   * Bridges AdminEditPanel's onUpdate(event, discounts) into this
   * component's own `event`/`discounts` state and up to the parent
   * (event-data-client.tsx) via the existing onUpdate prop — same
   * "setEvent then onUpdate" pattern the other handlers above use.
   */
  const handleEditPanelUpdate = (updatedEvent: EventLike, updatedDiscounts?: DiscountData[]) => {
    const merged = { ...event, ...updatedEvent } as EventData
    if (merged.ticketPrices) {
      merged.ticketPrices = merged.ticketPrices.map(tier => ({
        ...tier,
        price: String(tier.price)
      }))
    }
    setEvent(merged)
    if (updatedDiscounts) setDiscounts(updatedDiscounts)
    onUpdate({ ...merged, discounts: updatedDiscounts ?? discounts })
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== event.eventName || !deleteReason.trim()) return
    setSaving("delete")
    try {
      const res = await fetch("/api/v1/event-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, reason: deleteReason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete")
      setDeleteModal(false)
      showToast("Event removed from Spotix", "success")
      setTimeout(() => onDeleted(), 1500)
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed", "error") }
    finally { setSaving(null) }
  }

  const fmt = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) }
    catch { return d }
  }
  const money = (n: number) => `₦${(n || 0).toLocaleString()}`
  const tierRevenue = event.ticketPrices.reduce((s, t) => s + (parseInt(t.price) || 0) * (t.ticketsSold || 0), 0)

  // ── Platform fee — mirrors resolvePlatformFeeRates() in spotix-user's
  // priceUtility.ts: unset percentage falls back to 5%, unset flat fee
  // falls back to ₦0 (not the ₦100 system default — see that file).
  const isPricingCustomised = event.platformPercentageFee !== null || event.platformFlatFee !== null
  const effectivePctFee = event.platformPercentageFee ?? 5
  const effectiveFlatFee = event.platformFlatFee ?? 0

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit flex-wrap">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "overview"
              ? "bg-white text-[#6b2fa5] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("attendees")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "attendees"
              ? "bg-white text-[#6b2fa5] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Attendees
          <span className="text-[10px] bg-[#6b2fa5/10] text-[#6b2fa5] px-1.5 py-0.5 rounded-full font-bold">
            {event.attendeeCount ?? "–"}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("payouts")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "payouts"
              ? "bg-white text-[#6b2fa5] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          Payouts
        </button>
        <button
          onClick={() => setActiveTab("passes")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "passes"
              ? "bg-white text-[#6b2fa5] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Ticket className="w-3.5 h-3.5" />
          Passes
        </button>
        <button
          onClick={() => setActiveTab("referrals")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "referrals"
              ? "bg-white text-[#6b2fa5] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Referrals
        </button>
        <button
          onClick={() => setActiveTab("addons")}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "addons"
              ? "bg-white text-[#6b2fa5] shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          Addons
        </button>
        {canEditEvent && (
          <button
            onClick={() => setActiveTab("editEvent")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "editEvent"
                ? "bg-white text-[#6b2fa5] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Edit Event
          </button>
        )}
      </div>

      {/* Edit Event tab */}
      {activeTab === "editEvent" && canEditEvent && (
        <AdminEditPanel event={event} discounts={discounts} onUpdate={handleEditPanelUpdate} />
      )}

      {/* Referrals tab */}
      {activeTab === "referrals" && (
        <ReferralsTab eventId={event.id} canMatch={canMatchReferrals} />
      )}

      {/* Addons tab */}
      {activeTab === "addons" && (
        <AddonsTab eventId={event.id} canCreate={canCreateAddons} />
      )}

      {/* Passes tab */}
      {activeTab === "passes" && (
        <PassesTab eventId={event.id} eventName={event.eventName} />
      )}

      {/* Attendees tab */}
      {activeTab === "attendees" && (
        <AdminAttendeesTab eventId={event.id} eventName={event.eventName} ticketPrices={event.ticketPrices} />
      )}

      {/* Payouts tab */}
      {activeTab === "payouts" && (
        <AdminEventPayoutsPanel eventId={event.id} adminUsername={adminUsername} canManage={canManagePayouts} />
      )}

      {/* Overview tab */}
      {activeTab === "overview" && (
      <>

      {/* Hero image */}
      <div className="rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
        <div className="aspect-[21/9] relative">
          <img src={activeImage} alt={event.eventName} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {event.flagged && <Badge color="red">🚩 Flagged</Badge>}
            {event.suspended && <Badge color="red">🔴 Suspended</Badge>}
            {event.status === "inactive" && <Badge color="amber">⏸ Inactive</Badge>}
          </div>
        </div>
        {allImages.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto bg-slate-50 border-t border-slate-100">
            {allImages.map((img, i) => (
              <button key={i} onClick={() => setActiveImage(img)} className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? "border-[#6b2fa5]" : "border-slate-200 opacity-60 hover:opacity-90"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title + meta */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 flex-1">{event.eventName}</h1>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge color={event.status === "active" ? "green" : event.status === "inactive" ? "amber" : "red"}>
              {event.status}
            </Badge>
            {event.isFree && <Badge color="blue">Free</Badge>}
            {event.enabledCollaboration && <Badge color="slate">Collab</Badge>}
          </div>
        </div>
        {event.eventDescription && (
          <p className="text-slate-600 text-sm leading-relaxed">{event.eventDescription}</p>
        )}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" />{fmt(event.eventDate)}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" />{event.eventStart} – {event.eventEnd}</span>
          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{event.eventVenue}</span>
          <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5 text-slate-400" />{event.eventType}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono pt-1 border-t border-slate-100">
          <Link2 className="w-3 h-3" />
          <span>{event.id}</span>
          <span className="text-slate-300">·</span>
          <span>Organizer: {event.organizerId}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Tickets Sold" value={event.ticketsSold} icon={Ticket} accent="text-[#6b2fa5]" />
        <StatCard label="Total Revenue" value={money(event.totalRevenue)} icon={TrendingUp} accent="text-emerald-500" />
        <StatCard label="Paid Out" value={money(event.totalPaidOut)} icon={DollarSign} accent="text-amber-500" />
        <StatCard label="Likes" value={event.likeCount} icon={Heart} accent="text-pink-500" />
      </div>

      {/* Ticket tiers */}
      {event.ticketPrices.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#6b2fa5]" />
            <h3 className="font-semibold text-sm text-slate-700">Ticket Tiers</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {event.ticketPrices.map((tier, i) => {
              const rev = (parseInt(tier.price) || 0) * (tier.ticketsSold || 0)
              const hasAvailableTickets = (tier.availableTickets || 0) > 0
              const total = (tier.ticketsSold || 0) + (tier.availableTickets || 0)
              const pct = total > 0 ? Math.round(((tier.ticketsSold || 0) / total) * 100) : 0
              return (
                <div key={i} className="px-5 py-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-sm text-slate-800">{tier.policy}</p>
                      <p className="text-xs text-slate-500">{tier.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-600">{parseInt(tier.price) === 0 ? "Free" : money(parseInt(tier.price))}</p>
                      {hasAvailableTickets ? (
                        <p className="text-xs text-slate-400">{tier.ticketsSold} sold · {tier.availableTickets} left</p>
                      ) : (
                        <p className="text-xs text-slate-400">{tier.ticketsSold} sold</p>
                      )}
                    </div>
                  </div>
                  {hasAvailableTickets && (
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{pct}% sold</span>
                        <span className="text-emerald-600 font-medium">{money(rev)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#6b2fa5] to-[#4f46e5] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                  {!hasAvailableTickets && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Unlimited capacity</span>
                      <span className="text-emerald-600 font-medium">{money(rev)}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Tier Revenue Total</span>
            <span className="font-bold text-emerald-600">{money(tierRevenue)}</span>
          </div>
        </div>
      )}

      {/* Details table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <h3 className="font-semibold text-sm text-slate-700">Event Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2">
          {[
            ["Event Date", fmt(event.eventDate)],
            ["End Date", event.eventEndDate ? fmt(event.eventEndDate) : "—"],
            ["Time", `${event.eventStart} – ${event.eventEnd}`],
            ["Venue", event.eventVenue],
            ["Type", event.eventType],
            ["Organizer ID", event.organizerId],
            ["Affiliate", event.affiliateName || "None"],
            ["Collaboration", event.enabledCollaboration ? "Enabled" : "Disabled"],
            ["Agents Allowed", event.allowAgents ? "Yes" : "No"],
            ["Created At", event.createdAt ? new Date(event.createdAt).toLocaleDateString("en-NG") : "—"],
          ].map(([label, value], i) => (
            <div key={label} className={`flex items-start justify-between gap-4 px-5 py-3 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} border-b border-slate-100 last:border-0`}>
              <span className="text-xs text-slate-500 font-medium shrink-0">{label}</span>
              <span className="text-xs text-slate-700 text-right font-mono break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── VIRTUAL QUEUE ── */}
      <div className={`rounded-2xl border overflow-hidden ${event.virtualQueueEnabled ? "border-purple-200 bg-purple-50/30" : "border-slate-200 bg-white"}`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${event.virtualQueueEnabled ? "bg-purple-100 border border-purple-200" : "bg-slate-100 border border-slate-200"}`}>
            <Users className={`w-3.5 h-3.5 ${event.virtualQueueEnabled ? "text-[#6b2fa5]" : "text-slate-400"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">Virtual Queue</h3>
            <p className="text-xs text-slate-500">Waiting-room checkout for high-traffic ticket sales.</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Ticket className={`w-4 h-4 shrink-0 mt-0.5 ${event.virtualQueueEnabled ? "text-[#6b2fa5]" : "text-slate-400"}`} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {event.virtualQueueEnabled ? "Queue Enabled" : "Queue Disabled"}
                  </p>
                  {event.virtualQueueEnabled && <Badge color="blue">Active</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
                  When enabled, buyers wait in a virtual line and are admitted to checkout in batches of {event.queueBatchSize || 50}, instead of hitting checkout all at once.
                </p>
              </div>
            </div>
            <button
              onClick={() => setQueueModal(true)}
              disabled={saving === "queue"}
              className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${event.virtualQueueEnabled ? "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100" : "border-purple-200 bg-purple-50 text-[#6b2fa5] hover:bg-purple-100"}`}
            >
              {event.virtualQueueEnabled ? "Disable" : "Enable"}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-5 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Admitted at once</p>
                <p className="text-sm font-bold text-slate-800">{event.queueBatchSize || 50} people</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Time to check out</p>
                <p className="text-sm font-bold text-slate-800">{Math.round((event.queueSessionTTL || 480) / 60)} min</p>
              </div>
            </div>
            <button
              onClick={() => {
                setBatchSizeInput(String(event.queueBatchSize || 50))
                setWaitMinutesInput(String(Math.round((event.queueSessionTTL || 480) / 60)))
                setQueueSettingsReason("")
                setQueueSettingsModal(true)
              }}
              disabled={saving === "queueSettings"}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Edit Settings
            </button>
          </div>
        </div>
      </div>

      {/* ── PLATFORM FEES ── */}
      {canModerate && (
      <div className={`rounded-2xl border overflow-hidden ${isPricingCustomised ? "border-purple-200 bg-purple-50/30" : "border-slate-200 bg-white"}`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isPricingCustomised ? "bg-purple-100 border border-purple-200" : "bg-slate-100 border border-slate-200"}`}>
            <Percent className={`w-3.5 h-3.5 ${isPricingCustomised ? "text-[#6b2fa5]" : "text-slate-400"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">Platform Fees</h3>
            <p className="text-xs text-slate-500">The buyer-facing fee added on top of each ticket price at checkout.</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Settings2 className={`w-4 h-4 shrink-0 mt-0.5 ${isPricingCustomised ? "text-[#6b2fa5]" : "text-slate-400"}`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">
                    Currently charging {effectivePctFee}% + {money(effectiveFlatFee)} per ticket
                  </p>
                  {isPricingCustomised ? <Badge color="blue">Customised</Badge> : <Badge color="slate">Platform Default</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
                  {event.platformPercentageFee === null && event.platformFlatFee === null
                    ? "This event has never been customised — it uses the platform default (5% + ₦0 flat)."
                    : <>
                        {event.platformPercentageFee === null && "Percentage uses the platform default (5%). "}
                        {event.platformFlatFee === null && "Flat fee uses the platform default (₦0 — not ₦100; a flat fee only applies once explicitly set)."}
                      </>}
                  {" "}Applies to every ticket purchased on this event going forward; past purchases already charged keep their original amount.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setPctFeeInput(String(effectivePctFee))
                setFlatFeeInput(String(effectiveFlatFee))
                setPricingReason("")
                setPricingModal(true)
              }}
              disabled={saving === "pricing"}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-[#6b2fa5] hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              Edit Fees
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── PAYSTACK FEE BURDEN ── */}
      {canModerate && (
      <div className={`rounded-2xl border overflow-hidden ${currentPaystackPayer !== "attendee" ? "border-purple-200 bg-purple-50/30" : "border-slate-200 bg-white"}`}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${currentPaystackPayer !== "attendee" ? "bg-purple-100 border border-purple-200" : "bg-slate-100 border border-slate-200"}`}>
            <Wallet className={`w-3.5 h-3.5 ${currentPaystackPayer !== "attendee" ? "text-[#6b2fa5]" : "text-slate-400"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-slate-800">Paystack Fee</h3>
            <p className="text-xs text-slate-500">Who pays Paystack&apos;s own processing fee — separate from the platform fee above.</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Settings2 className={`w-4 h-4 shrink-0 mt-0.5 ${currentPaystackPayer !== "attendee" ? "text-[#6b2fa5]" : "text-slate-400"}`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">
                    {currentPaystackPayer === "attendee" && "Attendee also pays Paystack's fee"}
                    {currentPaystackPayer === "organizer" && "Organizer absorbs Paystack's fee"}
                    {currentPaystackPayer === "spotix" && "Spotix absorbs Paystack's fee"}
                  </p>
                  {currentPaystackPayer === "attendee" && <Badge color="slate">Platform Default</Badge>}
                  {currentPaystackPayer === "organizer" && <Badge color="blue">Organizer Pays</Badge>}
                  {currentPaystackPayer === "spotix" && <Badge color="blue">Spotix Pays</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-md">
                  {currentPaystackPayer === "attendee" && "Paystack's own processing fee (~1.5% + ₦100, capped at ₦2,000) is added on top of the ticket price and platform fee, same as the platform default."}
                  {currentPaystackPayer === "organizer" && "Attendees only pay the platform fee above. Paystack's fee is deducted from this event's payout balance on every sale instead."}
                  {currentPaystackPayer === "spotix" && "Attendees only pay the platform fee above. The organizer's payout is unaffected — Spotix absorbs the fee out of its own platform-fee margin instead."}
                  {" "}Applies to every ticket purchased going forward; past purchases keep their original amount.
                </p>
              </div>
            </div>
            <button
              onClick={() => { setPaystackPayerChoice(currentPaystackPayer); setFeeBurdenReason(""); setFeeBurdenModal(true) }}
              disabled={saving === "feeBurden"}
              className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-[#6b2fa5] hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              Change
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── DANGEROUS ZONE ── */}
      {canModerate && (
      <div className="rounded-2xl border border-red-200 bg-red-50/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-red-200 bg-red-50 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-red-700">Dangerous Zone</h3>
            <p className="text-xs text-red-500">Critical admin actions — all logged with your session identity.</p>
          </div>
        </div>

        <div className="p-5 space-y-3">

          {/* FLAG */}
          <div className={`rounded-xl border p-4 bg-white ${event.flagged ? "border-red-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Flag className={`w-4 h-4 shrink-0 mt-0.5 ${event.flagged ? "text-red-500" : "text-slate-400"}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{event.flagged ? "Unflag Event" : "Flag Event"}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Flagging <strong className="text-amber-600">blocks the organizer from creating payout requests</strong> until unflagged.
                  </p>
                  {event.flagged && <span className="mt-1.5 inline-block"><Badge color="red">Currently Flagged</Badge></span>}
                </div>
              </div>
              <button
                onClick={() => setFlagModal(true)}
                disabled={saving === "flag"}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${event.flagged ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"}`}
              >
                {event.flagged ? "Unflag" : "Flag"}
              </button>
            </div>
          </div>

          {/* STATUS */}
          <div className={`rounded-xl border p-4 bg-white ${event.status === "inactive" ? "border-amber-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {event.status === "active" ? (
                  <EyeOff className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                ) : (
                  <Eye className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {event.status === "active" ? "Set Inactive" : "Set Active"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {event.status === "active"
                      ? <>Setting inactive <strong className="text-amber-600">removes the event from discovery</strong>. The organizer can still see it and reactivate it.</>
                      : <>Event is <strong className="text-amber-600">currently hidden</strong> from public listings. Restore to make it discoverable again.</>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setStatusTarget(event.status === "active" ? "inactive" : "active"); setStatusModal(true) }}
                disabled={saving === "status"}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {event.status === "active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>

          {/* SUSPEND */}
          <div className={`rounded-xl border p-4 bg-white ${event.suspended ? "border-red-300" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldBan className={`w-4 h-4 shrink-0 mt-0.5 ${event.suspended ? "text-red-500" : "text-slate-400"}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{event.suspended ? "Unsuspend Event" : "Suspend Event"}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Suspension means <strong className="text-red-600">no one can see the event</strong> — not the public, not the organizer.
                    The organizer loses all access until unsuspended by an admin.
                  </p>
                  {event.suspended && <span className="mt-1.5 inline-block"><Badge color="red">Currently Suspended</Badge></span>}
                </div>
              </div>
              <button
                onClick={() => setSuspendModal(true)}
                disabled={saving === "suspend"}
                className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${event.suspended ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100" : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"}`}
              >
                {event.suspended ? "Unsuspend" : "Suspend"}
              </button>
            </div>
          </div>

          {/* DELETE */}
          <div className="rounded-xl border border-red-300 bg-red-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Trash2 className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Delete Event</p>
                  <p className="text-xs text-red-500/80 mt-0.5 leading-relaxed">
                    Completely removes the event from Spotix. No user can find or access it.
                    Moved to <code className="bg-red-100 px-1 py-0.5 rounded text-[10px] font-mono">deletedEvents</code> — restorable by an admin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModal(true)}
                disabled={saving === "delete"}
                className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* ── MODALS ── */}

      <ActionModal
        open={flagModal}
        onClose={() => { setFlagModal(false); setFlagReason("") }}
        title={event.flagged ? "Unflag this event?" : "Flag this event?"}
        description={event.flagged ? "Unflagging restores the organizer's ability to request payouts." : "Flagging blocks the organizer from creating any new payout requests."}
        warning={!event.flagged ? "The organizer will see a restriction notice on their payout page. Existing payout requests are unaffected." : undefined}
        onConfirm={handleFlagConfirm}
        confirmLabel={event.flagged ? "Confirm Unflag" : "Confirm Flag"}
        loading={saving === "flag"}
      >
        <ReasonTextarea value={flagReason} onChange={setFlagReason} />
      </ActionModal>

      <ActionModal
        open={statusModal}
        onClose={() => { setStatusModal(false); setStatusReason("") }}
        title={`Set event to ${statusTarget}?`}
        description={statusTarget === "inactive" ? "Removes the event from public discovery." : "Makes the event publicly visible and discoverable again."}
        warning={statusTarget === "inactive" ? "The organizer can still see the event in their dashboard and can reactivate it themselves." : undefined}
        onConfirm={handleStatusConfirm}
        confirmLabel={`Set ${statusTarget}`}
        loading={saving === "status"}
      >
        <ReasonTextarea value={statusReason} onChange={setStatusReason} />
      </ActionModal>

      <ActionModal
        open={suspendModal}
        onClose={() => { setSuspendModal(false); setSuspendReason("") }}
        title={event.suspended ? "Unsuspend this event?" : "Suspend this event?"}
        description="Suspension is the highest-level restriction available."
        warning={!event.suspended ? "The organizer immediately loses all access to this event. The event becomes invisible to everyone including collaborators and affiliates." : "Unsuspending will restore the event and allow the organizer to access it again."}
        onConfirm={handleSuspendConfirm}
        confirmLabel={event.suspended ? "Confirm Unsuspend" : "Confirm Suspend"}
        danger
        loading={saving === "suspend"}
      >
        <ReasonTextarea value={suspendReason} onChange={setSuspendReason} />
      </ActionModal>

      <ActionModal
        open={queueModal}
        onClose={() => { setQueueModal(false); setQueueReason("") }}
        title={event.virtualQueueEnabled ? "Disable the virtual queue?" : "Enable the virtual queue?"}
        description={event.virtualQueueEnabled
          ? "Buyers will go straight to checkout again, with no waiting room."
          : `Buyers will queue and be admitted to checkout in batches of ${event.queueBatchSize || 50}.`}
        warning={!event.virtualQueueEnabled ? "Turn this on for high-demand events to protect checkout and payment processing from being overwhelmed." : undefined}
        onConfirm={handleToggleQueueConfirm}
        confirmLabel={event.virtualQueueEnabled ? "Confirm Disable" : "Confirm Enable"}
        loading={saving === "queue"}
        confirmDisabled={!queueReason.trim()}
      >
        <ReasonTextarea value={queueReason} onChange={setQueueReason} />
      </ActionModal>

      <ActionModal
        open={queueSettingsModal}
        onClose={() => { setQueueSettingsModal(false); setQueueSettingsReason("") }}
        title="Edit queue settings"
        description="Controls how many buyers are admitted to checkout at once, and how long each one has before their slot is passed to the next person in line."
        onConfirm={handleUpdateQueueSettingsConfirm}
        confirmLabel="Save Settings"
        loading={saving === "queueSettings"}
        confirmDisabled={!queueSettingsReason.trim() || !batchSizeInput.trim() || !waitMinutesInput.trim()}
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Admitted at once</label>
            <input
              type="number"
              min={1}
              max={5000}
              value={batchSizeInput}
              onChange={(e) => setBatchSizeInput(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Wait time (minutes)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={waitMinutesInput}
              onChange={(e) => setWaitMinutesInput(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
            />
          </div>
        </div>
        <ReasonTextarea value={queueSettingsReason} onChange={setQueueSettingsReason} />
      </ActionModal>

      <ActionModal
        open={pricingModal}
        onClose={() => { setPricingModal(false); setPricingReason("") }}
        title="Edit platform fees"
        description="Sets the fee added on top of every ticket price for this event, going forward. Past purchases are unaffected."
        onConfirm={handleUpdatePricingConfirm}
        confirmLabel="Save Fees"
        loading={saving === "pricing"}
        confirmDisabled={!pricingReason.trim() || pctFeeInput.trim() === "" || flatFeeInput.trim() === ""}
      >
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Percentage fee (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={pctFeeInput}
              onChange={(e) => setPctFeeInput(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Flat fee (₦)</label>
            <input
              type="number"
              min={0}
              step="1"
              value={flatFeeInput}
              onChange={(e) => setFlatFeeInput(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-1">
          Platform default is 5% with no flat fee. Set flat fee to 0 to charge percentage only.
        </p>
        {isPricingCustomised && (
          <button
            type="button"
            onClick={handleResetPricingConfirm}
            disabled={saving === "pricing" || !pricingReason.trim()}
            className="text-xs font-semibold text-[#6b2fa5] hover:underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
          >
            Reset to platform default instead
          </button>
        )}
        <ReasonTextarea value={pricingReason} onChange={setPricingReason} placeholder="Reason for this fee change (required)…" />
      </ActionModal>

      <ActionModal
        open={feeBurdenModal}
        onClose={() => { setFeeBurdenModal(false); setFeeBurdenReason("") }}
        title="Change who pays Paystack's fee"
        description="Paystack's own processing fee (~1.5% + ₦100, capped at ₦2,000) is separate from the platform fee above. Choose who covers it for this event, going forward."
        warning={
          paystackPayerChoice === "organizer"
            ? "This reduces the organizer's payout on every ticket sold for this event by Paystack's fee amount."
            : paystackPayerChoice === "spotix"
              ? "This does not touch the organizer's payout — Spotix absorbs the shortfall out of its own platform-fee margin instead."
              : undefined
        }
        onConfirm={handleUpdateFeeBurdenConfirm}
        confirmLabel="Save Change"
        loading={saving === "feeBurden"}
        confirmDisabled={!feeBurdenReason.trim() || paystackPayerChoice === currentPaystackPayer}
      >
        <div className="space-y-2 mb-3">
          {([
            { value: "attendee" as const, label: "Attendee pays", hint: "Platform default — added on top of the total." },
            { value: "organizer" as const, label: "Organizer absorbs", hint: "Deducted from this event's payout balance." },
            { value: "spotix" as const, label: "Spotix absorbs", hint: "Organizer's payout is unaffected." },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaystackPayerChoice(opt.value)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                paystackPayerChoice === opt.value
                  ? "border-[#6b2fa5] bg-purple-50 text-[#6b2fa5]"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="block text-xs opacity-80 mt-0.5">{opt.hint}</span>
            </button>
          ))}
        </div>
        <ReasonTextarea value={feeBurdenReason} onChange={setFeeBurdenReason} placeholder="Reason for this change (required)…" />
      </ActionModal>

      <ActionModal
        open={deleteModal}
        onClose={() => { setDeleteModal(false); setDeleteConfirmText(""); setDeleteReason("") }}
        title="Delete this event?"
        description="The event will be moved out of Spotix. No one can find or access it until an admin restores it."
        warning="This affects all attendees, affiliates, and collaborators. Event data is preserved in deletedEvents and can be restored."
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete Event"
        confirmDisabled={deleteConfirmText !== event.eventName || !deleteReason.trim()}
        danger
        loading={saving === "delete"}
      >
        <ReasonTextarea value={deleteReason} onChange={setDeleteReason} placeholder="Reason for deletion (required)…" />
        <div className="space-y-1.5">
          <p className="text-xs text-slate-500">
            Type <strong className="text-slate-700">{event.eventName}</strong> to confirm
          </p>
          <input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={event.eventName}
            className="w-full text-sm bg-white border border-red-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300/60"
          />
        </div>
      </ActionModal>

      </>
      )}
      {/* end overview tab */}

    </div>
  )
}