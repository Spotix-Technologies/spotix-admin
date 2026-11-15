"use client"

/**
 * app/it-dashboard/campaigns/email-lookup/page.tsx — spec §40.
 */

import { useState } from "react"
import Link from "next/link"
import { Loader2, Search, Mail, ArrowLeft } from "lucide-react"

interface HistoryRow {
  id: string; status: string; provider_message_id: string | null
  sent_at: string | null; delivered_at: string | null; opened_at: string | null
  clicked_at: string | null; bounced_at: string | null; last_error: string | null
  campaigns: { name: string; event_name_snapshot: string; delivery_provider: string | null }
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  opened: "bg-[#6b2fa5]/10 text-[#6b2fa5]",
  clicked: "bg-[#6b2fa5]/10 text-[#6b2fa5]",
  bounced: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
}

export default function EmailLookupPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [aggregate, setAggregate] = useState<any>(null)

  async function lookup() {
    if (!email.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/campaigns/email/${encodeURIComponent(email.trim())}`)
      const data = await res.json()
      if (data.success) { setHistory(data.history); setAggregate(data.aggregate) }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <Link href="/it-dashboard/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b2fa5] hover:text-[#5a1f8a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Email Inspection</h1>
          <p className="text-slate-500 text-sm mt-0.5">Look up a recipient's full campaign history</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookup()}
          placeholder="recipient@example.com"
          className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
        />
        <button
          onClick={lookup}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6b2fa5] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#5a1f8a] transition-colors shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Look up
        </button>
      </div>

      {aggregate && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
          {[["Campaigns", aggregate.campaignsReceived], ["Delivered", aggregate.delivered], ["Opened", aggregate.opened], ["Clicked", aggregate.clicked], ["Bounced", aggregate.bounced]].map(([label, val]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-slate-400">{label}</p>
              <p className="font-bold text-slate-900 mt-0.5">{val}</p>
            </div>
          ))}
        </div>
      )}

      {history && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 text-sm overflow-hidden">
          {history.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="flex justify-between items-center gap-2">
                <span className="font-semibold text-slate-900">{r.campaigns?.name}</span>
                <span className={`text-xs rounded-full px-2.5 py-0.5 font-semibold capitalize flex-shrink-0 ${STATUS_STYLES[r.status] || "bg-slate-100 text-slate-600"}`}>{r.status}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {r.campaigns?.event_name_snapshot} · {r.campaigns?.delivery_provider || "—"}
                {r.last_error ? ` · ${r.last_error}` : ""}
              </p>
            </div>
          ))}
          {history.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">No campaign history for this address.</p>}
        </div>
      )}
    </div>
  )
}
