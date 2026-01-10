"use client"

import { useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts"
import { AlertCircle, TrendingUp, Flag } from "lucide-react"

interface EventDataTabProps {
  eventData: {
    id: string
    eventName: string
    eventImage: string
    ticketsSold: number
    totalRevenue: number
    ticketPrices: Array<{ policy: string; price: number }>
    flagged: boolean
  }
  eventId: string
  userId: string
  onFlaggedChange: (newStatus: boolean) => void
}

export default function EventDataTab({ eventData, eventId, userId, onFlaggedChange }: EventDataTabProps) {
  const [isFlagged, setIsFlagged] = useState(eventData.flagged)
  const [chartType, setChartType] = useState<"pie" | "area">("pie")
  const [togglingFlagged, setTogglingFlagged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const platformFee = 150 * eventData.ticketsSold

  const chargeFee = eventData.totalRevenue * 0.05 + eventData.ticketsSold * 100

  const netRevenue = eventData.totalRevenue - platformFee - chargeFee

  // Chart data for revenue breakdown (pie chart)
  const pieChartData = [
    { name: "Platform Fee", value: platformFee, fill: "#ef4444" },
    { name: "Charge Fee", value: chargeFee, fill: "#f97316" },
    { name: "Net Revenue", value: Math.max(netRevenue, 0), fill: "#10b981" },
  ]

  // Chart data for ticket sales trend (area chart)
  const areaChartData = eventData.ticketPrices && eventData.ticketPrices.length > 0
    ? eventData.ticketPrices.map((tp, index) => ({
        name: tp.policy,
        price: tp.price,
        potential: tp.price * eventData.ticketsSold,
      }))
    : []

  const handleToggleFlagged = async () => {
    setTogglingFlagged(true)
    setError(null)

    try {
      const response = await fetch("/api/v1/event-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          eventId: eventId,
          flagged: !isFlagged,
        }),
      })

      const json = await response.json()

      if (!response.ok) {
        setError(json.error || json.message || "Failed to update flag status")
        return
      }

      setIsFlagged(!isFlagged)
      onFlaggedChange(!isFlagged)
    } catch (err) {
      console.error("Error toggling flagged status:", err)
      setError(err instanceof Error ? err.message : "Failed to update flag status")
    } finally {
      setTogglingFlagged(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {eventData.eventImage && (
              <img
                src={eventData.eventImage || "/placeholder.svg"}
                alt={eventData.eventName}
                className="h-16 w-16 rounded-lg object-cover md:h-20 md:w-20"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">{eventData.eventName}</h1>
              <p className="text-sm text-gray-600">Event ID: {eventId}</p>
              <p className="text-sm text-gray-600">Booker ID: {userId}</p>
            </div>
          </div>

          <button
            onClick={handleToggleFlagged}
            disabled={togglingFlagged}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors ${
              isFlagged ? "bg-red-500 text-white hover:bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            } disabled:opacity-50`}
          >
            <Flag className="h-4 w-4" />
            {isFlagged ? "Flagged" : "Not Flagged"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Tickets Sold */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{eventData.ticketsSold}</p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="mt-2 text-3xl font-bold text-green-600">₦{eventData.totalRevenue.toLocaleString()}</p>
        </div>

        {/* Platform Fee */}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-600">Platform Fee (150 × {eventData.ticketsSold})</p>
          <p className="mt-2 text-3xl font-bold text-red-600">₦{platformFee.toLocaleString()}</p>
          <p className="mt-1 text-xs text-red-500">150 per ticket</p>
        </div>

        {/* Charge Fee */}
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-medium text-orange-600">Charge Fee (5% + 100 per ticket)</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">₦{chargeFee.toLocaleString()}</p>
          <p className="mt-1 text-xs text-orange-500">
            {(eventData.totalRevenue * 0.05).toLocaleString()} + {(eventData.ticketsSold * 100).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-700">Net Revenue (After Fees)</p>
            <p className="mt-2 text-4xl font-bold text-green-600">₦{Math.max(netRevenue, 0).toLocaleString()}</p>
          </div>
          <TrendingUp className="h-12 w-12 text-green-600" />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-gray-900">Revenue Breakdown</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType("pie")}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                chartType === "pie" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Pie Chart
            </button>
            <button
              onClick={() => setChartType("area")}
              className={`rounded-lg px-4 py-2 font-semibold transition-colors ${
                chartType === "area" ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Area Chart
            </button>
          </div>
        </div>

        <div className="h-96 w-full">
          {chartType === "pie" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ₦${value.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₦${value !== undefined && value !== null ? value.toLocaleString() : '0'}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : areaChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `₦${value !== undefined && value !== null ? value.toLocaleString() : '0'}`} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="potential"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorPrice)"
                  name="Revenue Potential"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No ticket price data available for area chart
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 md:p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Ticket Prices</h2>
        {eventData.ticketPrices && eventData.ticketPrices.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {eventData.ticketPrices.map((ticket, index) => (
              <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-600">{ticket.policy}</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">₦{ticket.price.toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No ticket prices configured for this event
          </div>
        )}
      </div>
    </div>
  )
}