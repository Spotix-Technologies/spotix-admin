"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Users, Download, FileJson, FileText, Search,
  Filter, X, Loader2, AlertCircle, Key, CheckCircle, Copy, Eye, EyeOff,
  UserPlus, Ticket, ChevronDown,
} from "lucide-react"

interface AttendeeData {
  id: string
  fullName: string
  email: string
  ticketType: string
  verified: boolean
  purchaseDate: string
  ticketReference: string
  facialEnroll: "enrolled" | "unenrolled"
  faceEmbedding?: number[] | null
}

interface TicketTier {
  policy: string
  price: string
}

interface Props {
  eventId: string
  eventName: string
  /** Canonical ticket types/prices for this event — powers the "Add
   *  attendee" dialog's ticket type dropdown. Optional so existing
   *  callers that haven't been updated yet still compile; the dialog
   *  just won't have any ticket types to offer until it's passed. */
  ticketPrices?: TicketTier[]
}

type Step = "format" | "generating" | "key-reveal" | "done"

/**
 * Registry export dialog — mirrors spotix-booker's attendees-tab export
 * ceremony exactly:
 *   - CSV downloads immediately, no key involved.
 *   - JSON first mints a Scanner sync key (admin/event-data/sync-key,
 *     which writes the same events/{eventId}.syncKey field booker does),
 *     reveals it once, then downloads the envelope-wrapped JSON.
 */
function RegistryDialog({
  open,
  onClose,
  onExport,
  attendeeCount,
  eventId,
  eventName,
}: {
  open: boolean
  onClose: () => void
  onExport: (format: "json" | "csv") => void
  attendeeCount: number
  eventId: string
  eventName: string
}) {
  const [selectedFormat, setSelectedFormat] = useState<"json" | "csv" | null>(null)
  const [step, setStep] = useState<Step>("format")
  const [secretKey, setSecretKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [keyVisible, setKeyVisible] = useState(false)

  if (!open) return null

  const handleExport = async () => {
    if (!selectedFormat) return

    // CSV export has no key ceremony — download directly
    if (selectedFormat === "csv") {
      onExport("csv")
      handleClose()
      return
    }

    // JSON export: generate sync key first
    setStep("generating")
    setError(null)

    try {
      const res = await fetch("/api/v1/event-data/sync-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Server returned ${res.status}`)

      setSecretKey(data.key)
      setStep("key-reveal")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate sync key")
      setStep("format")
    }
  }

  const handleProceedDownload = () => {
    onExport("json")
    setStep("done")
  }

  const handleClose = () => {
    onClose()
    setTimeout(() => {
      setSelectedFormat(null)
      setStep("format")
      setSecretKey(null)
      setError(null)
      setCopied(false)
      setKeyVisible(false)
    }, 200)
  }

  const handleCopy = () => {
    if (!secretKey) return
    navigator.clipboard.writeText(secretKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step === "generating" ? undefined : handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">

        {/* ── Step: format selection ── */}
        {(step === "format" || step === "generating") && (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Download Attendees</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {attendeeCount} attendee{attendeeCount !== 1 ? "s" : ""} will be exported
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={step === "generating"}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-40"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                Choose Export Format
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setSelectedFormat("json")}
                  disabled={step === "generating"}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-left ${
                    selectedFormat === "json"
                      ? "border-[#6b2fa5] bg-[#6b2fa5/5] shadow-md shadow-[#6b2fa5/10]"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {selectedFormat === "json" && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#6b2fa5]" />
                  )}
                  <div className={`p-3 rounded-xl transition-all ${
                    selectedFormat === "json" ? "bg-[#6b2fa5] text-white shadow-lg shadow-[#6b2fa5/30]" : "bg-slate-100 text-slate-500"
                  }`}>
                    <FileJson size={28} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${selectedFormat === "json" ? "text-[#6b2fa5]" : "text-slate-700"}`}>JSON</p>
                    <p className="text-xs text-slate-400 mt-0.5">.json file</p>
                  </div>
                </button>

                <button
                  onClick={() => setSelectedFormat("csv")}
                  disabled={step === "generating"}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-left ${
                    selectedFormat === "csv"
                      ? "border-[#6b2fa5] bg-[#6b2fa5/5] shadow-md shadow-[#6b2fa5/10]"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {selectedFormat === "csv" && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#6b2fa5]" />
                  )}
                  <div className={`p-3 rounded-xl transition-all ${
                    selectedFormat === "csv" ? "bg-[#6b2fa5] text-white shadow-lg shadow-[#6b2fa5/30]" : "bg-slate-100 text-slate-500"
                  }`}>
                    <FileText size={28} />
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${selectedFormat === "csv" ? "text-[#6b2fa5]" : "text-slate-700"}`}>CSV</p>
                    <p className="text-xs text-slate-400 mt-0.5">.csv file</p>
                  </div>
                </button>
              </div>

              {selectedFormat === "json" && (
                <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <Key size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    A <strong>secret sync key</strong> will be generated for this event. It is used to sync check-ins back from Spotix Scanner.
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Exported Fields</p>
                <div className="flex flex-wrap gap-2">
                  {["eventId", "eventName", "fullName", "email", "ticketId", "ticketType", "facialEnroll", "faceEmbedding"].map((field) => (
                    <span
                      key={field}
                      className={`inline-flex items-center px-2.5 py-1 border text-xs font-mono rounded-lg ${
                        ["eventId", "eventName"].includes(field)
                          ? "bg-[#6b2fa5/5] border-[#6b2fa5/30] text-[#6b2fa5]"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleClose}
                disabled={step === "generating"}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!selectedFormat || step === "generating"}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                  selectedFormat && step !== "generating"
                    ? "bg-[#6b2fa5] text-white hover:bg-[#5a2589] shadow-lg shadow-[#6b2fa5/30]"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                }`}
              >
                {step === "generating" ? (
                  <><Loader2 size={16} className="animate-spin" /> Generating key...</>
                ) : (
                  <><Download size={16} /> Export {selectedFormat ? selectedFormat.toUpperCase() : ""}</>
                )}
              </button>
            </div>
          </>
        )}

        {/* ── Step: key reveal ── */}
        {step === "key-reveal" && secretKey && (
          <>
            <div className="px-6 pt-6 pb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#6b2fa5/5] flex items-center justify-center mb-4">
                <Key size={24} className="text-[#6b2fa5]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sync Key</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Save this key — it is required to sync check-in results back to{" "}
                <span className="font-semibold text-slate-700">{eventName}</span>. It will not be shown again.
              </p>
            </div>

            <div className="px-6 py-5">
              <div className="relative bg-slate-900 rounded-xl p-4 font-mono">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Sync Key</p>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold tracking-[0.2em] text-white flex-1">
                    {keyVisible ? secretKey : "••••••••••••"}
                  </p>
                  <button
                    onClick={() => setKeyVisible((v) => !v)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title={keyVisible ? "Hide key" : "Reveal key"}
                  >
                    {keyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`p-1.5 transition-colors ${copied ? "text-emerald-400" : "text-slate-400 hover:text-white"}`}
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 leading-relaxed">
                ⚠️ <strong>Store this key securely.</strong> It is entered in the Spotix Scanner sync page to push check-in data back to Spotix. This key is tied to <strong>{eventName}</strong> and replaces any previously issued key for this event.
              </div>
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleProceedDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-[#6b2fa5] text-white hover:bg-[#5a2589] shadow-lg shadow-[#6b2fa5/30] transition-all"
              >
                <Download size={16} />
                I've saved the key — Download
              </button>
            </div>
          </>
        )}

        {/* ── Step: done ── */}
        {step === "done" && (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Guest list exported!</h3>
              <p className="text-sm text-slate-500 mt-1">Import the JSON file into Spotix Scanner to begin check-ins.</p>
            </div>
            <button
              onClick={handleClose}
              className="mt-2 px-8 py-2.5 rounded-xl bg-[#6b2fa5] text-white font-semibold text-sm hover:bg-[#5a2589] transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Add Attendee dialog — manually issues ticket(s) for a walk-in / offline
 * / comped attendee. Posts to /api/v1/event-data/attendees, which writes
 * a Reference doc pre-marked "successful" and hands it to spotix-backend's
 * POST /v1/ticket — the same generateTickets() pipeline every Paystack
 * purchase goes through, so the resulting ticket(s) and attendee row are
 * indistinguishable from a normal sale.
 */
function AddAttendeeDialog({
  open,
  onClose,
  onIssued,
  eventId,
  ticketPrices,
}: {
  open: boolean
  onClose: () => void
  onIssued: () => void
  eventId: string
  ticketPrices: TicketTier[]
}) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [ticketType, setTicketType] = useState(ticketPrices[0]?.policy ?? "")
  const [quantity, setQuantity] = useState(1)
  const [referralCode, setReferralCode] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issued, setIssued] = useState<{ ticketIds: string[]; totalTickets: number } | null>(null)

  if (!open) return null

  const reset = () => {
    setFullName("")
    setEmail("")
    setPhone("")
    setTicketType(ticketPrices[0]?.policy ?? "")
    setQuantity(1)
    setReferralCode("")
    setError(null)
    setIssued(null)
  }

  const handleClose = () => {
    onClose()
    setTimeout(reset, 200)
  }

  const handleSubmit = async () => {
    if (!fullName.trim() || !email.trim() || !ticketType) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/event-data/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          ticketType,
          quantity,
          referralCode: referralCode.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? `Server returned ${res.status}`)

      setIssued({ ticketIds: data.ticketIds ?? [], totalTickets: data.totalTickets ?? quantity })
      onIssued()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add attendee")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={submitting ? undefined : handleClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {!issued ? (
          <>
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Attendee</h3>
                <p className="text-sm text-slate-500 mt-0.5">Manually issue a ticket for this event</p>
              </div>
              <button
                onClick={handleClose}
                disabled={submitting}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-40"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5] placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane@example.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5] placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5] placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ticket Type</label>
                  <div className="relative">
                    <select
                      value={ticketType}
                      onChange={(e) => setTicketType(e.target.value)}
                      disabled={ticketPrices.length === 0}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {ticketPrices.length === 0 && <option value="">No ticket types</option>}
                      {ticketPrices.map((t) => (
                        <option key={t.policy} value={t.policy}>
                          {t.policy} (₦{Number(t.price).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Referral (optional)</label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  placeholder="Referral code, if any"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5] placeholder:text-slate-400"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white transition-all disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !fullName.trim() || !email.trim() || !ticketType}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                  submitting || !fullName.trim() || !email.trim() || !ticketType
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-[#6b2fa5] text-white hover:bg-[#5a2589] shadow-lg shadow-[#6b2fa5/30]"
                }`}
              >
                {submitting ? (
                  <><Loader2 size={16} className="animate-spin" /> Issuing...</>
                ) : (
                  <><Ticket size={16} /> Add Attendee</>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {issued.totalTickets} ticket{issued.totalTickets !== 1 ? "s" : ""} issued
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {fullName} has been added to the attendee list.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-2 px-8 py-2.5 rounded-xl bg-[#6b2fa5] text-white font-semibold text-sm hover:bg-[#5a2589] transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminAttendeesTab({ eventId, eventName, ticketPrices = [] }: Props) {
  // Paginated browse state — what's actually been read from the server so far.
  const [items, setItems] = useState<AttendeeData[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Aggregate stats from the server (cheap count() queries — accurate
  // regardless of how many rows are currently loaded on screen).
  const [totalCount, setTotalCount] = useState(0)
  const [verifiedCount, setVerifiedCount] = useState(0)
  const [unverifiedCount, setUnverifiedCount] = useState(0)

  const [searchTerm, setSearchTerm] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all")
  const [registryDialogOpen, setRegistryDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [addAttendeeDialogOpen, setAddAttendeeDialogOpen] = useState(false)

  // Search — searches the FULL roster, not just what's paginated in. Fetched
  // once on first search (or export) and cached for the rest of the tab's
  // lifetime so repeated typing/downloads don't re-fetch every time.
  const [fullRoster, setFullRoster] = useState<AttendeeData[] | null>(null)
  const [searchingFullRoster, setSearchingFullRoster] = useState(false)
  const rosterFetchStarted = useRef(false)

  const baseUrl = "/api/v1/event-data/attendees"

  // ── Initial page load: first 15 attendees only ──
  useEffect(() => {
    let cancelled = false
    setItems([])
    setCursor(null)
    setFullRoster(null)
    rosterFetchStarted.current = false
    async function loadFirstPage() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${baseUrl}?eventId=${eventId}&limit=15`)
        const json = await res.json()
        if (!res.ok || !json.success) throw new Error(json.error || "Failed to load attendees")
        if (cancelled) return
        setItems(json.attendees ?? [])
        setCursor(json.nextCursor ?? null)
        setHasMore(Boolean(json.hasMore))
        setTotalCount(json.totalCount ?? 0)
        setVerifiedCount(json.verifiedCount ?? 0)
        setUnverifiedCount(json.unverifiedCount ?? 0)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load attendees")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadFirstPage()
    return () => { cancelled = true }
  }, [eventId])

  // ── Refresh after a manually-issued attendee — re-pulls the first page
  // and drops the cached full roster so search/export pick up the new row. ──
  const refreshAfterAdd = async () => {
    setFullRoster(null)
    rosterFetchStarted.current = false
    try {
      const res = await fetch(`${baseUrl}?eventId=${eventId}&limit=15`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to refresh attendees")
      setItems(json.attendees ?? [])
      setCursor(json.nextCursor ?? null)
      setHasMore(Boolean(json.hasMore))
      setTotalCount(json.totalCount ?? 0)
      setVerifiedCount(json.verifiedCount ?? 0)
      setUnverifiedCount(json.unverifiedCount ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh attendees")
    }
  }

  // ── Load 15 more ──
  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(`${baseUrl}?eventId=${eventId}&limit=15&cursor=${encodeURIComponent(cursor)}`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load more attendees")
      setItems((prev) => [...prev, ...(json.attendees ?? [])])
      setCursor(json.nextCursor ?? null)
      setHasMore(Boolean(json.hasMore))
      setTotalCount(json.totalCount ?? totalCount)
      setVerifiedCount(json.verifiedCount ?? verifiedCount)
      setUnverifiedCount(json.unverifiedCount ?? unverifiedCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load more attendees")
    } finally {
      setLoadingMore(false)
    }
  }

  // ── Fetch the full roster once a search is actually typed in, or an
  // export is requested — both genuinely need every record. ──
  const ensureFullRoster = async () => {
    if (fullRoster || rosterFetchStarted.current) return fullRoster
    rosterFetchStarted.current = true
    setSearchingFullRoster(true)
    try {
      const res = await fetch(`${baseUrl}?eventId=${eventId}&all=true`)
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Search failed")
      setFullRoster(json.attendees ?? [])
      return json.attendees ?? []
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed")
      rosterFetchStarted.current = false // allow retry
      return null
    } finally {
      setSearchingFullRoster(false)
    }
  }

  useEffect(() => {
    if (searchTerm.trim()) { ensureFullRoster() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const isSearching = searchTerm.trim().length > 0

  // While actively searching, filter over the full roster (once it's
  // arrived). Otherwise, show whatever's been paginated in so far.
  const sourceList = isSearching ? (fullRoster ?? []) : items

  const filtered = useMemo(() => {
    return sourceList.filter((a) => {
      const matchesSearch =
        !isSearching ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && a.verified) ||
        (verificationFilter === "unverified" && !a.verified)
      return matchesSearch && matchesFilter
    })
  }, [sourceList, searchTerm, verificationFilter, isSearching])

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Export always needs the COMPLETE guest list, so it fetches (or reuses
   * the already-cached) full roster regardless of how many rows are
   * currently paginated into view — same as spotix-booker's attendees-tab.
   */
  const handleExport = async (format: "json" | "csv") => {
    setExporting(true)
    try {
      const all = fullRoster ?? (await ensureFullRoster())
      if (!all) throw new Error("Failed to load attendees for export")

      const exportData = all.map((a: AttendeeData) => ({
        fullName: a.fullName,
        email: a.email,
        ticketId: a.id,
        ticketType: a.ticketType,
        facialEnroll: a.facialEnroll,
        ...(a.faceEmbedding ? { faceEmbedding: a.faceEmbedding } : {}),
      }))

      const fileName = `spotix_${eventId}`

      if (format === "json") {
        const envelope = { eventId, eventName, guests: exportData }
        const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" })
        triggerDownload(blob, `${fileName}.json`)
      } else {
        const headers = ["fullName", "email", "ticketId", "ticketType", "facialEnroll", "faceEmbedding"]
        const rows = exportData.map((row: (typeof exportData)[number]) =>
          headers
            .map((h) => {
              const value = row[h as keyof typeof row]
              if (Array.isArray(value)) return `"${(value as number[]).join("|")}"`
              return `"${String(value ?? "").replace(/"/g, '""')}"`
            })
            .join(",")
        )
        const csv = [headers.join(","), ...rows].join("\n")
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
        triggerDownload(blob, `${fileName}.csv`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed")
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#6b2fa5] mx-auto" />
          <p className="text-sm text-slate-500">Loading attendees…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5] placeholder:text-slate-400"
          />
          {isSearching && searchingFullRoster && (
            <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b2fa5] animate-spin" />
          )}
        </div>
        <div className="relative md:w-52">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as "all" | "verified" | "unverified")}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] appearance-none cursor-pointer"
          >
            <option value="all">All Attendees</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
        <button
          onClick={() => setAddAttendeeDialogOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-[#6b2fa5/20] text-[#6b2fa5] font-semibold text-sm rounded-xl hover:bg-[#6b2fa5/5] transition-all whitespace-nowrap"
        >
          <UserPlus size={16} />
          Add Attendee
        </button>
        <button
          onClick={() => setRegistryDialogOpen(true)}
          disabled={totalCount === 0 || exporting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6b2fa5] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#6b2fa5/25] hover:bg-[#5a2589] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Stats — from server aggregates, accurate even before everything's loaded */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#6b2fa5] to-[#7d35c0] rounded-xl p-4 text-white shadow-lg shadow-[#6b2fa5/20]">
          <p className="text-xs font-medium text-white/80">Total</p>
          <p className="text-2xl font-bold mt-0.5">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Verified</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">{verifiedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-amber-500 mt-0.5">{unverifiedCount}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Reference</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Ticket Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Face</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold text-slate-700 font-mono">{a.ticketReference}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6b2fa5] to-[#8b4fc5] flex items-center justify-center text-white font-semibold text-xs shadow-sm shrink-0">
                          {a.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{a.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">{a.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 bg-[#6b2fa5/5] text-[#6b2fa5] rounded-lg text-xs font-semibold border border-[#6b2fa5/20]">
                        {a.ticketType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-500">{a.purchaseDate}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        a.facialEnroll === "enrolled"
                          ? "bg-blue-50 text-blue-700 border-blue-100"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {a.facialEnroll === "enrolled" ? "✓ Enrolled" : "○ None"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        a.verified
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-amber-50 text-amber-700 border-amber-100"
                      }`}>
                        {a.verified ? "✓ Verified" : "⏳ Pending"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users size={24} className="text-slate-400" />
                      </div>
                      <p className="text-slate-500 text-sm font-medium">
                        {searchTerm || verificationFilter !== "all"
                          ? "No attendees match your search"
                          : "No attendees yet"}
                      </p>
                      {(searchTerm || verificationFilter !== "all") && (
                        <button
                          onClick={() => { setSearchTerm(""); setVerificationFilter("all") }}
                          className="text-xs text-[#6b2fa5] font-semibold hover:underline"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Load more — only shown in the default (non-search) paginated view */}
        {!isSearching && hasMore && (
          <div className="flex justify-center py-4 border-t border-slate-100">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-5 py-2 rounded-xl border-2 border-[#6b2fa5/20] text-[#6b2fa5] text-sm font-semibold hover:bg-[#6b2fa5/5] transition-colors disabled:opacity-50"
            >
              {loadingMore ? (
                <><Loader2 size={16} className="animate-spin" /> Loading…</>
              ) : (
                <>Load 15 more ({items.length} of {totalCount})</>
              )}
            </button>
          </div>
        )}
      </div>

      <RegistryDialog
        open={registryDialogOpen}
        onClose={() => setRegistryDialogOpen(false)}
        onExport={handleExport}
        attendeeCount={totalCount}
        eventId={eventId}
        eventName={eventName}
      />

      <AddAttendeeDialog
        open={addAttendeeDialogOpen}
        onClose={() => setAddAttendeeDialogOpen(false)}
        onIssued={refreshAfterAdd}
        eventId={eventId}
        ticketPrices={ticketPrices}
      />
    </div>
  )
}
