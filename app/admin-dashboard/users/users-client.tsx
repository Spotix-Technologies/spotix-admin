"use client"

import { useState, useCallback } from "react"
import { UserDetailsComponent } from "./components/user-details"
import { PayoutMethodsComponent } from "./components/payout-methods"
import { UserTicketsComponent } from "./components/user-tickets"
import { UserSessionsComponent } from "./components/user-sessions"
import { Search } from "lucide-react"

export function UsersClient() {
  const [searchEmail, setSearchEmail] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"details" | "payouts" | "tickets" | "sessions">("details")

  // Search state
  const [searching, setSearching] = useState(false)
  const [searchFound, setSearchFound] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // User data state
  const [userDetails, setUserDetails] = useState<any | null>(null)
  const [payoutMethods, setPayoutMethods] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])

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

  // Load user details
  const loadUserData = useCallback(async (email: string) => {
    setSelectedEmail(email)
    setActiveTab("details")
    setDetailsError(null)
    setPayoutsError(null)
    setTicketsError(null)
    setSessionsError(null)

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
      setLoadingDetails(false)

      // Load payout methods
      setLoadingPayouts(true)
      const payoutsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods`
      )
      if (payoutsResponse.ok) {
        const data = await payoutsResponse.json()
        setPayoutMethods(data.methods || [])
      } else {
        setPayoutsError("Failed to load payout methods")
      }
      setLoadingPayouts(false)

      // Load tickets
      setLoadingTickets(true)
      const ticketsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/tickets`
      )
      if (ticketsResponse.ok) {
        const data = await ticketsResponse.json()
        setTickets(data.tickets || [])
      } else {
        setTicketsError("Failed to load tickets")
      }
      setLoadingTickets(false)

      // Load sessions
      setLoadingSessions(true)
      const sessionsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/sessions`
      )
      if (sessionsResponse.ok) {
        const data = await sessionsResponse.json()
        setSessions(data.sessions || [])
      } else {
        setSessionsError("Failed to load sessions")
      }
      setLoadingSessions(false)
    } catch (error) {
      console.error("[v0] Load user data error:", error)
      setDetailsError("Failed to load user data")
      setLoadingDetails(false)
      setLoadingPayouts(false)
      setLoadingTickets(false)
      setLoadingSessions(false)
    }
  }, [])

  // Search users by email
  const handleSearch = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault()
      setSearchError(null)
      setSearchFound(false)

      const email = searchEmail.trim()
      if (!email) {
        setSearchError("Please enter an email address")
        return
      }

      setSearching(true)
      try {
        const response = await fetch(`/api/v1/users/search?email=${encodeURIComponent(email)}`)
        const data = await response.json()

        if (data.found) {
          setSearchFound(true)
          await loadUserData(email)
        } else {
          setSearchError("User not found")
        }
      } catch (error) {
        console.error("[v0] Search error:", error)
        setSearchError("Failed to search users")
      } finally {
        setSearching(false)
      }
    },
    [searchEmail, loadUserData]
  )

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
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter user email address..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError && <p className="mt-3 text-sm text-red-600">{searchError}</p>}

          {searchFound && selectedEmail && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                User found: <span className="font-semibold">{selectedEmail}</span>
              </p>
            </div>
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
