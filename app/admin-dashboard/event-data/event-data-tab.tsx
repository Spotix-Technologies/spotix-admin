"use client"

import { useState } from "react"
import {
  MapPin, Calendar, Clock, Ticket, Users, TrendingUp, Heart,
  Flag, EyeOff, Eye, ShieldBan, Trash2, AlertTriangle,
  X, CheckCircle, DollarSign, Link2, Tag, Info,
} from "lucide-react"

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
  enabledCollaboration: boolean
  hasStopDate: boolean
  stopDate: string | null
  createdAt: string | null
  updatedAt: string | null
  attendeeCount: number
}

interface Props {
  eventData: EventData
  onUpdate: (updated: EventData) => void
  onDeleted: () => void
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
  open, onClose, title, description, warning, onConfirm, confirmLabel, danger, children, loading,
}: {
  open: boolean; onClose: () => void; title: string; description: string; warning?: string
  onConfirm: () => void; confirmLabel: string; danger?: boolean; children?: React.ReactNode; loading?: boolean
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
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${danger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-violet-600 hover:bg-violet-700 text-white"}`}
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
      className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400"
    />
  )
}

/* ── Main ── */
export default function EventDataTab({ eventData, onUpdate, onDeleted }: Props) {
  const [event, setEvent] = useState(eventData)
  const [activeImage, setActiveImage] = useState(event.eventImage)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const [flagModal, setFlagModal] = useState(false)
  const [flagReason, setFlagReason] = useState("")
  const [statusModal, setStatusModal] = useState(false)
  const [statusTarget, setStatusTarget] = useState<"active" | "inactive">("inactive")
  const [statusReason, setStatusReason] = useState("")
  const [suspendModal, setSuspendModal] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")
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

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

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
              <button key={i} onClick={() => setActiveImage(img)} className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${activeImage === img ? "border-violet-500" : "border-slate-200 opacity-60 hover:opacity-90"}`}>
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
        <StatCard label="Tickets Sold" value={event.ticketsSold} icon={Ticket} accent="text-violet-500" />
        <StatCard label="Total Revenue" value={money(event.totalRevenue)} icon={TrendingUp} accent="text-emerald-500" />
        <StatCard label="Paid Out" value={money(event.totalPaidOut)} icon={DollarSign} accent="text-amber-500" />
        <StatCard label="Likes" value={event.likeCount} icon={Heart} accent="text-pink-500" />
      </div>

      {/* Ticket tiers */}
      {event.ticketPrices.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-violet-500" />
            <h3 className="font-semibold text-sm text-slate-700">Ticket Tiers</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {event.ticketPrices.map((tier, i) => {
              const rev = (parseInt(tier.price) || 0) * (tier.ticketsSold || 0)
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
                      <p className="text-xs text-slate-400">{tier.ticketsSold} sold · {tier.availableTickets} left</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>{pct}% sold</span>
                      <span className="text-emerald-600 font-medium">{money(rev)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
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

      {/* ── DANGEROUS ZONE ── */}
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
        open={deleteModal}
        onClose={() => { setDeleteModal(false); setDeleteConfirmText(""); setDeleteReason("") }}
        title="Delete this event?"
        description="The event will be moved out of Spotix. No one can find or access it until an admin restores it."
        warning="This affects all attendees, affiliates, and collaborators. Event data is preserved in deletedEvents and can be restored."
        onConfirm={handleDeleteConfirm}
        confirmLabel="Delete Event"
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

    </div>
  )
}