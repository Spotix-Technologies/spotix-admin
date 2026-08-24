"use client"

/**
 * app/admin-dashboard/event-data/referrals-tab.tsx
 *
 * Read-only view of an event's referral codes and their usage, backed by
 * /api/v1/event-data/referrals (mirrors spotix-booker's referrals
 * subcollection — see that route's header comment). Available to every
 * role that has the Event Data tab (admin, customer-support,
 * exec-assistant) since it's non-sensitive, view-only data.
 */

import { useState, useEffect, useCallback } from "react"
import { Loader2, AlertCircle, Tag, Users, ChevronDown, ChevronRight } from "lucide-react"

interface Usage {
  name: string
  ticketType: string
  purchaseDate: string | null
}
interface ReferralCode {
  code: string
  totalTickets: number
  usages: Usage[]
}

export default function ReferralsTab({ eventId }: { eventId: string }) {
  const [referrals, setReferrals] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/event-data/referrals?eventId=${eventId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load referral codes")
      setReferrals(data.referrals ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referral codes")
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#6b2fa5]" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-sm text-red-500">
        <AlertCircle className="w-4 h-4" /> {error}
      </div>
    )
  }
  if (referrals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
        <Tag className="w-8 h-8 text-slate-300" />
        <p className="text-sm">No referral codes have been created for this event.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {referrals.map((r) => {
        const isOpen = expanded.has(r.code)
        return (
          <div key={r.code} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(r.code)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <Tag className="w-3.5 h-3.5 text-[#6b2fa5] shrink-0" />
                <span className="text-sm font-bold text-slate-800 font-mono truncate">{r.code}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border bg-violet-50 text-violet-700 border-violet-200 shrink-0">
                <Users className="w-3 h-3" /> {r.totalTickets} ticket{r.totalTickets !== 1 ? "s" : ""}
              </span>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {r.usages.length === 0 ? (
                  <p className="text-xs text-slate-400 px-4 py-3">No tickets purchased with this code yet.</p>
                ) : (
                  r.usages.map((u, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap">
                      <span className="text-sm text-slate-700">{u.name}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{u.ticketType}</span>
                        {u.purchaseDate && <span>· {new Date(u.purchaseDate).toLocaleDateString()}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
