"use client"

/**
 * app/admin-dashboard/campaigns/email-lookup/page.tsx — spec §40.
 *
 * Recipient lookup by EMAIL (email campaigns) or by PHONE NUMBER (bulk SMS).
 * Both show the 15 most recent campaigns the address / number was part of;
 * the totals above the list cover its whole history.
 */

import { useState } from "react"
import Link from "next/link"
import { Loader2, Search, Mail, ArrowLeft, Phone } from "lucide-react"

interface HistoryRow {
  id: string; status: string; provider_message_id: string | null
  sent_at: string | null; delivered_at: string | null; opened_at: string | null
  clicked_at: string | null; bounced_at: string | null; last_error: string | null
  created_at: string
  campaigns: { name: string; event_name_snapshot: string; delivery_provider: string | null }
}

interface SmsHistoryRow {
  id: number; created_at: string
  sms_campaign: {
    id: string; name: string; event_name_snapshot: string; status: string
    organizer_email: string | null; organizer_username: string | null
    recipient_count: number; created_at: string
  } | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  opened: "bg-[#6b2fa5]/10 text-[#6b2fa5]",
  clicked: "bg-[#6b2fa5]/10 text-[#6b2fa5]",
  bounced: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  // bulk SMS campaign statuses
  created: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}

type Mode = "email" | "phone"

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
}

export default function RecipientLookupPage() {
  const [mode, setMode] = useState<Mode>("email")
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [aggregate, setAggregate] = useState<any>(null)
  const [smsHistory, setSmsHistory] = useState<SmsHistoryRow[] | null>(null)
  const [smsAggregate, setSmsAggregate] = useState<{ campaignsIncluded: number; lastCampaignAt: string | null } | null>(null)
  const [shownPhone, setShownPhone] = useState<string | null>(null)

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setQuery("")
    setError(null)
    setHistory(null); setAggregate(null)
    setSmsHistory(null); setSmsAggregate(null); setShownPhone(null)
  }

  async function lookup() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    try {
      if (mode === "email") {
        const res = await fetch(`/api/v1/admin/campaigns/email/${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success) { setHistory(data.history); setAggregate(data.aggregate) }
        else setError(data.error || "Lookup failed")
      } else {
        const res = await fetch(`/api/v1/admin/sms-campaigns/phone/${encodeURIComponent(q)}`)
        const data = await res.json()
        if (data.success) {
          setSmsHistory(data.history)
          setSmsAggregate(data.aggregate)
          setShownPhone(data.phone)
        } else {
          setSmsHistory(null); setSmsAggregate(null)
          setError(data.error || "Lookup failed")
        }
      }
    } catch {
      setError("Lookup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <Link href="/admin-dashboard/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b2fa5] hover:text-[#5a1f8a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          {mode === "email" ? <Mail className="w-4 h-4 text-[#6b2fa5]" /> : <Phone className="w-4 h-4 text-[#6b2fa5]" />}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Recipient Inspection</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {mode === "email" ? "Look up an email address's campaign history" : "Look up a phone number's bulk SMS history"} · 15 most recent
          </p>
        </div>
      </div>

      <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
        {(["email", "phone"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === m ? "bg-white text-[#6b2fa5] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {m === "email" ? "Email" : "Phone number"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder={mode === "email" ? "recipient@example.com" : "08012345678 or +2348012345678"}
          inputMode={mode === "phone" ? "tel" : "email"}
          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
        />
        <button
          onClick={lookup}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Look up
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {mode === "email" && aggregate && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
          {[["Campaigns", aggregate.campaignsReceived], ["Delivered", aggregate.delivered], ["Opened", aggregate.opened], ["Clicked", aggregate.clicked], ["Bounced", aggregate.bounced]].map(([label, val]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-slate-400">{label}</p>
              <p className="font-bold text-slate-900 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      )}

      {mode === "email" && history && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 text-sm overflow-hidden">
          {history.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-900">{r.campaigns?.name}</span>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-semibold capitalize flex-shrink-0 ${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {r.campaigns?.event_name_snapshot} · {r.campaigns?.delivery_provider || "—"} · {fmtDate(r.created_at)}
                {r.last_error ? ` · ${r.last_error}` : ""}
              </p>
            </div>
          ))}
          {history.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No campaign history for this address.</p>}
        </div>
      )}

      {mode === "phone" && smsAggregate && shownPhone && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[["Number", shownPhone], ["Bulk SMS campaigns", smsAggregate.campaignsIncluded], ["Most recent", fmtDate(smsAggregate.lastCampaignAt)]].map(([label, val]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-slate-400">{label}</p>
              <p className="font-bold text-slate-900 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      )}

      {mode === "phone" && smsHistory && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 text-sm overflow-hidden">
          {smsHistory.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-900">{r.sms_campaign?.name || "Campaign removed"}</span>
                {r.sms_campaign && (
                  <span className={`text-xs rounded-full px-2.5 py-0.5 font-semibold capitalize flex-shrink-0 ${STATUS_STYLES[r.sms_campaign.status] || "bg-slate-100 text-slate-600"}`}>
                    {r.sms_campaign.status === "created" ? "awaiting review" : r.sms_campaign.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {r.sms_campaign?.event_name_snapshot}
                {r.sms_campaign ? ` · ${r.sms_campaign.recipient_count.toLocaleString()} numbers` : ""}
                {` · ${fmtDate(r.created_at)}`}
                {r.sms_campaign?.organizer_email ? ` · by ${r.sms_campaign.organizer_username || r.sms_campaign.organizer_email}` : ""}
              </p>
            </div>
          ))}
          {smsHistory.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              No bulk SMS history for this number. (Campaigns sent before number lookup was added only appear once they&apos;ve been backfilled.)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
