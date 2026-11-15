"use client"

/**
 * app/admin-dashboard/campaigns/analytics/page.tsx — spec §41.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

type RangeKey = "today" | "7d" | "30d" | "month" | "custom"

function rangeToSince(key: RangeKey): string | undefined {
  const now = new Date()
  if (key === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  if (key === "7d") return new Date(now.getTime() - 7 * 86400_000).toISOString()
  if (key === "30d") return new Date(now.getTime() - 30 * 86400_000).toISOString()
  if (key === "month") return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  return undefined
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("30d")
  const [customSince, setCustomSince] = useState("")
  const [customUntil, setCustomUntil] = useState("")
  const [totals, setTotals] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams()
    if (range === "custom") {
      if (customSince) qs.set("since", new Date(customSince).toISOString())
      if (customUntil) qs.set("until", new Date(customUntil).toISOString())
    } else {
      const since = rangeToSince(range)
      if (since) qs.set("since", since)
    }
    fetch(`/api/v1/admin/campaigns/analytics?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setTotals(data.totals) })
      .finally(() => setLoading(false))
  }, [range, customSince, customUntil])

  return (
    <div className="max-w-3xl mx-auto px-4 pt-8 pb-16 space-y-6">
      <Link href="/admin-dashboard/campaigns" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b2fa5] hover:text-[#5a1f8a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Campaigns
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center shrink-0">
          <BarChart3 className="w-4 h-4 text-[#6b2fa5]" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Campaign Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Platform-wide campaign totals over a date range</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap text-sm">
        {([["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["month", "This month"], ["custom", "Custom"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRange(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              range === key
                ? "bg-[#6b2fa5] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex gap-2">
          <input
            type="date"
            value={customSince}
            onChange={(e) => setCustomSince(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
          />
          <input
            type="date"
            value={customUntil}
            onChange={(e) => setCustomUntil(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5]"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-[#6b2fa5]/30 border-t-[#6b2fa5] rounded-full animate-spin" />
        </div>
      ) : totals ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ["Campaigns", totals.totalCampaigns], ["Recipients", totals.totalRecipients],
            ["Sent", totals.totalSent], ["Delivered", totals.totalDelivered],
            ["Opened", totals.totalOpened], ["Clicked", totals.totalClicked],
            ["Bounced", totals.totalBounced], ["Failed", totals.totalFailed],
          ].map(([label, val]) => (
            <div key={label as string} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-xl font-bold text-slate-900 mt-1">{(val as number).toLocaleString()}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
