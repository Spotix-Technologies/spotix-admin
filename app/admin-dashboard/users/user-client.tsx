"use client"

import { useState, useCallback, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { UserDetailsComponent } from "./components/user-details"
import { PayoutMethodsComponent } from "./components/payout-methods"
import { UserTicketsComponent } from "./components/user-tickets"
import { UserSessionsComponent } from "./components/user-sessions"
import {
  UserCreatedContentComponent,
  type UserEventSummary,
  type UserVotingPoll,
  type UserNominationPoll,
  type UserElection,
  type MerchListingSummary,
} from "./components/user-created-content"
import { Search, LayoutGrid } from "lucide-react"

type Tab = "details" | "payouts" | "tickets" | "sessions" | "created"

function UsersClientInner() {
  const searchParams = useSearchParams()

  const [searchEmail, setSearchEmail] = useState("")
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("details")

  // Search state
  const [searching, setSearching] = useState(false)
  const [searchFound, setSearchFound] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  // User data state
  const [userDetails, setUserDetails] = useState<any | null>(null)
  const [payoutMethods, setPayoutMethods] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])

  // Created content state (events / polls / merch)
  const [events, setEvents] = useState<UserEventSummary[]>([])
  const [voting, setVoting] = useState<UserVotingPoll[]>([])
  const [nominations, setNominations] = useState<UserNominationPoll[]>([])
  const [elections, setElections] = useState<UserElection[]>([])
  const [merch, setMerch] = useState<MerchListingSummary[]>([])

  // Loading state
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingPayouts, setLoadingPayouts] = useState(false)
  const [loadingTickets, setLoadingTickets] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [loadingPolls, setLoadingPolls] = useState(false)
  const [loadingMerch, setLoadingMerch] = useState(false)

  // Error state
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [payoutsError, setPayoutsError] = useState<string | null>(null)
  const [ticketsError, setTicketsError] = useState<string | null>(null)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [votingError, setVotingError] = useState<string | null>(null)
  const [nominationsError, setNominationsError] = useState<string | null>(null)
  const [electionsError, setElectionsError] = useState<string | null>(null)
  const [merchError, setMerchError] = useState<string | null>(null)

  const loadUserData = useCallback(async (email: string, userId: string) => {
    setSelectedEmail(email)
    setSelectedUserId(userId)
    setActiveTab("details")
    setDetailsError(null)
    setPayoutsError(null)
    setTicketsError(null)
    setSessionsError(null)
    setEventsError(null)
    setVotingError(null)
    setNominationsError(null)
    setElectionsError(null)
    setMerchError(null)

    try {
      // Load user details
      setLoadingDetails(true)
      const detailsResponse = await fetch(`/api/v1/users/${encodeURIComponent(email)}`)
      if (detailsResponse.ok) {
        setUserDetails(await detailsResponse.json())
      } else {
        setDetailsError("Failed to load user details")
      }
      setLoadingDetails(false)

      // Load payout methods — pass userId as query param
      setLoadingPayouts(true)
      const payoutsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/payout-methods?userId=${encodeURIComponent(userId)}`
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

      // Load events this user organizes
      setLoadingEvents(true)
      const eventsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/events?userId=${encodeURIComponent(userId)}`
      )
      if (eventsResponse.ok) {
        const data = await eventsResponse.json()
        setEvents(data.events || [])
      } else {
        setEventsError("Failed to load events")
      }
      setLoadingEvents(false)

      // Load polls this user created (voting / nominations / elections)
      setLoadingPolls(true)
      const pollsResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/polls?userId=${encodeURIComponent(userId)}`
      )
      if (pollsResponse.ok) {
        const data = await pollsResponse.json()
        setVoting(data.voting || [])
        setNominations(data.nominations || [])
        setElections(data.elections || [])
        if (data.votingError) setVotingError(data.votingError)
        if (data.nominationsError) setNominationsError(data.nominationsError)
        if (data.electionsError) setElectionsError(data.electionsError)
      } else {
        setVotingError("Failed to load voting polls")
        setNominationsError("Failed to load nomination polls")
        setElectionsError("Failed to load elections")
      }
      setLoadingPolls(false)

      // Load merch this user has listed
      setLoadingMerch(true)
      const merchResponse = await fetch(
        `/api/v1/users/${encodeURIComponent(email)}/merch?userId=${encodeURIComponent(userId)}`
      )
      if (merchResponse.ok) {
        const data = await merchResponse.json()
        setMerch(data.listings || [])
      } else {
        setMerchError("Failed to load merch")
      }
      setLoadingMerch(false)
    } catch (error) {
      console.error("[v0] Load user data error:", error)
      setDetailsError("Failed to load user data")
      setLoadingDetails(false)
      setLoadingPayouts(false)
      setLoadingTickets(false)
      setLoadingSessions(false)
      setLoadingEvents(false)
      setLoadingPolls(false)
      setLoadingMerch(false)
    }
  }, [])

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
        const response = await fetch(
          `/api/v1/users/search?email=${encodeURIComponent(email)}`
        )
        const data = await response.json()

        if (data.found) {
          setSearchFound(true)
          await loadUserData(email, data.user.uid)
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

  // Accept a direct query using the userId — e.g. an admin lands here via
  // /admin-dashboard/users?userId=<uid> after clicking an organizerId
  // elsewhere in the dashboard (event data, polls, merch). Resolves the
  // uid to an email via /api/v1/users/by-uid, then reuses the normal
  // loadUserData flow exactly like an email search would.
  const loadUserByUid = useCallback(
    async (userId: string) => {
      setSearchError(null)
      setSearchFound(false)
      setSearching(true)
      try {
        const response = await fetch(`/api/v1/users/by-uid?userId=${encodeURIComponent(userId)}`)
        const data = await response.json()

        if (data.found) {
          setSearchEmail(data.user.email || "")
          setSearchFound(true)
          await loadUserData(data.user.email, data.user.uid)
        } else {
          setSearchError("User not found")
        }
      } catch (error) {
        console.error("[v0] Load by userId error:", error)
        setSearchError("Failed to look up user")
      } finally {
        setSearching(false)
      }
    },
    [loadUserData]
  )

  useEffect(() => {
    const userId = searchParams.get("userId")
    if (userId) loadUserByUid(userId)
    // Only run this on the initial param — deliberately not re-running on
    // every searchParams identity change once a user is loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRefreshPayouts = useCallback(() => {
    if (selectedEmail && selectedUserId) {
      loadUserData(selectedEmail, selectedUserId)
    }
  }, [selectedEmail, selectedUserId, loadUserData])

  const handleDeleteMethod = useCallback((methodId: string) => {
    setPayoutMethods((prev) => prev.filter((m) => m.id !== methodId))
  }, [])

  const handleSetPrimary = useCallback((methodId: string) => {
    setPayoutMethods((prev) =>
      prev.map((m) => ({ ...m, primary: m.id === methodId }))
    )
  }, [])

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
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/40 focus:border-[#6b2fa5]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-3 bg-[#6b2fa5] text-white rounded-lg font-medium hover:bg-[#5a2589] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {searching ? "Searching..." : "Search"}
            </button>
          </form>

          {searchError && (
            <p className="mt-3 text-sm text-red-600">{searchError}</p>
          )}

          {searchFound && selectedEmail && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-sm text-emerald-800">
                User found:{" "}
                <span className="font-semibold">{selectedEmail}</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* User Details Section */}
      {selectedEmail && selectedUserId && (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 flex-wrap">
            {(["details", "payouts", "tickets", "sessions", "created"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab
                    ? "border-[#6b2fa5] text-[#6b2fa5]"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "created" && <LayoutGrid className="w-3.5 h-3.5" />}
                {tab === "details" && "Details"}
                {tab === "payouts" && "Payout Methods"}
                {tab === "tickets" && "Tickets"}
                {tab === "sessions" && "Sessions"}
                {tab === "created" && "Created Content"}
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
              userId={selectedUserId}
              email={selectedEmail}
              methods={payoutMethods}
              loading={loadingPayouts}
              error={payoutsError}
              onRefresh={handleRefreshPayouts}
              onDeleteMethod={handleDeleteMethod}
              onSetPrimary={handleSetPrimary}
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

          {activeTab === "created" && (
            <UserCreatedContentComponent
              events={events}
              loadingEvents={loadingEvents}
              eventsError={eventsError}
              voting={voting}
              votingError={votingError}
              nominations={nominations}
              nominationsError={nominationsError}
              elections={elections}
              electionsError={electionsError}
              loadingPolls={loadingPolls}
              merch={merch}
              loadingMerch={loadingMerch}
              merchError={merchError}
            />
          )}
        </div>
      )}
    </div>
  )
}

export function UsersClient() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24">Loading...</div>}>
      <UsersClientInner />
    </Suspense>
  )
}
