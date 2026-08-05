"use client"

import { useState, useEffect } from "react"
import {
  Loader2, AlertCircle, CheckCircle2, ShieldCheck, User, FileText,
  Camera, MapPin, RefreshCw, Copy, Check, ExternalLink, Search, X, UserX,
} from "lucide-react"

const DOC_TYPE_LABELS: Record<string, string> = {
  nin: "National ID (NIN)",
  passport: "International Passport",
  bvn: "Bank Verification Number (BVN)",
  votersCard: "Voter's Card",
  driversLicense: "Driver's License",
}

interface AgentVerificationRequest {
  userId: string
  fullName: string
  email: string
  phone: string | null
  selfieUrl: string | null
  proofOfAddressUrl: string | null
  documentType: string
  documentNumber: string
  documentImageUrl: string | null
  status: "pending" | "verified" | "rejected"
  submittedAt: string | null
  rejectionReason: string | null
}

export function AgentVerificationClient() {
  const [requests, setRequests] = useState<AgentVerificationRequest[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actingOn, setActingOn] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const [searchEmail, setSearchEmail] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResults, setSearchResults] = useState<AgentVerificationRequest[] | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/v1/agent-verification")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRequests(json.requests)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load agent verification requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSearch = async () => {
    if (!searchEmail.trim()) return
    setSearchLoading(true); setSearchError(null); setSearchResults(null)
    try {
      const res = await fetch(`/api/v1/agent-verification?email=${encodeURIComponent(searchEmail.trim())}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSearchResults(json.requests)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "No agent found with that email")
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchEmail(""); setSearchResults(null); setSearchError(null)
  }

  const handleVerify = async (userId: string, isSearchResult = false) => {
    setActingOn(userId)
    try {
      const res = await fetch(`/api/v1/agent-verification/${userId}/verify`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`Agent verified — Agent ID issued: ${json.agentId}`, "success")
      if (isSearchResult) await handleSearch()
      else await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Verification failed", "error")
    } finally {
      setActingOn(null)
    }
  }

  const handleReject = async (userId: string, isSearchResult = false) => {
    const reason = window.prompt("Reason for rejection (shown to the agent):") ?? ""
    setActingOn(userId)
    try {
      const res = await fetch(`/api/v1/agent-verification/${userId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast("Agent verification rejected", "success")
      if (isSearchResult) await handleSearch()
      else await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to reject", "error")
    } finally {
      setActingOn(null)
    }
  }

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 pb-12 space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-sm ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Verification</h1>
        <p className="text-gray-500 mt-1 text-sm">Search for an agent by email, or review the first 10 pending requests below</p>
      </div>

      {/* Search by email */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by agent email"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
          />
          {(searchResults || searchError) && (
            <button onClick={clearSearch} className="flex items-center justify-center px-3 rounded-xl border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSearch}
            disabled={!searchEmail.trim() || searchLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6b2fa5] text-white font-semibold text-sm rounded-xl hover:bg-[#5a2589] disabled:opacity-50 transition-colors"
          >
            {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Search
          </button>
        </div>

        {searchError && (
          <p className="text-sm text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {searchError}
          </p>
        )}

        {searchResults?.map((req) => (
          <RequestCard
            key={req.userId}
            req={req}
            actingOn={actingOn}
            copiedId={copiedId}
            onVerify={(id) => handleVerify(id, true)}
            onReject={(id) => handleReject(id, true)}
            onCopyId={copyId}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold text-gray-600">Pending requests (first 10)</h2>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {loading && !requests && (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading requests...
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-2 px-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {requests && requests.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No pending agent verification requests.</p>
        </div>
      )}

      <div className="space-y-4">
        {requests?.map((req) => (
          <RequestCard
            key={req.userId}
            req={req}
            actingOn={actingOn}
            copiedId={copiedId}
            onVerify={(id) => handleVerify(id, false)}
            onReject={(id) => handleReject(id, false)}
            onCopyId={copyId}
          />
        ))}
      </div>
    </div>
  )
}

function RequestCard({
  req, actingOn, copiedId, onVerify, onReject, onCopyId,
}: {
  req: AgentVerificationRequest
  actingOn: string | null
  copiedId: string | null
  onVerify: (userId: string) => void
  onReject: (userId: string) => void
  onCopyId: (id: string) => void
}) {
  const docTypeLabel = DOC_TYPE_LABELS[req.documentType] || req.documentType

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6b2fa5]/10 flex items-center justify-center text-[#6b2fa5]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{req.fullName || "Unknown agent"}</p>
            <p className="text-xs text-gray-500">{req.email} {req.phone ? `· ${req.phone}` : ""}</p>
          </div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <p className="text-xs text-gray-400 font-mono">User ID: {req.userId}</p>

      <div className="flex items-start gap-2 text-sm text-gray-700 bg-slate-50 rounded-lg px-3 py-2">
        <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        {docTypeLabel}: <span className="font-mono">{req.documentNumber}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[
          { key: "selfie", label: "Selfie", icon: <Camera className="w-4 h-4" />, url: req.selfieUrl },
          { key: "address", label: "Proof of Address", icon: <MapPin className="w-4 h-4" />, url: req.proofOfAddressUrl },
          { key: "doc", label: docTypeLabel, icon: <FileText className="w-4 h-4" />, url: req.documentImageUrl },
        ].map((doc) => (
          <div key={doc.key} className={`rounded-lg border p-3 ${doc.url ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
              {doc.icon} {doc.label}
            </div>
            {doc.url ? (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6b2fa5] flex items-center gap-1 hover:underline">
                View file <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <span className="text-xs text-gray-400">Not uploaded</span>
            )}
          </div>
        ))}
      </div>

      {req.status === "rejected" && req.rejectionReason && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          Rejected: {req.rejectionReason}
        </p>
      )}

      {req.status === "verified" ? (
        <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-emerald-700 font-mono font-semibold">
            <ShieldCheck className="w-4 h-4" /> Verified
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => onReject(req.userId)}
            disabled={actingOn === req.userId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <UserX className="w-4 h-4" /> Reject
          </button>
          <button
            onClick={() => onVerify(req.userId)}
            disabled={actingOn === req.userId}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {actingOn === req.userId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Verify
          </button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: AgentVerificationRequest["status"] }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    verified: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-600",
  }
  const labels: Record<string, string> = { pending: "Pending", verified: "Verified", rejected: "Rejected" }
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status]}`}>{labels[status]}</span>
}
