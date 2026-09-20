"use client"

/**
 * app/components/elections/election-candidates-panel.tsx
 *
 * Read-only list of every candidate across every office in one
 * election — the "view candidates" capability from Election Management.
 * No write path here; candidate data itself is edited by the organiser
 * in spotix-booker (see CandidatesTab.tsx there), not by admin.
 */

import { useState, useEffect, useCallback } from "react"
import { Loader2, AlertCircle, UserCheck, Vote } from "lucide-react"

interface AdminCandidateItem {
  id: string
  officeId: string
  officeName: string
  fullName: string
  email: string
  phone: string
  photoUrl: string | null
  voteCount: number
  paid: boolean
  formReference: string | null
  createdAt: string | null
}

export default function ElectionCandidatesPanel({ electionId }: { electionId: string }) {
  const [candidates, setCandidates] = useState<AdminCandidateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin-elections/${electionId}/candidates`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load candidates")
      setCandidates(json.candidates ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load candidates")
    } finally {
      setLoading(false)
    }
  }, [electionId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#6b2fa5]" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-center gap-2.5 py-10 justify-center text-sm text-red-500">
        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
      </div>
    )
  }
  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl">
        <UserCheck className="w-8 h-8 text-slate-300" />
        <p className="text-sm">No candidates have registered for this election yet.</p>
      </div>
    )
  }

  // Group by office so the list reads as a ballot, not a flat table.
  const byOffice = candidates.reduce<Record<string, AdminCandidateItem[]>>((acc, c) => {
    (acc[c.officeName] ??= []).push(c)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      {Object.entries(byOffice).map(([officeName, list]) => (
        <div key={officeName}>
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">{officeName}</h4>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
            {list.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt={c.fullName} className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-purple-100 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.fullName}</p>
                  <p className="text-xs text-slate-500 truncate">{c.email} · {c.phone}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${c.paid ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>
                  {c.paid ? "Paid" : "Free entry"}
                </span>
                <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <Vote className="w-3.5 h-3.5" /> {c.voteCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
