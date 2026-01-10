"use client"

import { useState } from "react"
import { Search, ArrowLeft, Calendar, AlertCircle } from "lucide-react"
import EventDataTab from "../components/event-data-tab"

interface UserEvent {
  eventId: string
  eventName: string
  ticketsSold: number
  totalRevenue: number
}

interface EventData {
  id: string
  eventName: string
  eventImage: string
  ticketsSold: number
  totalRevenue: number
  ticketPrices: Array<{ policy: string; price: number }>
  flagged: boolean
}

type ViewState = "search" | "events" | "eventDetails"

export function EventDataClient() {
  const [viewState, setViewState] = useState<ViewState>("search")
  const [bookerIdInput, setBookerIdInput] = useState("")
  const [searchedBookerId, setSearchedBookerId] = useState<string | null>(null)
  const [userEvents, setUserEvents] = useState<UserEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search for user events
  const handleSearchBooker = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const trimmedId = bookerIdInput.trim()
    
    if (!trimmedId) {
      setError("Please enter a Booker ID")
      return
    }

    setLoading(true)
    setError(null)
    setSearchedBookerId(trimmedId)

    try {
      console.log("Searching for booker:", trimmedId)
      const response = await fetch(`/api/v1/event-data?action=getUserEvents&userId=${trimmedId}`)
      const json = await response.json()

      console.log("API Response:", json)

      if (!response.ok) {
        setError(json.error || json.message || "Failed to fetch events for this booker")
        setLoading(false)
        return
      }

      if (!json.data || !Array.isArray(json.data)) {
        setError("Invalid response format from server")
        setLoading(false)
        return
      }

      if (json.data.length === 0) {
        setError("No events found for this Booker ID")
        setLoading(false)
        return
      }

      console.log(`Found ${json.data.length} events`)
      setUserEvents(json.data)
      setViewState("events")
    } catch (err) {
      console.error("Error searching booker:", err)
      setError(err instanceof Error ? err.message : "Failed to search for booker")
    } finally {
      setLoading(false)
    }
  }

  // Fetch event details
  const handleEventClick = async (eventId: string) => {
    if (!searchedBookerId) return

    setLoading(true)
    setError(null)
    setSelectedEventId(eventId)

    try {
      const response = await fetch(
        `/api/v1/event-data?action=getEventDetails&userId=${searchedBookerId}&eventId=${eventId}`
      )
      const json = await response.json()

      if (!response.ok) {
        setError(json.error || json.message || "Failed to fetch event details")
        setLoading(false)
        return
      }

      if (!json.data) {
        setError("Invalid response format from server")
        setLoading(false)
        return
      }

      setEventData(json.data)
      setViewState("eventDetails")
    } catch (err) {
      console.error("Error fetching event details:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch event details")
    } finally {
      setLoading(false)
    }
  }

  // Navigation handlers
  const goBackToSearch = () => {
    setViewState("search")
    setSearchedBookerId(null)
    setUserEvents([])
    setBookerIdInput("")
    setError(null)
  }

  const goBackToEvents = () => {
    setViewState("events")
    setSelectedEventId(null)
    setEventData(null)
    setError(null)
  }

  // View 1: Search Input
  if (viewState === "search") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 md:mb-12 text-center">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-3 md:mb-4">Admin Dashboard</h1>
            <p className="text-sm md:text-lg text-slate-600">Enter a Booker ID to view their events</p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchBooker} className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 md:left-5 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 md:h-6 md:w-6" />
              <input
                type="text"
                placeholder="Enter Booker ID..."
                value={bookerIdInput}
                onChange={(e) => {
                  setBookerIdInput(e.target.value)
                  setError(null)
                }}
                className="w-full pl-12 md:pl-14 pr-4 py-4 md:py-5 text-base md:text-lg border-2 border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                disabled={loading}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !bookerIdInput.trim()}
              className="w-full mt-4 bg-indigo-600 text-white font-semibold py-3 md:py-4 px-6 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Searching...
                </span>
              ) : (
                "Search Events"
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 md:p-5 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-600 font-medium text-sm md:text-base">{error}</p>
                <p className="text-red-500 text-xs md:text-sm mt-1">Please check the Booker ID and try again</p>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 md:mt-12 bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm md:text-base">How to use:</h3>
            <ul className="text-blue-800 space-y-1 text-xs md:text-sm list-disc list-inside">
              <li>Enter the Booker's user ID in the search field</li>
              <li>Click "Search Events" to view all events created by this booker</li>
              <li>Select an event to view detailed analytics and revenue breakdown</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // View 2: User's Events List
  if (viewState === "events") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={goBackToSearch}
            className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 mb-4 md:mb-6 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm md:text-base"
          >
            <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
            New Search
          </button>

          <div className="mb-6 md:mb-8">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-2 break-words">
              Events by <span className="block md:inline mt-1 md:mt-0 text-indigo-600">{searchedBookerId}</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600">{userEvents.length} event(s) found</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
              <p className="text-red-600 text-sm md:text-base">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm md:text-base">Loading events...</p>
              </div>
            </div>
          ) : userEvents.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-6 md:p-8 text-center">
              <p className="text-slate-500 text-sm md:text-base">No events found for this booker</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {userEvents.map((event) => (
                <button
                  key={event.eventId}
                  onClick={() => handleEventClick(event.eventId)}
                  className="bg-white rounded-lg border border-slate-200 p-4 md:p-6 hover:shadow-lg transition-shadow text-left group"
                >
                  <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-4 w-4 md:h-5 md:w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate text-sm md:text-base">
                        {event.eventName}
                      </h3>
                      <p className="text-xs md:text-sm text-slate-500 truncate">{event.eventId}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-slate-600">Tickets Sold</span>
                      <span className="font-semibold text-slate-900 text-sm md:text-base">{event.ticketsSold}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-slate-600">Revenue</span>
                      <span className="font-semibold text-green-600 text-sm md:text-base">₦{event.totalRevenue.toLocaleString()}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // View 3: Event Details
  if (viewState === "eventDetails") {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading event details...</p>
          </div>
        </div>
      )
    }

    if (!eventData || !searchedBookerId || !selectedEventId) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-red-500">
            <p className="text-xl font-semibold mb-2">Error</p>
            <p>Event data not available</p>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <button
            onClick={goBackToEvents}
            className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 mb-4 md:mb-6 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm md:text-base"
          >
            <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
            Back to Events
          </button>

          <EventDataTab
            eventData={eventData}
            eventId={selectedEventId}
            userId={searchedBookerId}
            onFlaggedChange={(newStatus) => {
              setEventData({ ...eventData, flagged: newStatus })
            }}
          />
        </div>
      </div>
    )
  }

  return null
}