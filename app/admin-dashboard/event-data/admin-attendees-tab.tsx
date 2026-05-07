"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Users, Download, FileJson, FileText, Search,
  Filter, Shield, ChevronUp, X, Loader2, AlertCircle,
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

// ── Export Dialog ─────────────────────────────────────────────────────────────
function ExportDialog({
  open,
  onClose,
  attendees,
  eventId,
}: {
  open: boolean
  onClose: () => void
  attendees: AttendeeData[]
  eventId: string
}) {
  const [mode, setMode] = useState<"guests" | "csv" | null>(null)
  const [includePurchaseCount, setIncludePurchaseCount] = useState(false)

  // Build purchase count map: email → count (must be before any early return)
  const purchaseCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of attendees) {
      const key = a.email.toLowerCase()
      map[key] = (map[key] ?? 0) + 1
    }
    return map
  }, [attendees])

  if (!open) return null

  const handleGuestsDownload = () => {
    const exportData = attendees.map((a) => ({
      fullName: a.fullName,
      email: a.email,
      ticketId: a.id,
      ticketType: a.ticketType,
      facialEnroll: a.facialEnroll,
      ...(a.faceEmbedding ? { faceEmbedding: a.faceEmbedding } : {}),
    }))
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    triggerDownload(blob, `spotix_guests_${eventId}.json`)
    onClose()
  }

  const handleCsvDownload = () => {
    const headers = includePurchaseCount
      ? ["fullName", "email", "purchaseCount"]
      : ["fullName", "email"]

    // De-duplicate by email for CSV (unique attendees with purchase count)
    const seen = new Set<string>()
    const rows: string[] = []
    for (const a of attendees) {
      const key = a.email.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      const row = includePurchaseCount
        ? [`"${a.fullName}"`, `"${a.email}"`, `"${purchaseCountMap[key]}"`]
        : [`"${a.fullName}"`, `"${a.email}"`]
      rows.push(row.join(","))
    }
    const csv = [headers.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    triggerDownload(blob, `spotix_attendees_${eventId}.csv`)
    onClose()
  }

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Export Attendees</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {attendees.length} attendee{attendees.length !== 1 ? "s" : ""} in this event
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-4">
          {/* Option: guests.json */}
          <button
            onClick={() => setMode("guests")}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              mode === "guests"
                ? "border-violet-500 bg-violet-50"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${mode === "guests" ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500"}`}>
              <FileJson size={22} />
            </div>
            <div>
              <p className={`text-sm font-bold ${mode === "guests" ? "text-violet-700" : "text-slate-800"}`}>
                Download guests.json
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Full guest registry with face embeddings — for Scanner tool import
              </p>
            </div>
          </button>

          {/* Option: CSV export */}
          <button
            onClick={() => setMode("csv")}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
              mode === "csv"
                ? "border-violet-500 bg-violet-50"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div className={`p-2.5 rounded-lg ${mode === "csv" ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-500"}`}>
              <FileText size={22} />
            </div>
            <div>
              <p className={`text-sm font-bold ${mode === "csv" ? "text-violet-700" : "text-slate-800"}`}>
                Export attendee data (CSV)
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Name, email — optionally with purchase count
              </p>
            </div>
          </button>

          {/* Purchase count toggle — only shown when CSV is selected */}
          {mode === "csv" && (
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-700">Include purchase count</p>
                <p className="text-xs text-slate-500">
                  Shows how many tickets each email purchased
                </p>
              </div>
              <button
                onClick={() => setIncludePurchaseCount((v) => !v)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  includePurchaseCount ? "bg-violet-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    includePurchaseCount ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          )}

          {/* Fields preview */}
          {mode && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Exported Fields
              </p>
              <div className="flex flex-wrap gap-1.5">
                {mode === "guests"
                  ? ["fullName", "email", "ticketId", "ticketType", "facialEnroll", "faceEmbedding"].map((f) => (
                      <span key={f} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-mono rounded-lg">
                        {f}
                      </span>
                    ))
                  : ["fullName", "email", ...(includePurchaseCount ? ["purchaseCount"] : [])].map((f) => (
                      <span key={f} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-mono rounded-lg">
                        {f}
                      </span>
                    ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={mode === "guests" ? handleGuestsDownload : handleCsvDownload}
            disabled={!mode}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
              mode
                ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/25"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Download size={16} />
            {mode === "guests" ? "Download JSON" : mode === "csv" ? "Export CSV" : "Export"}
          </button>
        </div>
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
  const [exportOpen, setExportOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/v1/event-data/attendees?eventId=${eventId}`)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-violet-500 mx-auto" />
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
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 placeholder:text-slate-400"
          />
        </div>
        <div className="relative md:w-52">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as "all" | "verified" | "unverified")}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 appearance-none cursor-pointer"
          >
            <option value="all">All Attendees</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          disabled={attendees.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-500/25 hover:bg-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-violet-600 to-violet-500 rounded-xl p-4 text-white shadow-lg shadow-violet-500/20">
          <p className="text-xs font-medium text-violet-100">Total</p>
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
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-violet-400 flex items-center justify-center text-white font-semibold text-xs shadow-sm shrink-0">
                          {a.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-800">{a.fullName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-slate-600">{a.email}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold border border-violet-100">
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
                          className="text-xs text-violet-600 font-semibold hover:underline"
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

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        attendees={attendees}
        eventId={eventId}
      />
    </div>
  )
}
