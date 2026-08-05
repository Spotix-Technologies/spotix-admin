"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search, Loader2, AlertCircle, CheckCircle, Flag, ShieldAlert,
  ShieldCheck, Trash2, RotateCcw, Trophy, Users, Wallet, Calendar,
  ImageIcon, X, ChevronRight, RefreshCw, Vote, ReceiptText, Tag,
  ArrowLeft, ChevronDown, Clock, XCircle, CheckCircle2, Loader,
} from "lucide-react"

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface PollSummary {
  pollId: string
  pollName: string
  pollImage: string
  pollType: "single" | "group"
  status: string
  createdAt: string | null
}

interface LeaderboardEntry {
  name: string
  votes: number
  image?: string
  categoryName?: string
}

interface PollData {
  pollType: "single" | "group"
  pollName: string
  pollImage: string
  pollDescription: string
  pollStartDate?: string
  pollStartTime?: string
  pollEndDate?: string
  pollEndTime?: string
  pollAmount: number
  pollCount: number
  pollPrice?: number
  contestants: LeaderboardEntry[]
  categories: any[]
  status: string
  suspended: boolean
  flagged: boolean
  creatorId: string
  organizerId: string
  createdAt: string
  deletedAt?: string
  deletedBy?: string
  totalPaidOut?: number
}

interface Stats {
  totalVotes: number
  leaderboard: LeaderboardEntry[]
}

type PayoutStatus = "pending" | "processing" | "failed" | "successful"

interface PayoutRecord {
  id: string
  pollId: string
  userId: string
  date: string
  amount: number
  bankName: string
  bankCode: string
  accountNumber: string
  accountName: string
  status: PayoutStatus
  createdAt: string | null
  updatedAt: string | null
  pendingAt: string | null
  processingAt: string | null
}

type Action = "flag" | "unflag" | "suspend" | "unsuspend" | "delete" | "restore"
type Tab = "overview" | "entries" | "payouts"

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
  ended: "bg-gray-100 text-gray-600 border-gray-200",
}

const PAYOUT_STATUS_CONFIG: Record<PayoutStatus, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <Clock className="w-3 h-3" /> },
  processing: { label: "Processing", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: <Loader className="w-3 h-3 animate-spin" /> },
  failed: { label: "Failed", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <XCircle className="w-3 h-3" /> },
  successful: { label: "Successful", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: <CheckCircle2 className="w-3 h-3" /> },
}

const ENTRIES_PAGE_SIZE = 10

export function VotesClient() {
  /* ── List / search view ── */
  const [polls, setPolls] = useState<PollSummary[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<PollSummary[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── Detail view ── */
  const [viewState, setViewState] = useState<"list" | "detail">("list")
  const [pollId, setPollId] = useState("")
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [poll, setPoll] = useState<PollData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [tab, setTab] = useState<Tab>("overview")
  const [visibleEntries, setVisibleEntries] = useState(ENTRIES_PAGE_SIZE)

  /* ── Payouts tab ── */
  const [payouts, setPayouts] = useState<PayoutRecord[]>([])
  const [payoutsLoaded, setPayoutsLoaded] = useState(false)
  const [payoutsLoading, setPayoutsLoading] = useState(false)
  const [payoutsError, setPayoutsError] = useState<string | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  /* ── Load recent 10 polls on mount ── */
  const fetchRecentPolls = useCallback(async () => {
    setLoadingList(true)
    setListError(null)
    try {
      const res = await fetch("/api/v1/admin-polls?action=listRecent")
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load polls")
      setPolls(json.data || [])
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load polls")
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { fetchRecentPolls() }, [fetchRecentPolls])

  /* ── Search suggestions (5+ chars, pollId or pollName) ── */
  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 5) { setSuggestions([]); return }
    setLoadingSuggestions(true)
    try {
      const res = await fetch(`/api/v1/admin-polls?action=search&term=${encodeURIComponent(term)}`)
      const json = await res.json()
      setSuggestions(json.data || [])
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSuggestions(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchSuggestions])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  /* ── Lookup a poll by ID (from list, search, or manual entry) ── */
  const handleLookup = async (id: string) => {
    const targetId = id.trim()
    if (!targetId) return
    setShowDropdown(false)
    setQuery("")
    setSuggestions([])
    setPollId(targetId)
    setViewState("detail")
    setTab("overview")
    setVisibleEntries(ENTRIES_PAGE_SIZE)
    setPayoutsLoaded(false)
    setPayouts([])
    setLoading(true); setError(null); setPoll(null); setStats(null); setConfirmDelete(false)
    try {
      const res = await fetch(`/api/v1/admin-polls?pollId=${encodeURIComponent(targetId)}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPoll(json.poll)
      setStats(json.stats)
      setDeleted(json.deleted)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poll not found")
    } finally {
      setLoading(false)
    }
  }

  const handleBackToList = () => {
    setViewState("list")
    setPoll(null)
    setStats(null)
    setError(null)
    fetchRecentPolls()
  }

  const handleAction = async (action: Action) => {
    if (!poll) return
    setActing(action)
    try {
      const res = await fetch("/api/v1/admin-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: pollId.trim(), action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(json.message || "Done", "success")
      setConfirmDelete(false)
      await handleLookup(pollId)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Action failed", "error")
    } finally {
      setActing(null)
    }
  }

  /* ── Payout history (lazy-loaded on tab switch) ── */
  const fetchPayouts = useCallback(async () => {
    setPayoutsLoading(true)
    setPayoutsError(null)
    try {
      const res = await fetch(`/api/v1/admin-polls?pollId=${encodeURIComponent(pollId)}&action=payouts`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load payout history")
      setPayouts(json.data || [])
      setPayoutsLoaded(true)
    } catch (e) {
      setPayoutsError(e instanceof Error ? e.message : "Failed to load payout history")
    } finally {
      setPayoutsLoading(false)
    }
  }, [pollId])

  useEffect(() => {
    if (tab === "payouts" && !payoutsLoaded && !payoutsLoading) fetchPayouts()
  }, [tab, payoutsLoaded, payoutsLoading, fetchPayouts])

  /* ═══════════════════════════════════════════
     LIST VIEW
  ═══════════════════════════════════════════ */
  if (viewState === "list") {
    const showSearchResults = showDropdown && query.length >= 5

    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-16">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
            {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Vote className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Voting Control</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Showing 10 most recent polls. Search by poll ID or poll name to find any other poll.
              </p>
            </div>
          </div>
        </div>

        {/* Search box */}
        <div ref={dropdownRef} className="relative mb-6">
          <div
            className={`relative flex items-center bg-white border transition-all duration-150 shadow-sm
              ${showSearchResults && suggestions.length > 0
                ? "rounded-t-2xl border-b-transparent border-violet-300 shadow-md"
                : "rounded-2xl border-slate-200 hover:border-slate-300 focus-within:border-violet-400 focus-within:shadow-md"
              }`}
          >
            <div className="pl-4 shrink-0">
              {loadingSuggestions ? (
                <div className="w-4 h-4 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => e.key === "Enter" && query.trim() && handleLookup(query.trim())}
              placeholder="Search poll name or paste poll ID…"
              className="flex-1 bg-transparent px-3 py-3.5 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none font-mono"
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setSuggestions([]); setShowDropdown(false); inputRef.current?.focus() }}
                className="pr-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-violet-300 rounded-b-2xl overflow-hidden z-50 shadow-xl">
              {suggestions.length > 0 ? (
                <>
                  <div className="px-4 pt-3 pb-1.5 flex items-center gap-2 border-b border-slate-100">
                    <Search className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                      Results for &quot;{query}&quot;
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {suggestions.map((item) => (
                      <button
                        key={item.pollId}
                        onClick={() => handleLookup(item.pollId)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                          {item.pollImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.pollImage} alt={item.pollName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base">🗳️</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors truncate">
                            {item.pollName}
                          </p>
                          <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{item.pollId}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_PILL[item.status] || STATUS_PILL.active}`}>
                          {item.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : !loadingSuggestions ? (
                <p className="px-4 py-5 text-center text-sm text-slate-400">No polls found for &quot;{query}&quot;</p>
              ) : null}
            </div>
          )}
        </div>

        {/* Recent polls list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-violet-500" />
              <h2 className="font-semibold text-sm text-slate-700">Recent Polls</h2>
              {!loadingList && (
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{polls.length}</span>
              )}
            </div>
            <button
              onClick={fetchRecentPolls}
              disabled={loadingList}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loadingList ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                  <div className="w-14 h-5 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : listError ? (
            <div className="px-5 py-10 text-center space-y-2">
              <p className="text-sm text-red-500">{listError}</p>
              <button onClick={fetchRecentPolls} className="text-xs text-violet-600 hover:underline">Try again</button>
            </div>
          ) : polls.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-400">No polls found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {polls.map((item) => (
                <button
                  key={item.pollId}
                  onClick={() => handleLookup(item.pollId)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    {item.pollImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.pollImage} alt={item.pollName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">🗳️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors truncate">
                      {item.pollName}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{item.pollId}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200 uppercase">
                      {item.pollType}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_PILL[item.status] || STATUS_PILL.active}`}>
                      {item.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* ═══════════════════════════════════════════
     DETAIL VIEW
  ═══════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-12 space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <button
        onClick={handleBackToList}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to polls
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-500 flex items-center gap-2 px-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      ) : poll && stats ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="relative h-40 bg-slate-100">
            {poll.pollImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poll.pollImage} alt={poll.pollName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon className="w-10 h-10" />
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {deleted && <Badge color="gray">Deleted</Badge>}
              {poll.flagged && <Badge color="amber">Flagged</Badge>}
              {poll.suspended && <Badge color="red">Suspended</Badge>}
              {!deleted && !poll.suspended && <Badge color="emerald">{poll.status}</Badge>}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{poll.pollName}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{poll.pollDescription}</p>
              <p className="text-xs text-gray-400 font-mono mt-1">{pollId}</p>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 border-b border-slate-200 -mx-4 px-4 overflow-x-auto">
              <TabButton active={tab === "overview"} onClick={() => setTab("overview")} icon={<Trophy className="w-3.5 h-3.5" />} label="Overview" />
              <TabButton
                active={tab === "entries"}
                onClick={() => setTab("entries")}
                icon={<Users className="w-3.5 h-3.5" />}
                label="Entries"
                count={stats.leaderboard.length}
              />
              <TabButton active={tab === "payouts"} onClick={() => setTab("payouts")} icon={<ReceiptText className="w-3.5 h-3.5" />} label="Payouts" />
            </div>

            {/* ── Overview tab ── */}
            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <StatCard icon={<Users className="w-4 h-4" />} label="Votes cast" value={poll.pollCount ?? stats.totalVotes} />
                  <StatCard icon={<Wallet className="w-4 h-4" />} label="Revenue" value={`₦${Number(poll.pollAmount ?? 0).toLocaleString("en-NG")}`} />
                  <StatCard icon={<Trophy className="w-4 h-4" />} label="Type" value={poll.pollType === "group" ? "Group" : "Single"} />
                </div>

                {(poll.pollStartDate || poll.pollEndDate) && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {poll.pollStartDate} {poll.pollStartTime} — {poll.pollEndDate} {poll.pollEndTime}
                  </div>
                )}

                {stats.leaderboard.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5" /> Top 10 leaderboard
                    </p>
                    <div className="space-y-1.5">
                      {stats.leaderboard.slice(0, 10).map((c, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                          <span className="text-sm text-gray-700 flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}</span>
                            <span className="truncate">{c.name}</span>
                            {c.categoryName && (
                              <span className="shrink-0 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
                                {c.categoryName}
                              </span>
                            )}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 shrink-0 ml-2">{c.votes.toLocaleString("en-NG")} votes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {deleted && poll.deletedBy && (
                  <p className="text-xs text-gray-400">Deleted by {poll.deletedBy} on {new Date(poll.deletedAt || "").toLocaleString("en-NG")}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {deleted ? (
                    <ActionButton
                      onClick={() => handleAction("restore")}
                      loading={acting === "restore"}
                      icon={<RotateCcw className="w-4 h-4" />}
                      label="Restore poll"
                      variant="primary"
                    />
                  ) : (
                    <>
                      <ActionButton
                        onClick={() => handleAction(poll.flagged ? "unflag" : "flag")}
                        loading={acting === "flag" || acting === "unflag"}
                        icon={<Flag className="w-4 h-4" />}
                        label={poll.flagged ? "Unflag" : "Flag"}
                        variant={poll.flagged ? "default" : "warning"}
                      />
                      <ActionButton
                        onClick={() => handleAction(poll.suspended ? "unsuspend" : "suspend")}
                        loading={acting === "suspend" || acting === "unsuspend"}
                        icon={poll.suspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                        label={poll.suspended ? "Unsuspend" : "Suspend"}
                        variant={poll.suspended ? "default" : "warning"}
                      />
                      {!confirmDelete ? (
                        <ActionButton
                          onClick={() => setConfirmDelete(true)}
                          icon={<Trash2 className="w-4 h-4" />}
                          label="Delete"
                          variant="danger"
                        />
                      ) : (
                        <>
                          <ActionButton
                            onClick={() => handleAction("delete")}
                            loading={acting === "delete"}
                            icon={<Trash2 className="w-4 h-4" />}
                            label="Confirm delete"
                            variant="danger-solid"
                          />
                          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                            Cancel
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">
                  Deleting a poll is a soft delete — its data is archived and can be restored at any time.
                </p>
              </div>
            )}

            {/* ── Entries tab ── */}
            {tab === "entries" && (
              <div className="space-y-3">
                {stats.leaderboard.length === 0 ? (
                  <div className="py-10 text-center">
                    <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No entries yet</p>
                  </div>
                ) : (
                  <>
                    {poll.pollType === "group" && (
                      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" /> Entries are tagged with the category they were nominated under
                      </p>
                    )}
                    <div className="space-y-1.5">
                      {stats.leaderboard.slice(0, visibleEntries).map((c, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50">
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                            {c.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">{i + 1}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 font-medium truncate">{c.name}</p>
                            {c.categoryName && (
                              <p className="text-[11px] text-violet-600 flex items-center gap-1 mt-0.5">
                                <Tag className="w-2.5 h-2.5" /> {c.categoryName}
                              </p>
                            )}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 shrink-0">{c.votes.toLocaleString("en-NG")} votes</span>
                        </div>
                      ))}
                    </div>
                    {visibleEntries < stats.leaderboard.length && (
                      <button
                        onClick={() => setVisibleEntries((n) => n + ENTRIES_PAGE_SIZE)}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-dashed border-violet-200"
                      >
                        <ChevronDown className="w-4 h-4" />
                        Load more ({stats.leaderboard.length - visibleEntries} remaining)
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Payouts tab ── */}
            {tab === "payouts" && (
              <div className="space-y-3">
                {payoutsLoading ? (
                  <div className="flex items-center justify-center py-14">
                    <div className="text-center space-y-3">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto" />
                      <p className="text-sm text-gray-400">Loading payout history…</p>
                    </div>
                  </div>
                ) : payoutsError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-sm text-red-600">{payoutsError}</p>
                    <button onClick={fetchPayouts} className="text-xs text-red-600 underline mt-2 font-medium">Try again</button>
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <ReceiptText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-semibold">No payout requests yet</p>
                    <p className="text-xs text-gray-400 mt-1">Payout requests filed by the poll owner will appear here.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500">
                        {payouts.length} payout request{payouts.length !== 1 ? "s" : ""}
                      </p>
                      <button
                        onClick={fetchPayouts}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    </div>
                    <div className="space-y-2.5">
                      {payouts.map((p) => {
                        const cfg = PAYOUT_STATUS_CONFIG[p.status] || PAYOUT_STATUS_CONFIG.pending
                        return (
                          <div key={p.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 text-sm">{p.date}</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                              <span>Amount: <span className="font-semibold text-gray-800">₦{Number(p.amount).toLocaleString("en-NG")}</span></span>
                              <span>Bank: <span className="font-semibold text-gray-800">{p.bankName}</span></span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              {p.accountName} · •••• {p.accountNumber.slice(-4)}
                            </p>
                            {p.createdAt && (
                              <p className="text-[11px] text-gray-400">Submitted: {new Date(p.createdAt).toLocaleString("en-NG")}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TabButton({
  active, onClick, icon, label, count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap
        ${active ? "border-[#6b2fa5] text-[#6b2fa5]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
    >
      {icon}
      {label}
      {typeof count === "number" && count > 0 && (
        <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${active ? "bg-[#6b2fa5]/10 text-[#6b2fa5]" : "bg-gray-100 text-gray-500"}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: "gray" | "amber" | "red" | "emerald" }) {
  const styles: Record<string, string> = {
    gray: "bg-gray-800/80 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-red-600 text-white",
    emerald: "bg-emerald-600 text-white",
  }
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${styles[color]}`}>{children}</span>
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center text-[#6b2fa5] mb-1">{icon}</div>
      <p className="text-sm font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}

function ActionButton({
  onClick, loading, icon, label, variant,
}: {
  onClick: () => void
  loading?: boolean
  icon: React.ReactNode
  label: string
  variant: "primary" | "default" | "warning" | "danger" | "danger-solid"
}) {
  const styles: Record<string, string> = {
    primary: "bg-[#6b2fa5] text-white hover:bg-[#5a2589]",
    default: "border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    warning: "border-2 border-amber-300 text-amber-700 hover:bg-amber-50",
    danger: "border-2 border-red-200 text-red-600 hover:bg-red-50",
    "danger-solid": "bg-red-600 text-white hover:bg-red-700",
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}
