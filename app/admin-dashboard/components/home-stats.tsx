"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { YearStats } from "./year-stats"
import { MonthStats } from "./month-stats"
import { DayStats } from "./day-stats"

export interface StatsData {
  year: string
  previousYear: string
  currentMonth: string
  previousMonth: string
  currentDay: string
  yearly: {
    ticketsSold: number
    totalRevenue: number
    usersSignedUp: number
  }
  previousYearly: {
    ticketsSold: number
    totalRevenue: number
    usersSignedUp: number
  }
  monthly: {
    current: {
      ticketsSold: number
      totalRevenue: number
      usersSignedUp: number
    }
    previous: {
      ticketsSold: number
      totalRevenue: number
      usersSignedUp: number
    }
    all: Array<{
      month: string
      ticketsSold?: number
      totalRevenue?: number
      usersSignedUp?: number
    }>
  }
  daily: {
    today: {
      ticketsSold: number
      totalRevenue: number
      usersSignedUp: number
    }
    previousDays: Array<{
      day: string
      ticketsSold?: number
      totalRevenue?: number
      usersSignedUp?: number
    }>
    all: Array<{
      day: string
      ticketsSold?: number
      totalRevenue?: number
      usersSignedUp?: number
    }>
  }
}

export function HomeStats() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/v1/home-stats")
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch stats")
        }

        setStats(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading stats</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard Overview</h2>

      {/* Year Stats */}
      <YearStats stats={stats} />

      {/* Month Stats */}
      <MonthStats stats={stats} />

      {/* Day Stats */}
      <DayStats stats={stats} />
    </div>
  )
}
