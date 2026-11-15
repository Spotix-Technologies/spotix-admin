"use client"

/**
 * app/admin-dashboard/campaigns/page.tsx
 *
 * spec §38–39. Look up every campaign for an event (by name or raw
 * eventId, via EventSearchInput), drill into recipients, and retry eligible
 * failures — all backed by app/api/v1/admin/campaigns/* (proxying to the
 * backend's internal /v1/admin/campaigns/*).
 *
 * Credits are no longer per event, so manual funding moved to its own page
 * (campaigns/credits): the booker is found by email and topped up there.
 *
 * Styled to match the rest of the admin dashboard (Event Data, Teams,
 * etc.): white/slate-200 cards, #6b2fa5 brand purple for the header
 * icon and primary actions, colored status pills.
 */

import { useState } from "react"
import { Loader2, RotateCw, Search, Mail, Tag, BarChart3, MessageSquareText, Wallet } from "lucide-react"
import Link from "next/link"
import { EventSearchInput, type EventSuggestion } from "@/components/shared/EventSearchInput"

interface Campaign {
  id: string; name: string; status: string; delivery_provider: string | null
  total_recipients: number; sent_count: number; delivered_count: number
  opened_count: number; clicked_count: number; bounced_count: number; failed_count: number
  created_at: string; started_at: string | null; completed_at: string | null
}
interface Recipient {
  id: string; email: string; name: string | null; status: string
  last_error: string | null; sent_at: string | null; delivered_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  waiting_for_provider: "bg-amber-100 text-amber-700",
  processing: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  completed_with_errors: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
}

export default function AdminCampaignsPage() {
  const [eventId, setEventId] = useState("")
  const [eventName, setEventName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [eventNotFound, setEventNotFound] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [retryingId, setRetryingId] = useState<string | null>(null)

  async function lookup(idOverride?: string) {
    const id = (idOverride ?? eventId).trim()
    if (!id) return
    setLoading(true)
    setCampaigns(null)
    setEventNotFound(false)
    setExpandedId(null)
    try {
      const res = await fetch(`/api/v1/admin/campaigns/event/${encodeURIComponent(id)}`)
      const data = await res.json()
      if (data.eventExists === false) {
        setEventNotFound(true)
      } else if (data.success) {
        setCampaigns(data.campaigns || [])
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSelectEvent(event: EventSuggestion) {
    setEventName(event.eventName)
    lookup(event.eventId)
  }

  async function toggleExpand(campaignId: string) {
    if (expandedId === campaignId) { setExpandedId(null); return }
    setExpandedId(campaignId)
    const res = await fetch(`/api/v1/admin/campaigns/${campaignId}/recipients`)
    const data = await res.json()
    if (data.success) setRecipients(data.recipients || [])
  }

  async function retry(campaignId: string) {
    setRetryingId(campaignId)
    try {
      const res = await fetch(`/api/v1/admin/campaigns/${campaignId}/retry`, { method: "POST" })
      const data = await res.json()
      if (data.success) {
        await lookup()
        alert(`Retried ${data.retried} recipient(s)${data.skipped ? `, skipped ${data.skipped}` : ""}.`)
      }
    } finally {
      setRetryingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-[#6b2fa5]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Campaigns</h1>
            <p className="text-slate-500 text-sm mt-0.5">Look up an event's email campaigns and recipients</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin-dashboard/campaigns/credits" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
            <Wallet className="w-3.5 h-3.5" /> Credits
          </Link>
          <Link href="/admin-dashboard/campaigns/sms" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
            <MessageSquareText className="w-3.5 h-3.5" /> Bulk SMS
          </Link>
          <Link href="/admin-dashboard/campaigns/pricing" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
            <Tag className="w-3.5 h-3.5" /> Pricing
          </Link>
          <Link href="/admin-dashboard/campaigns/email-lookup" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
            <Search className="w-3.5 h-3.5" /> Email &amp; phone lookup
          </Link>
          <Link href="/admin-dashboard/campaigns/analytics" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 bg-white text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </Link>
        </div>
      </div>

      <div className="flex gap-2">
        <EventSearchInput
          value={eventId}
          onChange={(v) => { setEventId(v); setEventName(null) }}
          onSubmit={() => lookup()}
          onSelect={handleSelectEvent}
          loading={loading}
        />
        <button
          onClick={() => lookup()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Look up
        </button>
      </div>
      {eventName && !eventNotFound && (
        <p className="text-xs text-slate-400 -mt-4">Showing campaigns for <span className="font-semibold text-slate-600">{eventName}</span></p>
      )}

      {eventNotFound && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-400">Event not found. Check the ID or name and try again.</p>
        </div>
      )}

      {campaigns && !eventNotFound && (
        <>
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <p className="text-sm text-slate-400">No campaigns for this event.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {campaigns.map((c) => (
                <div key={c.id}>
                  <button onClick={() => toggleExpand(c.id)} className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{c.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.total_recipients.toLocaleString()} recipients · {c.delivery_provider || "no provider"} · {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs rounded-full px-3 py-1 font-semibold capitalize flex-shrink-0 ${STATUS_STYLES[c.status] || "bg-slate-100 text-slate-600"}`}>
                      {c.status.replace(/_/g, " ")}
                    </span>
                  </button>
                  {expandedId === c.id && (
                    <div className="px-4 pb-4 space-y-3 bg-slate-50/50">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs pt-1">
                        {[["Sent", c.sent_count], ["Delivered", c.delivered_count], ["Opened", c.opened_count], ["Clicked", c.clicked_count], ["Bounced", c.bounced_count], ["Failed", c.failed_count]].map(([label, val]) => (
                          <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-2 text-center">
                            <p className="text-slate-400">{label}</p>
                            <p className="font-bold text-slate-900">{(val as number).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => retry(c.id)}
                        disabled={retryingId === c.id}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
                      >
                        {retryingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5 text-[#6b2fa5]" />} Retry eligible recipients
                      </button>
                      <div className="rounded-lg border border-slate-200 bg-white max-h-64 overflow-y-auto text-xs divide-y divide-slate-100">
                        {recipients.map((r) => (
                          <div key={r.id} className="px-3 py-2 flex justify-between gap-2">
                            <span className="text-slate-700">{r.email}</span>
                            <span className="text-slate-400">{r.status}{r.last_error ? ` — ${r.last_error}` : ""}</span>
                          </div>
                        ))}
                        {recipients.length === 0 && <p className="px-3 py-2 text-slate-400">No recipients loaded.</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
