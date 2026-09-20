"use client"

/**
 * app/components/elections/elections-list-panel.tsx
 *
 * Lookup list of elections across the platform, each row expandable
 * into its own ElectionFeeEditor — this IS the Election Management
 * page's main surface now that fees are configured per election
 * (see /supabase/election-per-election-fees-schema.sql) rather than
 * platform-wide. Talks to /api/v1/{apiBase}/list, same apiBase-per-dashboard
 * split as the fee editor.
 *
 * There's no edit action here for the election's own details (name,
 * voting window, offices, Allow Voters Pre-fill, etc.) — that stays
 * entirely in spotix-booker. Expanding a row here is ONLY for that
 * election's platform fee.
 */

import { useState, useEffect, useMemo } from "react"
import { Search, Loader2, Vote as VoteIcon, ShieldAlert, ChevronDown, Percent, UserCheck, Wallet } from "lucide-react"
import ElectionFeeEditor from "./election-fee-editor"
import ElectionSuspendControl from "./election-suspend-control"
import ElectionCandidatesPanel from "./election-candidates-panel"
import AdminElectionPayoutsPanel from "@/components/payout/admin-election-payouts-panel"

interface ElectionListItem {
  id: string
  name: string
  status: string
  organizerId: string
  resultsPublished: boolean
  votingStartsAt: string | null
  votingEndsAt: string | null
  registrationStartsAt: string | null
  registrationEndsAt: string | null
  allowVoterPrefill: boolean
  createdAt: string | null
  platformFeePercent: number
  platformFeeFlat: number
  paystackFeePayer: "voter" | "organizer" | "none"
  isFeeCustomized: boolean
  suspended: boolean
  suspendedReason: string | null
}

type ExpandedTab = "fee" | "suspend" | "candidates" | "payouts"

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  ended: "bg-gray-200 text-gray-500",
}

export default function ElectionsListPanel({
  apiBase,
  canEditFees,
  adminUsername = "Admin",
}: {
  apiBase: "admin-elections" | "support-elections"
  canEditFees: boolean
  adminUsername?: string
}) {
  const [elections, setElections] = useState<ElectionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ExpandedTab>("fee")

  function load() {
    setLoading(true)
    fetch(`/api/v1/${apiBase}/list`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || "Failed to load elections")
        setElections(data.elections ?? [])
      })
      .catch((e) => setError(e.message || "Failed to load elections"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [apiBase])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return elections
    return elections.filter((e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q) || e.organizerId.toLowerCase().includes(q))
  }, [elections, query])

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2.5">
        <VoteIcon className="w-4 h-4 text-[#6b2fa5]" />
        <div>
          <h3 className="font-semibold text-sm text-gray-900">Elections</h3>
          <p className="text-xs mt-0.5 text-gray-500">
            Tap an election to manage its platform fee, suspension, candidates, and payouts
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by election name, ID, or organizer ID"
            className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-transparent"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-6">No elections found.</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-2 max-h-[36rem] overflow-y-auto pr-1">
            {filtered.map((e) => {
              const isOpen = expandedId === e.id
              return (
                <div key={e.id} className="rounded-lg border border-gray-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      const next = isOpen ? null : e.id
                      setExpandedId(next)
                      setActiveTab("fee")
                    }}
                    className="w-full flex items-center justify-between gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{e.name || "(untitled election)"}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {e.id} · organizer {e.organizerId || "—"}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {e.suspended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          <ShieldAlert className="w-3 h-3" /> Suspended
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {e.status}
                      </span>
                      {e.allowVoterPrefill && (
                        <span className="hidden sm:inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-[#6b2fa5]">
                          Pre-fill on
                        </span>
                      )}
                      <span
                        className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          e.isFeeCustomized ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Percent className="w-3 h-3" />
                        {e.platformFeePercent}% + ₦{e.platformFeeFlat}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div>
                      <div className="flex gap-1 border-b border-gray-100 bg-white px-3 pt-2">
                        {(
                          [
                            { id: "fee", label: "Fee", icon: <Percent className="w-3.5 h-3.5" /> },
                            { id: "suspend", label: "Suspend", icon: <ShieldAlert className="w-3.5 h-3.5" /> },
                            { id: "candidates", label: "Candidates", icon: <UserCheck className="w-3.5 h-3.5" /> },
                            { id: "payouts", label: "Payouts", icon: <Wallet className="w-3.5 h-3.5" /> },
                          ] as { id: ExpandedTab; label: string; icon: React.ReactNode }[]
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                              activeTab === tab.id ? "border-[#6b2fa5] text-[#6b2fa5]" : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {tab.icon} {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="p-4 bg-white">
                        {activeTab === "fee" && <ElectionFeeEditor apiBase={apiBase} electionId={e.id} canEdit={canEditFees} />}
                        {activeTab === "suspend" && (
                          <ElectionSuspendControl
                            electionId={e.id}
                            suspended={e.suspended}
                            suspendedReason={e.suspendedReason}
                            canManage={canEditFees}
                            onChanged={load}
                          />
                        )}
                        {activeTab === "candidates" && <ElectionCandidatesPanel electionId={e.id} />}
                        {activeTab === "payouts" && (
                          <AdminElectionPayoutsPanel electionId={e.id} adminUsername={adminUsername} canManage={canEditFees} suspended={e.suspended} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
