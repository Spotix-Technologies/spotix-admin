"use client"

import { useState, useRef } from "react"
import {
  Receipt, Search, X, AlertTriangle, CheckCircle, Clock, XCircle,
  User, Calendar, Tag, Ticket, Wallet, Percent, Gift,
  Trash2, ShieldCheck, Copy, Check,
} from "lucide-react"

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface TicketTypeRow {
  type: string
  quantity: number
  price: number
}

interface GeneratedTicket {
  ticketId: string
  ticketType: string
  ticketPrice: number
  fullName: string
  email: string
  phoneNumber: string
  verified: boolean
  purchaseDate: string
  purchaseTime: string
}

interface ReferenceData {
  reference: string
  status: string
  vendor: string
  createdAt: string | null
  updatedAt: string | null
  paymentCreationDate: string | null
  deletionEligible: boolean
  deletionEligibleAt: string | null

  userId: string | null
  userEmail: string | null
  userFullName: string | null
  userPhone: string | null
  isGuest: boolean

  bookerName: string | null
  bookerEmail: string | null

  eventId: string | null
  eventCreatorId: string | null
  eventName: string
  eventVenue: string
  eventType: string
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  stopDate: string | null

  ticketTypes: TicketTypeRow[]
  ticketType: string
  ticketPrice: number
  transactionFee: number
  totalAmount: number
  totalTicketCount: number

  discountCode: string | null
  discountData: unknown
  referralCode: string | null
  referralName: string | null

  ticketGenerated: boolean
  ticketGeneratedAt: string | null
  totalTicketsGenerated: number
  tickets: GeneratedTicket[]
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const money = (n: number) => `₦${(n || 0).toLocaleString()}`

const fmtDateTime = (d: string | null) => {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleString("en-NG", {
      weekday: "short", year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    })
  } catch { return d }
}

function timeRemaining(targetIso: string | null): string {
  if (!targetIso) return ""
  const ms = new Date(targetIso).getTime() - Date.now()
  if (ms <= 0) return "now"
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  successful: { label: "Paid", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
}

/* ─────────────────────────────────────────────
   SMALL UI PRIMITIVES
───────────────────────────────────────────── */
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#6b2fa5]" />
        <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  )
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <p className="text-base font-bold text-gray-900">{value}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────
   DELETE MODAL
───────────────────────────────────────────── */
function DeleteModal({
  open, onClose, onConfirm, loading, reference,
}: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void; loading: boolean; reference: string
}) {
  const [reason, setReason] = useState("")
  const [confirmText, setConfirmText] = useState("")

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-red-100 bg-red-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-base text-red-700">Delete this reference?</h3>
              <p className="text-sm text-gray-500 mt-1">This permanently removes the pending payment reference.</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>The buyer will need to restart checkout if they return to complete this payment. This cannot be undone.</span>
          </div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for deleting this reference (required)…"
            rows={3}
            className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
          />
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">
              Type <strong className="text-gray-700">{reference}</strong> to confirm
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={reference}
              className="w-full text-sm bg-white border border-red-200 rounded-lg px-3 py-2.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300/60"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <button onClick={onClose} disabled={loading} className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !reason.trim() || confirmText !== reference}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? "Deleting…" : "Delete Reference"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN
───────────────────────────────────────────── */
export function ReferencesClient() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ReferenceData | null>(null)
  const [copied, setCopied] = useState(false)

  const [deleteModal, setDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleLookup = async () => {
    const ref = query.trim()
    if (!ref) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/v1/references?reference=${encodeURIComponent(ref)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Reference not found")
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to look up reference")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (!data) return
    navigator.clipboard.writeText(data.reference).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleDelete = async (reason: string) => {
    if (!data) return
    setDeleting(true)
    try {
      const res = await fetch("/api/v1/references", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: data.reference, reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to delete reference")
      setDeleteModal(false)
      showToast("Reference deleted", "success")
      setData(null)
      setQuery("")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete reference", "error")
    } finally {
      setDeleting(false)
    }
  }

  const statusMeta = data ? (STATUS_META[data.status] || STATUS_META.pending) : null
  const StatusIcon = statusMeta?.icon ?? Clock

  return (
    <div className="space-y-5 p-4 md:p-6 pb-10 max-w-3xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-red-400" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center">
          <Receipt className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">References</h1>
          <p className="text-xs text-gray-500">Look up a payment reference to review its status, tickets, and event details</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Search className="w-4 h-4 text-gray-400 ml-1.5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            placeholder="Paste a payment reference, e.g. SPTX-REF-1750000000000"
            className="flex-1 min-w-0 bg-transparent px-1 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none font-mono"
            autoComplete="off"
          />
          {query && (
            <button onClick={() => { setQuery(""); setData(null); setError(null); inputRef.current?.focus() }} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleLookup}
          disabled={loading || !query.trim()}
          className="w-full sm:w-auto shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-[#6b2fa5] text-white hover:bg-[#5a2589] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Looking up…" : "Look up"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Result */}
      {data && (
        <div className="space-y-5">

          {/* Status / summary card */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2 font-mono text-sm text-gray-600">
                <span>{data.reference}</span>
                <button onClick={handleCopy} className="text-gray-400 hover:text-[#6b2fa5] transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${statusMeta!.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusMeta!.label}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Tickets" value={data.totalTicketCount} icon={Ticket} />
              <StatCard label="Subtotal" value={money(data.ticketPrice)} icon={Wallet} />
              <StatCard label="Transaction Fee" value={money(data.transactionFee)} icon={Percent} />
              <StatCard label="Total Paid" value={money(data.totalAmount)} icon={Wallet} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
              <span>Created: {fmtDateTime(data.createdAt)}</span>
              <span>Updated: {fmtDateTime(data.updatedAt)}</span>
              <span>Vendor: {data.vendor}</span>
            </div>
          </div>

          {/* Buyer */}
          <SectionCard title="Buyer" icon={User}>
            <div className="space-y-0.5">
              <DataRow label="Name" value={data.userFullName || "—"} />
              <DataRow label="Email" value={data.userEmail || "—"} />
              <DataRow label="Phone" value={data.userPhone || "—"} />
              <DataRow label="Account Type" value={data.isGuest ? "Guest checkout" : "Registered user"} />
              {data.userId && !data.isGuest && <DataRow label="User ID" value={<span className="font-mono text-xs">{data.userId}</span>} />}
            </div>
          </SectionCard>

          {/* Event */}
          <SectionCard title="Event Paid For" icon={Calendar}>
            <div className="space-y-0.5">
              <DataRow label="Event" value={data.eventName || "—"} />
              <DataRow label="Venue" value={data.eventVenue || "—"} />
              <DataRow label="Type" value={data.eventType || "—"} />
              <DataRow label="Date" value={data.eventDate ? fmtDateTime(data.eventDate) : "—"} />
              <DataRow label="Time" value={data.eventStart && data.eventEnd ? `${data.eventStart} – ${data.eventEnd}` : "—"} />
              <DataRow label="Organizer" value={data.bookerName || "—"} />
              <DataRow label="Organizer Email" value={data.bookerEmail || "—"} />
              {data.eventId && <DataRow label="Event ID" value={<span className="font-mono text-xs">{data.eventId}</span>} />}
            </div>
          </SectionCard>

          {/* Ticket breakdown */}
          <SectionCard title="Ticket Breakdown" icon={Tag}>
            {data.ticketTypes.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {data.ticketTypes.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-gray-700">{t.type} <span className="text-gray-400">× {t.quantity}</span></span>
                    <span className="font-semibold text-gray-800">{t.price === 0 ? "Free" : money(t.price * t.quantity)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No ticket type breakdown available.</p>
            )}
            {(data.discountCode || data.referralCode) && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                {data.discountCode && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Percent className="w-3 h-3 text-emerald-500" />
                    Discount applied: <span className="font-mono text-gray-700">{data.discountCode}</span>
                  </div>
                )}
                {data.referralCode && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Gift className="w-3 h-3 text-violet-500" />
                    Referral: <span className="font-mono text-gray-700">{data.referralName || data.referralCode}</span>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Generated tickets */}
          <SectionCard title={`Tickets Generated (${data.totalTicketsGenerated})`} icon={Ticket}>
            {data.ticketGenerated && data.tickets.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {data.tickets.map((t) => (
                  <div key={t.ticketId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-700 truncate">{t.ticketId}</p>
                      <p className="text-xs text-gray-400 truncate">{t.ticketType} · {t.fullName || "—"}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${t.verified ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                      {t.verified ? "Checked In" : "Not Checked In"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No tickets have been generated for this reference yet.</p>
            )}
          </SectionCard>

          {/* Danger zone */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-red-200 bg-red-50 flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-red-500" />
              <h3 className="font-semibold text-sm text-red-700">Delete Reference</h3>
            </div>
            <div className="p-5">
              {data.status === "successful" ? (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                  <span>This reference is paid and cannot be deleted.</span>
                </div>
              ) : data.status !== "pending" ? (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                  <span>Only pending references can be deleted from here.</span>
                </div>
              ) : data.ticketGenerated ? (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                  <span>Tickets already exist for this reference, so it cannot be deleted.</span>
                </div>
              ) : !data.deletionEligible ? (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-2.5 text-sm text-gray-600 max-w-md">
                    <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <span>Pending references can only be deleted 24 hours after creation. Eligible in {timeRemaining(data.deletionEligibleAt)}.</span>
                  </div>
                  <button disabled className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed">
                    Delete
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <p className="text-sm text-gray-600 max-w-md">
                    This pending reference is older than 24 hours and is eligible for deletion.
                  </p>
                  <button
                    onClick={() => setDeleteModal(true)}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 bg-white text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="text-center py-16 text-gray-400">
          <Receipt className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Paste a payment reference above to view its details.</p>
        </div>
      )}

      <DeleteModal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        loading={deleting}
        reference={data?.reference || ""}
      />
    </div>
  )
}
