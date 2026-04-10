"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, X, Clock, Trash2, RotateCcw, ShieldAlert } from "lucide-react"
import EventDataTab from "./event-data-tab"
import ReviewDeletedEvents from "./review-deleted-events"
import { useAdminSession } from "@/hooks/use-admin-session"

interface SearchSuggestion {
  eventId: string
  eventName: string
  eventImage: string
  status: string
  organizerId: string
}

interface EventData {
  id: string
  eventName: string
  eventDescription: string
  eventImage: string
  eventImages: string[]
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  eventVenue: string
  venueCoordinates: { lat: number; lng: number } | null
  eventType: string
  isFree: boolean
  ticketPrices: Array<{
    policy: string
    price: string
    description: string
    ticketsSold: number
    availableTickets: number
  }>
  ticketsSold: number
  revenue: number
  totalRevenue: number
  paidAmount: number
  totalPaidOut: number
  likeCount: number
  status: string
  flagged: boolean
  suspended: boolean
  organizerId: string
  affiliateId: string | null
  affiliateName: string | null
  allowAgents: boolean
  enabledCollaboration: boolean
  hasStopDate: boolean
  stopDate: string | null
  createdAt: string | null
  updatedAt: string | null
  attendeeCount: number
}

type ViewState = "search" | "eventDetails" | "deletedEvents"

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  inactive: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  completed: "bg-blue-100 text-blue-700 border-blue-200",
}

export function EventDataClient() {
  const { session, loading: sessionLoading } = useAdminSession()
  const [viewState, setViewState] = useState<ViewState>("search")
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<SearchSuggestion[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem("spotix_admin_recent_events")
      if (stored) setRecentSearches(JSON.parse(stored))
    } catch {}
  }, [])

  const saveRecent = (item: SearchSuggestion) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((r) => r.eventId !== item.eventId)
      const updated = [item, ...filtered].slice(0, 5)
      try { localStorage.setItem("spotix_admin_recent_events", JSON.stringify(updated)) } catch {}
      return updated
    })
  }

  const fetchSuggestions = useCallback(async (term: string) => {
    if (term.length < 5) { setSuggestions([]); return }
    setLoadingSuggestions(true)
    try {
      const res = await fetch(`/api/v1/event-data?action=search&term=${encodeURIComponent(term)}`)
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelectEvent = async (item: SearchSuggestion) => {
    setShowDropdown(false)
    setQuery(item.eventName)
    setError(null)
    setLoadingEvent(true)
    saveRecent(item)
    try {
      const res = await fetch(`/api/v1/event-data?action=getEventDetails&eventId=${item.eventId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to load event")
      setEventData(json.data)
      setViewState("eventDetails")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event")
    } finally {
      setLoadingEvent(false)
    }
  }

  const handleBackToSearch = () => {
    setViewState("search")
    setEventData(null)
    setError(null)
    setQuery("")
  }

  /* ── Not admin ── */
  if (!sessionLoading && session && !session.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Access Denied</h2>
          <p className="text-sm text-slate-500">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  /* ── Loading state ── */
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  /* ── Event details ── */
  if (viewState === "eventDetails") {
    if (loadingEvent) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Fetching event data…</p>
          </div>
        </div>
      )
    }
    if (!eventData) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-red-500 font-medium">Event data unavailable</p>
            <button onClick={handleBackToSearch} className="text-sm text-slate-500 hover:text-slate-700 underline">
              ← Back to search
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <button
            onClick={handleBackToSearch}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Back to search
          </button>
          <EventDataTab
            eventData={eventData}
            onUpdate={(updated) => setEventData(updated)}
            onDeleted={handleBackToSearch}
          />
        </div>
      </div>
    )
  }

  /* ── Deleted events ── */
  if (viewState === "deletedEvents") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <button
            onClick={() => setViewState("search")}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Back to search
          </button>
          <ReviewDeletedEvents />
        </div>
      </div>
    )
  }

  /* ── Search ── */
  const displaySuggestions = query.length >= 5 ? suggestions : recentSearches
  const isShowingRecents = query.length < 5 && recentSearches.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-24">

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-full px-4 py-1.5 mb-5">
            <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
            <span className="text-xs text-violet-600 font-semibold tracking-widest uppercase">Spotix Admin</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">
            Event Data
          </h1>
          <p className="text-slate-500 text-sm md:text-base">
            Search any event by name or ID to inspect and moderate.
          </p>
          {session && (
            <p className="text-xs text-slate-400 mt-2">
              Signed in as <span className="font-medium text-slate-600">{session.username}</span>
            </p>
          )}
        </div>

        {/* Search box */}
        <div ref={dropdownRef} className="relative">
          <div
            className={`relative flex items-center bg-white border transition-all duration-150 shadow-sm
              ${showDropdown && displaySuggestions.length > 0
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
              placeholder="Search event name or paste event ID…"
              className="flex-1 bg-transparent px-3 py-4 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none"
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

          {/* Dropdown */}
          {showDropdown && displaySuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-violet-300 rounded-b-2xl overflow-hidden z-50 shadow-xl">
              {isShowingRecents && (
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-2 border-b border-slate-100">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">Recent</span>
                </div>
              )}
              {!isShowingRecents && query.length >= 5 && (
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-2 border-b border-slate-100">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                    Results for "{query}"
                  </span>
                </div>
              )}
              <div className="divide-y divide-slate-100">
                {displaySuggestions.map((item) => (
                  <button
                    key={item.eventId}
                    onClick={() => handleSelectEvent(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left group"
                  >
                    {/* Snapshot */}
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      {item.eventImage ? (
                        <img src={item.eventImage} alt={item.eventName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">🎪</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-violet-700 transition-colors truncate">
                        {item.eventName}
                      </p>
                      <p className="text-xs text-slate-400 font-mono truncate mt-0.5">{item.eventId}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_PILL[item.status] || STATUS_PILL.active}`}>
                      {item.status}
                    </span>
                  </button>
                ))}
              </div>
              {query.length >= 5 && suggestions.length === 0 && !loadingSuggestions && (
                <p className="px-4 py-5 text-center text-sm text-slate-400">No events found for "{query}"</p>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-3">
          Type at least 5 characters to see suggestions
        </p>

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-4">
            <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Deleted events link */}
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => setViewState("deletedEvents")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all text-sm shadow-sm group"
          >
            <Trash2 className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            Review Deleted Events
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

      </div>
    </div>
  )
}