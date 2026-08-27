"use client"

/**
 * app/admin-dashboard/event-data/referrals-tab.tsx
 *
 * View of an event's referral codes and their usage, backed by
 * /api/v1/event-data/referrals (mirrors spotix-booker's referrals
 * subcollection — see that route's header comment). Available to every
 * role that has the Event Data tab (admin, customer-support,
 * exec-assistant) since browsing it is non-sensitive, view-only.
 *
 * The "Match Transaction" action is additional and write-capable — it
 * lets an admin manually attribute an attendee with no referral on file
 * to an existing referral code (via /api/v1/event-data/referrals/match),
 * for tickets that should have been credited to a referral at purchase
 * but weren't. Gated by the canMatch prop, which the parent dashboard
 * sets based on role — see event-data-client.tsx. Not shown at all when
 * false, same pattern as the Dangerous Zone's canModerate gate.
 */

import { useState, useEffect, useCallback } from "react"
import { Loader2, AlertCircle, Tag, Users, ChevronDown, ChevronRight, Link2, X, CheckCircle2 } from "lucide-react"

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
interface UnmatchedAttendee {
  id: string
  fullName: string
  ticketType: string
  purchaseDate: string
}

export default function ReferralsTab({ eventId, canMatch = false }: { eventId: string; canMatch?: boolean }) {
  const [referrals, setReferrals] = useState<ReferralCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const [unmatched, setUnmatched] = useState<UnmatchedAttendee[]>([])

  const [matchModal, setMatchModal] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState("")
  const [selectedCode, setSelectedCode] = useState("")
  const [matchReason, setMatchReason] = useState("")
  const [matching, setMatching] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const requests = [fetch(`/api/v1/event-data/referrals?eventId=${eventId}`)]
      if (canMatch) requests.push(fetch(`/api/v1/event-data/referrals/unmatched?eventId=${eventId}`))

      const responses = await Promise.all(requests)
      const referralsData = await responses[0].json()
      if (!responses[0].ok) throw new Error(referralsData.error || "Failed to load referral codes")
      setReferrals(referralsData.referrals ?? [])

      if (canMatch && responses[1]) {
        const unmatchedData = await responses[1].json()
        if (responses[1].ok) setUnmatched(unmatchedData.attendees ?? [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load referral codes")
    } finally {
      setLoading(false)
    }
  }, [eventId, canMatch])

  useEffect(() => { load() }, [load])

  function toggle(code: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  function openMatchModal() {
    setSelectedTicketId(unmatched[0]?.id ?? "")
    setSelectedCode(referrals[0]?.code ?? "")
    setMatchReason("")
    setMatchModal(true)
  }

  async function handleMatchConfirm() {
    if (!selectedTicketId || !selectedCode || !matchReason.trim()) return
    setMatching(true)
    try {
      const res = await fetch("/api/v1/event-data/referrals/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, ticketId: selectedTicketId, referralCode: selectedCode, reason: matchReason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to match ticket")
      setMatchModal(false)
      showToast(`Ticket matched to "${selectedCode}"`, "success")
      load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to match ticket", "error")
    } finally {
      setMatching(false)
    }
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

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${toast.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {canMatch && (
        <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link2 className="w-4 h-4 text-[#6b2fa5] shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Match a transaction</p>
              <p className="text-xs text-slate-500 truncate">
                {unmatched.length > 0
                  ? `${unmatched.length} attendee${unmatched.length !== 1 ? "s" : ""} with no referral on file`
                  : "Every attendee currently has a referral on file"}
              </p>
            </div>
          </div>
          <button
            onClick={openMatchModal}
            disabled={unmatched.length === 0 || referrals.length === 0}
            className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-[#6b2fa5] hover:bg-purple-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={referrals.length === 0 ? "No referral codes exist for this event yet" : undefined}
          >
            Match Transaction
          </button>
        </div>
      )}

      {referrals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
          <Tag className="w-8 h-8 text-slate-300" />
          <p className="text-sm">No referral codes have been created for this event.</p>
        </div>
      ) : (
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
      )}

      {matchModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ isolation: "isolate" }}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !matching && setMatchModal(false)} />
          <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-base text-slate-800">Match a transaction</h3>
                  <p className="text-sm text-slate-500 mt-1">Attribute an attendee with no referral on file to a referral code.</p>
                </div>
                <button onClick={() => !matching && setMatchModal(false)} className="text-slate-400 hover:text-slate-600 mt-0.5 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Attendee (no referral on file)</label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
                >
                  {unmatched.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.fullName} · {a.ticketType} · {a.purchaseDate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Referral code</label>
                <select
                  value={selectedCode}
                  onChange={(e) => setSelectedCode(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
                >
                  {referrals.map((r) => (
                    <option key={r.code} value={r.code}>{r.code}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Reason (required)</label>
                <textarea
                  value={matchReason}
                  onChange={(e) => setMatchReason(e.target.value)}
                  placeholder="Why this ticket is being matched manually…"
                  rows={3}
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-[#6b2fa5/30] focus:border-[#6b2fa5]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6">
              <button onClick={() => setMatchModal(false)} disabled={matching} className="px-4 py-2 text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleMatchConfirm}
                disabled={matching || !selectedTicketId || !selectedCode || !matchReason.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[#6b2fa5] hover:bg-[#5a2589] text-white"
              >
                {matching ? "Matching…" : "Confirm Match"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
