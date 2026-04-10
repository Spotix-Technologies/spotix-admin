"use client"

import { useState, useCallback, useMemo } from "react"
import { UserDetailsComponent } from "./components/user-details"
import { PayoutMethodsComponent } from "./components/payout-methods"
import { UserTicketsComponent } from "./components/user-tickets"
import { UserSessionsComponent } from "./components/user-sessions"
import type { UserDetails } from "@/app/api/v1/users/[email]/route"
import type { PayoutMethod } from "@/app/api/v1/users/[email]/payout-methods/route"
import type { UserTicket } from "@/app/api/v1/users/[email]/tickets/route"
import type { UserSession } from "@/app/api/v1/users/[email]/sessions/route"
import { Search } from "lucide-react"
import { getCache, setCache, CACHE_KEYS } from "@/lib/cache"

interface SearchResult {
  email: string
  displayName: string
  userId: string
  ticketsCount: number
}

export function UsersClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"details" | "payouts" | "tickets" | "sessions">("details")

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // User data state
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([])
  const [tickets, setTickets] = useState<UserTicket[]>([])
  const [sessions, setSessions] = useState<UserSession[]>([])

  // Loading state
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Error state
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [payoutsError, setPayoutsError] = useState<string | null>(null)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  // Search users
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    setSearchError(null)

    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const cached = getCache<SearchResult[]>(CACHE_KEYS.USER_SEARCH(query))
      if (cached) {
        setSearchResults(cached)
        return
      }

      const response = await fetch(`/api/v1/users/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        setCache(CACHE_KEYS.USER_SEARCH(query), data.results, 300)
        setSearchResults(data.results)
      } else {
        setSearchError(data.error || "Failed to search users")
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      setSearchError("Failed to search users")
    } finally {
      setSearching(false)
    }
  }, [])

  // Load user details
  const loadUserData = useCallback(async (email: string) => {
    setSelectedEmail(email)
    setActiveTab("details")
    setDetailsError(null)

    try {
      // Load user details
      setLoadingDetails(true)
      const detailsResponse = await fetch(`/api/v1/users/${encodeURIComponent(email)}`)
      if (detailsResponse.ok) {
        const details = await detailsResponse.json()
        setUserDetails(details)
      } else {
        setDetailsError("Failed to load user details")
      }

      // Load payout methods
      setLoadingPayouts(true)
      const payoutsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods`
      )
      if (payoutsResponse.ok) {
        const data = await payoutsResponse.json()
        setPayoutMethods(data.methods)
      } else {
        setPayoutsError("Failed to load payout methods")
      }

      // Load tickets
      setLoadingTickets(true)
      const ticketsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/tickets`
      )
      if (ticketsResponse.ok) {
        const data = await ticketsResponse.json()
        setTickets(data.tickets)
      } else {
        setTicketsError("Failed to load tickets")
      }

      // Load sessions
      setLoadingSessions(true)
      const sessionsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/sessions`
      )
      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json()
        setSessions(data.sessions)
      } else {
        setSessionsError("Failed to load sessions")
      }
    } catch (error) {
      console.error("[v0] Load user data error:", error)
      setDetailsError("Failed to load user data")
    } finally {
      setLoadingDetails(false)
      setLoadingPayouts(false)
      setLoadingTickets(false)
      setLoadingSessions(false)
    }
  }, [])

  // Block/Unblock user
  const handleBlockUser = useCallback(
    async (reason: string) => {
      if (!selectedEmail) return

      try {
        const response = await fetch(
          `/api/v1/users/${encodeURIComponent(selectedEmail)}/block`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason }),
          }
        )

        if (response.ok) {
          // Reload user details
          await loadUserData(selectedEmail)
        }
      } catch (error) {
        console.error("[v0] Block user error:", error)
      }
    },
    [selectedEmail, loadUserData]
  )

  const handleUnblockUser = useCallback(async () => {
    if (!selectedEmail) return

    try {
      const response = await fetch(
        `/api/v1/users/${encodeURIComponent(selectedEmail)}/block`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        // Reload user details
        await loadUserData(selectedEmail)
      }
    } catch (error) {
      console.error("[v0] Unblock user error:", error)
    }
  }, [selectedEmail, loadUserData])

  const handleRefreshPayouts = useCallback(() => {
    if (selectedEmail) {
      loadUserData(selectedEmail)
    }
  }, [selectedEmail, loadUserData])

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Search Users</h2>
        </div>

        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="email"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by email or name (minimum 2 characters)..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {searchError && (
            <p className="mt-3 text-sm text-red-600">{searchError}</p>
          )}

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result) => (
                <button
                  key={result.email}
                  onClick={() => loadUserData(result.email)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    selectedEmail === result.email
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{result.displayName}</p>
                  <p className="text-xs text-slate-600 mt-1">{result.email}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {result.ticketsCount} tickets
                  </p>
                </button>
              ))}
            </div>
          )}

          {searching && (
            <p className="mt-4 text-sm text-slate-600">Searching...</p>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && !searchError && (
            <p className="mt-4 text-sm text-slate-600">No users found</p>
          )}
        </div>
      </div>

      {/* User Details Section */}
      {selectedEmail && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            {(["details", "payouts", "tickets", "sessions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "details" && "Details"}
                {tab === "payouts" && "Payout Methods"}
                {tab === "tickets" && "Tickets"}
                {tab === "sessions" && "Sessions"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "details" && (
            <UserDetailsComponent
              user={userDetails}
              loading={loadingDetails}
              error={detailsError}
              onBlockUser={handleBlockUser}
              onUnblockUser={handleUnblockUser}
            />
          )}

          {activeTab === "payouts" && (
            <PayoutMethodsComponent
              email={selectedEmail}
              methods={payoutMethods}
              loading={loadingPayouts}
              error={payoutsError}
              onRefresh={handleRefreshPayouts}
              onDeleteMethod={(methodId) => {
                setPayoutMethods((prev) => prev.filter((m) => m.id !== methodId))
              }}
            />
          )}

          {activeTab === "tickets" && (
            <UserTicketsComponent
              tickets={tickets}
              loading={loadingTickets}
              error={ticketsError}
            />
          )}

          {activeTab === "sessions" && (
            <UserSessionsComponent
              sessions={sessions}
              loading={loadingSessions}
              error={sessionsError}
            />
          )}
        </div>
      )}
    </div>
  )
}
