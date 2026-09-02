"use client"

import { useState, useEffect } from "react"
import {
  Loader2, AlertCircle, CheckCircle2, ShieldCheck, User, MapPin,
  FileText, Camera, RefreshCw, Copy, Check, ExternalLink, Search, X, XCircle,
} from "lucide-react"

interface DocumentRejection {
  problem: string
  suggestion: string
  rejectedBy?: string
}

interface DocumentStatus {
  status: "pending" | "completed"
  dateUploaded?: string
  timeUploaded?: string
  fileUrl?: string
  provider?: string
  rejection?: DocumentRejection | null
}

interface VerificationRequest {
  verificationId: string
  uid: string
  nin: DocumentStatus
  selfie: DocumentStatus
  proofOfAddress: DocumentStatus
  address: string
  verificationState: "Not Verified" | "Awaiting Verification" | "Verified"
  readyToVerify: boolean
  user: {
    username: string
    fullName: string
    email: string
    phoneNumber: string
    dateOfBirth: string
    bvt: string | null
    isVerified: boolean
  } | null
}

type DocKey = "nin" | "selfie" | "proofOfAddress"

const DOC_META: Record<DocKey, { label: string; icon: React.ReactNode }> = {
  nin: { label: "National ID (NIN)", icon: <FileText className="w-4 h-4" /> },
  selfie: { label: "Selfie", icon: <Camera className="w-4 h-4" /> },
  proofOfAddress: { label: "Proof of Address", icon: <MapPin className="w-4 h-4" /> },
}

export function VerificationClient() {
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [copiedBvt, setCopiedBvt] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  // Search-by-ID state (independent of the top-10 list above)
  const [searchId, setSearchId] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchResult, setSearchResult] = useState<VerificationRequest | null>(null)

  // Reject-document modal state — shared by both the search result card and
  // the pending-requests list, keyed by which verification+document is open.
  const [rejectTarget, setRejectTarget] = useState<{ verificationId: string; document: DocKey; isSearchResult: boolean } | null>(null)
  const [rejectProblem, setRejectProblem] = useState("")
  const [rejectSuggestion, setRejectSuggestion] = useState("")
  const [rejecting, setRejecting] = useState(false)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/v1/verification")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setRequests(json.requests)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load verification requests")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSearch = async () => {
    if (!searchId.trim()) return
    setSearchLoading(true); setSearchError(null); setSearchResult(null)
    try {
      const res = await fetch(`/api/v1/verification?verificationId=${encodeURIComponent(searchId.trim())}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSearchResult(json.result)
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Verification request not found")
    } finally {
      setSearchLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchId(""); setSearchResult(null); setSearchError(null)
  }

  const handleVerify = async (verificationId: string, isSearchResult = false) => {
    setVerifying(verificationId)
    try {
      const res = await fetch(`/api/v1/verification/${verificationId}/verify`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`Booker verified — BVT issued: ${json.bvt}`, "success")
      if (isSearchResult) await handleSearch()
      else await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Verification failed", "error")
    } finally {
      setVerifying(null)
    }
  }

  const copyBvt = (bvt: string) => {
    navigator.clipboard.writeText(bvt).catch(() => {})
    setCopiedBvt(bvt)
    setTimeout(() => setCopiedBvt(null), 2000)
  }

  const openReject = (verificationId: string, document: DocKey, isSearchResult: boolean) => {
    setRejectTarget({ verificationId, document, isSearchResult })
    setRejectProblem("")
    setRejectSuggestion("")
  }

  const closeReject = () => {
    if (rejecting) return
    setRejectTarget(null)
  }

  const submitReject = async () => {
    if (!rejectTarget || !rejectProblem.trim()) return
    setRejecting(true)
    try {
      const res = await fetch(`/api/v1/verification/${rejectTarget.verificationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: rejectTarget.document,
          problem: rejectProblem.trim(),
          suggestion: rejectSuggestion.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(`${DOC_META[rejectTarget.document].label} rejected — booker notified`, "success")
      if (rejectTarget.isSearchResult) await handleSearch()
      else await load()
      setRejectTarget(null)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to reject document", "error")
    } finally {
      setRejecting(false)
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Booker Verification</h1>
        <p className="text-gray-500 mt-1 text-sm">Search for a specific verification ID, or review the first 10 pending requests below</p>
      </div>

      {/* Search by verification ID */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Enter a verification ID"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
          />
          {(searchResult || searchError) && (
            <button onClick={clearSearch} className="flex items-center justify-center px-3 rounded-xl border-2 border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50">
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleSearch}
            disabled={!searchId.trim() || searchLoading}
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

        {searchResult && (
          <RequestCard
            req={searchResult}
            verifying={verifying}
            copiedBvt={copiedBvt}
            onVerify={(id) => handleVerify(id, true)}
            onCopyBvt={copyBvt}
            onReject={(docKey) => openReject(searchResult.verificationId, docKey, true)}
          />
        )}
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
          <p className="text-sm text-slate-500">No verification requests found.</p>
        </div>
      )}

      <div className="space-y-4">
        {requests?.map((req) => (
          <RequestCard
            key={req.verificationId}
            req={req}
            verifying={verifying}
            copiedBvt={copiedBvt}
            onVerify={(id) => handleVerify(id, false)}
            onCopyBvt={copyBvt}
            onReject={(docKey) => openReject(req.verificationId, docKey, false)}
          />
        ))}
      </div>

      {/* Reject document modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeReject}>
          <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                <XCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Reject {DOC_META[rejectTarget.document].label}</p>
                <p className="text-xs text-slate-400">The booker will be emailed this reason</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">What's wrong with it?</label>
              <textarea
                value={rejectProblem}
                onChange={(e) => setRejectProblem(e.target.value)}
                placeholder="e.g. The NIN slip image is blurry and the number isn't legible"
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Suggestion (optional)</label>
              <textarea
                value={rejectSuggestion}
                onChange={(e) => setRejectSuggestion(e.target.value)}
                placeholder="e.g. Please re-upload in good lighting with all four corners visible"
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={closeReject} disabled={rejecting} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectProblem.trim() || rejecting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {rejecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject &amp; notify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RequestCard({
  req, verifying, copiedBvt, onVerify, onCopyBvt, onReject,
}: {
  req: VerificationRequest
  verifying: string | null
  copiedBvt: string | null
  onVerify: (verificationId: string) => void
  onCopyBvt: (bvt: string) => void
  onReject: (document: DocKey) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#6b2fa5]/10 flex items-center justify-center text-[#6b2fa5]">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{req.user?.fullName || req.user?.username || "Unknown user"}</p>
            <p className="text-xs text-gray-500">{req.user?.email} {req.user?.phoneNumber ? `· ${req.user.phoneNumber}` : ""}</p>
          </div>
        </div>
        <StateBadge state={req.verificationState} />
      </div>

      <p className="text-xs text-gray-400 font-mono">Verification ID: {req.verificationId}</p>

      {req.address && (
        <div className="flex items-start gap-2 text-sm text-gray-700 bg-slate-50 rounded-lg px-3 py-2">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          {req.address}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(["nin", "selfie", "proofOfAddress"] as const).map((key) => {
          const doc = req[key]
          const meta = DOC_META[key]
          const rejected = doc?.status !== "completed" && !!doc?.rejection
          return (
            <div
              key={key}
              className={`rounded-lg border p-3 ${
                doc?.status === "completed"
                  ? "border-emerald-200 bg-emerald-50/50"
                  : rejected
                    ? "border-red-200 bg-red-50/50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 mb-1.5">
                {meta.icon} {meta.label}
              </div>
              {doc?.status === "completed" ? (
                <div className="space-y-1.5">
                  {doc.fileUrl ? (
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#6b2fa5] flex items-center gap-1 hover:underline">
                      View file <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-emerald-600">Uploaded</span>
                  )}
                  <button
                    onClick={() => onReject(key)}
                    className="text-xs text-red-500 flex items-center gap-1 hover:underline"
                  >
                    <XCircle className="w-3 h-3" /> Reject
                  </button>
                </div>
              ) : rejected ? (
                <div className="space-y-1">
                  <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Rejected — awaiting re-upload
                  </p>
                  <p className="text-xs text-red-500/90">{doc?.rejection?.problem}</p>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Not uploaded</span>
              )}
            </div>
          )
        })}
      </div>

      {req.user?.bvt ? (
        <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-emerald-700 font-mono font-semibold">
            <ShieldCheck className="w-4 h-4" /> {req.user.bvt}
          </div>
          <button onClick={() => onCopyBvt(req.user!.bvt!)} className="text-emerald-600 hover:text-emerald-800">
            {copiedBvt === req.user.bvt ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      ) : req.readyToVerify ? (
        <button
          onClick={() => onVerify(req.verificationId)}
          disabled={verifying === req.verificationId}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {verifying === req.verificationId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Verify
        </button>
      ) : (
        <p className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
          All three documents and a home address are required before this booker can be verified.
        </p>
      )}
    </div>
  )
}

function StateBadge({ state }: { state: VerificationRequest["verificationState"] }) {
  const styles: Record<string, string> = {
    "Not Verified": "bg-gray-100 text-gray-600",
    "Awaiting Verification": "bg-amber-100 text-amber-700",
    "Verified": "bg-emerald-100 text-emerald-700",
  }
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[state] || styles["Not Verified"]}`}>{state}</span>
}
