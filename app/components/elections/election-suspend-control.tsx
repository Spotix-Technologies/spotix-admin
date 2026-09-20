"use client"

/**
 * app/components/elections/election-suspend-control.tsx
 *
 * The Spotix-level kill switch — mirrors the suspend pattern already
 * established for events (see event-data-tab.tsx's suspend action) and
 * PATCHes app/api/v1/admin-elections/[electionId]/suspend/route.ts.
 *
 * Unlike events (full lockout of the organiser's own access), a
 * suspended election specifically means: candidates/voters see a
 * blocking notice in spotix-vote, the organiser sees a banner in
 * spotix-booker, and payouts are refused — see that route's header
 * comment for the full effect.
 */

import { useState } from "react"
import { ShieldAlert, ShieldCheck, Loader2, X } from "lucide-react"

export default function ElectionSuspendControl({
  electionId, suspended, suspendedReason, canManage, onChanged,
}: { electionId: string; suspended: boolean; suspendedReason: string | null; canManage: boolean; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(next: boolean) {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin-elections/${electionId}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: next, reason: next ? reason : undefined }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to update suspension")
      setConfirming(false)
      setReason("")
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update suspension")
    } finally {
      setSubmitting(false)
    }
  }

  if (suspended) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">This election is suspended</p>
            {suspendedReason && <p className="text-xs text-red-600 mt-0.5">{suspendedReason}</p>}
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => submit(false)}
            disabled={submitting}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {submitting ? "Unsuspending…" : "Unsuspend election"}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>
    )
  }

  if (!canManage) return null

  return (
    <div>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Suspend election
        </button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-red-700">Suspend this election?</p>
            <button onClick={() => setConfirming(false)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
          <p className="mt-1 text-xs text-red-600">
            Candidates and voters will see an error that Spotix has suspended this election, and the organiser can't
            withdraw funds until it's lifted. This can be undone at any time.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional, shown to the organiser and candidates)"
            rows={2}
            className="mt-2 w-full text-sm bg-white border border-red-200 rounded-lg px-3 py-2 text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
          />
          {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          <button
            onClick={() => submit(true)}
            disabled={submitting}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
            {submitting ? "Suspending…" : "Confirm suspend"}
          </button>
        </div>
      )}
    </div>
  )
}
