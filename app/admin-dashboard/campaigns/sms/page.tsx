"use client"

/**
 * app/admin-dashboard/campaigns/sms/page.tsx
 *
 * Every bulk SMS campaign, filterable by status. Statuses are created →
 * approved | rejected → delivered. An admin reviews a "created" campaign
 * (message, count, and the numbers .txt in Supabase Storage), then approves
 * or rejects it. Rejecting needs a reason: it's emailed to the booker (SES)
 * and shown on their campaigns page, and the reserved credits go back to
 * them. After the SMS has actually been sent, "Mark delivered" closes it out.
 */

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, MessageSquareText, Download, Check, X, Truck } from "lucide-react"

interface SmsCampaign {
  id: string
  name: string
  organizer_id: string
  organizer_email: string | null
  organizer_username: string | null
  event_name_snapshot: string
  message_text: string
  recipient_count: number
  status: "created" | "approved" | "rejected" | "delivered"
  rejection_reason: string | null
  reviewed_by: string | null
  created_at: string
  reviewed_at: string | null
  delivered_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  created: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  delivered: "bg-emerald-100 text-emerald-800",
}
const FILTERS: { value: string; label: string }[] = [
  { value: "created", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "delivered", label: "Delivered" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
]

export default function AdminSmsCampaignsPage() {
  const [filter, setFilter] = useState("created")
  const [campaigns, setCampaigns] = useState<SmsCampaign[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string | null>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<SmsCampaign | null>(null)
  const [reason, setReason] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setCampaigns(null)
    setLoadError(null)
    try {
      const res = await fetch(`/api/v1/admin/sms-campaigns${filter ? `?status=${filter}` : ""}`)
      const data = await res.json()
      if (data.success) setCampaigns(data.campaigns || [])
      else setLoadError(data.error || "Couldn't load bulk SMS campaigns")
    } catch {
      setLoadError("Couldn't load bulk SMS campaigns")
    }
  }, [filter])
  useEffect(() => { load() }, [load])

  async function toggleExpand(c: SmsCampaign) {
    if (expandedId === c.id) { setExpandedId(null); return }
    setExpandedId(c.id)
    // Signed link is generated on demand (private bucket, expires in an hour).
    try {
      const res = await fetch(`/api/v1/admin/sms-campaigns/${c.id}`)
      const data = await res.json()
      setDownloadUrls((p) => ({ ...p, [c.id]: data.success ? data.numbersDownloadUrl : null }))
    } catch {
      setDownloadUrls((p) => ({ ...p, [c.id]: null }))
    }
  }

  async function act(id: string, action: "approve" | "deliver" | "reject", body?: object) {
    setBusyId(id)
    setActionError(null)
    setNotice(null)
    try {
      const res = await fetch(`/api/v1/admin/sms-campaigns/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      })
      const data = await res.json()
      if (!data.success) {
        setActionError(data.error || "That didn't work")
        // Someone else may have acted on it already — refresh the list.
        if (res.status === 409) load()
        return false
      }
      if (action !== "deliver") {
        setNotice(data.emailed
          ? `Campaign ${action === "approve" ? "approved" : "rejected"} — the booker was emailed.`
          : `Campaign ${action === "approve" ? "approved" : "rejected"}, but the booker's email couldn't be sent.`)
      }
      await load()
      return true
    } finally {
      setBusyId(null)
    }
  }

  async function confirmReject() {
    if (!rejecting || !reason.trim()) return
    const ok = await act(rejecting.id, "reject", { reason: reason.trim() })
    if (ok) { setRejecting(null); setReason("") }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <Link href="/admin-dashboard/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b2fa5] hover:text-[#5a1f8a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <MessageSquareText className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Bulk SMS</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review, approve or reject bookers&apos; bulk SMS campaigns</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              filter === f.value ? "bg-[#6b2fa5] text-white border-[#6b2fa5]" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {notice && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{notice}</div>}
      {actionError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{actionError}</div>}

      {loadError ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-red-600">{loadError}</div>
      ) : !campaigns ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#6b2fa5]/30 border-t-[#6b2fa5] rounded-full animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">Nothing here.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {campaigns.map((c) => {
            const open = expandedId === c.id
            const busy = busyId === c.id
            return (
              <div key={c.id}>
                <button onClick={() => toggleExpand(c)} className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {c.event_name_snapshot} · {c.organizer_username || c.organizer_email || c.organizer_id} · {c.recipient_count.toLocaleString()} numbers · {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs rounded-full px-3 py-1 font-semibold capitalize flex-shrink-0 ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                </button>

                {open && (
                  <div className="px-5 pb-5 space-y-4 bg-slate-50/50">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">Message</p>
                      <p className="rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-800 whitespace-pre-wrap">{c.message_text}</p>
                    </div>

                    <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-slate-500">
                      <span>Booker: <span className="text-slate-700">{c.organizer_email || "—"}</span></span>
                      <span>Credits reserved: <span className="text-slate-700">{c.recipient_count.toLocaleString()}</span></span>
                      {c.reviewed_by && <span>Reviewed by: <span className="text-slate-700">{c.reviewed_by}</span></span>}
                      {c.delivered_at && <span>Delivered: <span className="text-slate-700">{new Date(c.delivered_at).toLocaleString()}</span></span>}
                    </div>

                    {c.status === "rejected" && c.rejection_reason && (
                      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"><strong>Rejection reason:</strong> {c.rejection_reason}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {downloadUrls[c.id] ? (
                        <a href={downloadUrls[c.id]!} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
                          <Download className="w-3.5 h-3.5" /> Download numbers (.txt)
                        </a>
                      ) : c.id in downloadUrls ? (
                        <span className="text-xs text-red-500">Couldn&apos;t generate the numbers link</span>
                      ) : (
                        <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Preparing download…</span>
                      )}

                      {c.status === "created" && (
                        <>
                          <button disabled={busy} onClick={() => act(c.id, "approve")} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-40">
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Approve
                          </button>
                          <button disabled={busy} onClick={() => { setRejecting(c); setReason(""); setActionError(null) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-40">
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </>
                      )}
                      {c.status === "approved" && (
                        <>
                          <button disabled={busy} onClick={() => { if (confirm("Mark this campaign as delivered? Only do this once the SMS has actually been sent.")) act(c.id, "deliver") }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6b2fa5] text-white rounded-lg text-xs font-semibold hover:bg-[#5a1f8a] transition-colors disabled:opacity-40">
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />} Mark delivered
                          </button>
                          <button disabled={busy} onClick={() => { setRejecting(c); setReason(""); setActionError(null) }} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-white text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-40">
                            <X className="w-3.5 h-3.5" /> Reject instead
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget && !busyId) setRejecting(null) }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Reject &ldquo;{rejecting.name}&rdquo;</h2>
              <button onClick={() => setRejecting(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-slate-600">The booker is emailed this reason and sees it on their campaigns page. Their {rejecting.recipient_count.toLocaleString()} reserved credits are returned.</p>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000} placeholder="Why is this being rejected?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]" />
              {actionError && <p className="text-sm text-red-600">{actionError}</p>}
              <div className="flex justify-end gap-2">
                <button onClick={() => setRejecting(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button disabled={!reason.trim() || busyId === rejecting.id} onClick={confirmReject} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-40">
                  {busyId === rejecting.id && <Loader2 className="w-4 h-4 animate-spin" />} Reject &amp; notify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
