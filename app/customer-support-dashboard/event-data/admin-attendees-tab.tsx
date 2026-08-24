"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Users, Download, FileJson, FileText, Search,
  Filter, X, Loader2, AlertCircle, Key, CheckCircle, Copy, Eye, EyeOff,
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

interface Props {
  eventId: string
  eventName: string
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminAttendeesTab({ eventId, eventName }: Props) {
  const [attendees, setAttendees] = useState<AttendeeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [verificationFilter, setVerificationFilter] = useState<"all" | "verified" | "unverified">("all")
  const [registryDialogOpen, setRegistryDialogOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // Customer-support/exec-assistant call their own attendees route,
        // separate from the admin dashboard's — see that route's header
        // comment for why. Previously this pointed at the admin-only
        // route, which meant this tab always came back 403 here.
        const res = await fetch(`/api/v1/support-event-data/attendees?eventId=${eventId}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to load attendees")
        setAttendees(json.attendees || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load attendees")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  const filtered = useMemo(() => {
    return attendees.filter((a) => {
      const matchesSearch =
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter =
        verificationFilter === "all" ||
        (verificationFilter === "verified" && a.verified) ||
        (verificationFilter === "unverified" && !a.verified)
      return matchesSearch && matchesFilter
    })
  }, [attendees, searchTerm, verificationFilter])

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Matches spotix-booker's attendees-tab export exactly:
   *  - JSON is wrapped in an { eventId, eventName, guests } envelope so the
   *    Scanner can store them against the imported guest list. The sync key
   *    itself is never embedded in the file — it's shown once, separately.
   *  - CSV is the full per-ticket row export — no de-duplication, no
   *    purchase-count toggle.
   */
  const handleExport = (format: "json" | "csv") => {
    const exportData = attendees.map((a) => ({
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
      const rows = exportData.map((row) =>
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

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-red-500 font-medium">{error}</p>
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5] placeholder:text-slate-400"
          />
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
          onClick={() => setRegistryDialogOpen(true)}
          disabled={attendees.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#6b2fa5] text-white font-semibold text-sm rounded-xl shadow-lg shadow-[#6b2fa5/25] hover:bg-[#5a2589] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Download size={16} />
          Download
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#6b2fa5] to-[#7d35c0] rounded-xl p-4 text-white shadow-lg shadow-[#6b2fa5/20]">
          <p className="text-xs font-medium text-white/80">Total</p>
          <p className="text-2xl font-bold mt-0.5">{attendees.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Verified</p>
          <p className="text-2xl font-bold text-emerald-600 mt-0.5">
            {attendees.filter((a) => a.verified).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-amber-500 mt-0.5">
            {attendees.filter((a) => !a.verified).length}
          </p>
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
      </div>

      <RegistryDialog
        open={registryDialogOpen}
        onClose={() => setRegistryDialogOpen(false)}
        onExport={handleExport}
        attendeeCount={attendees.length}
        eventId={eventId}
        eventName={eventName}
      />
    </div>
  )
}
