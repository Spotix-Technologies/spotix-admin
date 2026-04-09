"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Ticket, Users, Banknote, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react"
import type { StatsData } from "./home-stats"
import { getMonthName, parseDayString } from "@/hooks/use-month"

interface DayStatsProps {
  stats: StatsData
}

type ViewMode = "revenue" | "tickets" | "signups" | "transactionFees" | "totalEvents" | "paidEvents"
type CompareMode = "1" | "3" | "7"

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-NG").format(num)
}

/**
 * Get Nigerian time (WAT = UTC+1)
 */
function getNigerianDate(date: Date = new Date()): Date {
  return new Date(date.getTime() + 60 * 60 * 1000)
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateString(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Calculate previous N days in YYYY-MM-DD format
 * Handles cross-month and cross-year scenarios
 */
function getPreviousDays(currentDateString: string, count: number): string[] {
  const [year, month, day] = currentDateString.split("-").map(Number)
  const currentDate = new Date(Date.UTC(year, month - 1, day))

  const previousDays: string[] = []

  for (let i = 1; i <= count; i++) {
    const previousDate = new Date(currentDate)
    previousDate.setUTCDate(currentDate.getUTCDate() - i)
    previousDays.push(formatDateString(previousDate))
  }

  return previousDays
}

/**
 * Format day label for display (e.g., "1/10" or "Yesterday")
 */
function formatDayLabel(dayString: string, index: number): string {
  if (index === 0) return "Yesterday"
  const parsed = parseDayString(dayString)
  if (!parsed) return dayString
  return `${parsed.month}/${parsed.day}`
}

function calculatePercentageChange(
  current: number,
  previous: number,
): { value: number; trend: "up" | "down" | "neutral" } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, trend: current > 0 ? "up" : "neutral" }
  }
  const change = ((current - previous) / previous) * 100
  return {
    value: Math.abs(change),
    trend: change > 0 ? "up" : change < 0 ? "down" : "neutral",
  }
}

function PercentageIndicator({ current, previous }: { current: number; previous: number }) {
  const { value, trend } = calculatePercentageChange(current, previous)

  if (trend === "neutral") {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-3 h-3" />
        <span className="text-xs">0%</span>
      </div>
    )
  }

  const isUp = trend === "up"
  return (
    <div className={`flex items-center gap-1 ${isUp ? "text-green-600" : "text-red-600"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="text-xs font-medium">{value.toFixed(1)}%</span>
    </div>
  )
}

export function DayStats({ stats }: DayStatsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue")
  const [compareMode, setCompareMode] = useState<CompareMode>("1")

  const { ticketsSold, totalRevenue, usersSignedUp, totalTransactionFees, totalEvents, paidEvents, freeEvents } = stats.daily.today

  // Calculate previous days dates
  const previousDaysDates = useMemo(() => {
    return getPreviousDays(stats.currentDay, 7) // Always calculate 7 days
  }, [stats.currentDay])

  // Create a map of dates to data for easy lookup
  const dailyDataMap = useMemo(() => {
    const map = new Map<string, any>()

    // Add today's data
    map.set(stats.currentDay, stats.daily.today)

    // Add previous days data
    if (stats.daily.previousDays && Array.isArray(stats.daily.previousDays)) {
      stats.daily.previousDays.forEach((dayData: any) => {
        if (dayData.day) {
          map.set(dayData.day, dayData)
        }
      })
    }

    // Also check if daily.all exists
    if (stats.daily.all && Array.isArray(stats.daily.all)) {
      stats.daily.all.forEach((dayData: any) => {
        if (dayData.day) {
          map.set(dayData.day, dayData)
        }
      })
    }

    return map
  }, [stats.daily, stats.currentDay])

  // Get yesterday's data for comparison
  const yesterdayDate = previousDaysDates[0]
  const yesterdayData = dailyDataMap.get(yesterdayDate) || {
    day: yesterdayDate,
    ticketsSold: 0,
    totalRevenue: 0,
    usersSignedUp: 0,
    totalTransactionFees: 0,
    totalEvents: 0,
    paidEvents: 0,
    freeEvents: 0,
  }

  // Parse current day for display
  const parsedDay = parseDayString(stats.currentDay)
  const dayDisplay = parsedDay ? `${getMonthName(parsedDay.month)} ${parsedDay.day}, ${parsedDay.year}` : "Today"

  // Get chart data based on compare mode
  const chartData = useMemo(() => {
    const daysToShow = Number.parseInt(compareMode, 10)
    const relevantDates = previousDaysDates.slice(0, daysToShow)

    // Build chart data in chronological order (oldest to newest)
    const chartDays = relevantDates.reverse().map((dateStr, index) => {
      const dayData = dailyDataMap.get(dateStr) || {
        ticketsSold: 0,
        totalRevenue: 0,
        usersSignedUp: 0,
        totalTransactionFees: 0,
        totalEvents: 0,
        paidEvents: 0,
        freeEvents: 0,
      }

      const dayTickets = dayData.ticketsSold || 0
      const dayRevenue = dayData.totalRevenue || 0

      return {
        day: formatDayLabel(dateStr, daysToShow - index - 1),
        dateStr,
        revenue: dayRevenue,
        tickets: dayTickets,
        signups: dayData.usersSignedUp || 0,
        transactionFees: dayData.totalTransactionFees || 0,
        totalEvents: dayData.totalEvents || 0,
        paidEvents: dayData.paidEvents || 0,
        freeEvents: dayData.freeEvents || 0,
      }
    })

    // Add today at the end
    chartDays.push({
      day: "Today",
      dateStr: stats.currentDay,
      revenue: totalRevenue,
      tickets: ticketsSold,
      signups: usersSignedUp,
      transactionFees: totalTransactionFees,
      totalEvents: totalEvents,
      paidEvents: paidEvents,
      freeEvents: freeEvents,
    })

    return chartDays
  }, [
    compareMode,
    previousDaysDates,
    dailyDataMap,
    stats.currentDay,
    ticketsSold,
    totalRevenue,
    usersSignedUp,
    totalTransactionFees,
    totalEvents,
    paidEvents,
    freeEvents,
  ])



  const chartConfig = {
    revenue: { label: "Revenue", color: "#6b2fa5" },
    tickets: { label: "Tickets", color: "#22c55e" },
    signups: { label: "Sign-ups", color: "#3b82f6" },
    profit: { label: "Profit", color: "#f59e0b" },
  }

  const dataKey = viewMode
  const currentColor = chartConfig[viewMode].color

  const colorClasses = {
    purple: "bg-purple-100 border-purple-200 text-purple-900",
    green: "bg-green-100 border-green-200 text-green-900",
    blue: "bg-blue-100 border-blue-200 text-blue-900",
    amber: "bg-amber-100 border-amber-200 text-amber-900",
  }

  const highlightValue = () => {
    switch (viewMode) {
      case "revenue":
        return { label: "Today's Revenue", value: formatCurrency(totalRevenue), color: "purple" }
      case "tickets":
        return { label: "Tickets Sold Today", value: formatNumber(ticketsSold), color: "green" }
      case "signups":
        return { label: "Sign-ups Today", value: formatNumber(usersSignedUp), color: "blue" }
      case "transactionFees":
        return { label: "Transaction Fees Today", value: formatCurrency(totalTransactionFees), color: "amber" }
      case "totalEvents":
        return { label: "Total Events Today", value: formatNumber(totalEvents), color: "orange" }
      case "paidEvents":
        return { label: "Paid Events Today", value: formatNumber(paidEvents), color: "cyan" }
    }
  }

  const highlight = highlightValue()

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-base md:text-lg font-semibold truncate">{dayDisplay}</CardTitle>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Compared to yesterday</p>
            </div>
          </div>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="flex-wrap justify-start sm:justify-end"
          >
            <ToggleGroupItem
              value="revenue"
              aria-label="View revenue"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Revenue
            </ToggleGroupItem>
            <ToggleGroupItem
              value="tickets"
              aria-label="View tickets"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Tickets
            </ToggleGroupItem>
            <ToggleGroupItem
              value="signups"
              aria-label="View sign-ups"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Sign-ups
            </ToggleGroupItem>
            <ToggleGroupItem
              value="transactionFees"
              aria-label="View transaction fees"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Fees
            </ToggleGroupItem>
            <ToggleGroupItem
              value="totalEvents"
              aria-label="View total events"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Events
            </ToggleGroupItem>
            <ToggleGroupItem
              value="paidEvents"
              aria-label="View paid events"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Paid Events
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <div
          className={`p-4 md:p-6 rounded-xl border-2 mb-4 md:mb-6 text-center relative ${colorClasses[highlight.color as keyof typeof colorClasses]}`}
        >
          <div className="absolute top-2 right-2 md:top-3 md:right-3">
            {viewMode === "revenue" && (
              <PercentageIndicator current={totalRevenue} previous={yesterdayData.totalRevenue || 0} />
            )}
            {viewMode === "tickets" && (
              <PercentageIndicator current={ticketsSold} previous={yesterdayData.ticketsSold || 0} />
            )}
            {viewMode === "signups" && (
              <PercentageIndicator current={usersSignedUp} previous={yesterdayData.usersSignedUp || 0} />
            )}
            {viewMode === "transactionFees" && (
              <PercentageIndicator current={totalTransactionFees} previous={yesterdayData.totalTransactionFees || 0} />
            )}
            {viewMode === "totalEvents" && (
              <PercentageIndicator current={totalEvents} previous={yesterdayData.totalEvents || 0} />
            )}
            {viewMode === "paidEvents" && (
              <PercentageIndicator current={paidEvents} previous={yesterdayData.paidEvents || 0} />
            )}
          </div>
          <p className="text-xs md:text-sm font-medium mb-1 md:mb-2">{highlight.label}</p>
          <p className="text-2xl md:text-4xl font-bold truncate">{highlight.value}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-6">
          <div className="p-2 md:p-4 rounded-lg bg-purple-50 border border-purple-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Banknote className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                <span className="text-[10px] md:text-xs font-medium text-purple-600">Revenue</span>
              </div>
              <PercentageIndicator current={totalRevenue} previous={yesterdayData.totalRevenue || 0} />
            </div>
            <p className="text-sm md:text-lg font-bold text-purple-900 truncate">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[10px] md:text-xs text-purple-600/70 mt-0.5 md:mt-1 truncate">
              vs {formatCurrency(yesterdayData.totalRevenue || 0)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                <span className="text-[10px] md:text-xs font-medium text-green-600">Tickets</span>
              </div>
              <PercentageIndicator current={ticketsSold} previous={yesterdayData.ticketsSold || 0} />
            </div>
            <p className="text-sm md:text-lg font-bold text-green-900">{formatNumber(ticketsSold)}</p>
            <p className="text-[10px] md:text-xs text-green-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(yesterdayData.ticketsSold || 0)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                <span className="text-[10px] md:text-xs font-medium text-blue-600">Sign-ups</span>
              </div>
              <PercentageIndicator current={usersSignedUp} previous={yesterdayData.usersSignedUp || 0} />
            </div>
            <p className="text-sm md:text-lg font-bold text-blue-900">{formatNumber(usersSignedUp)}</p>
            <p className="text-[10px] md:text-xs text-blue-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(yesterdayData.usersSignedUp || 0)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Banknote className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                <span className="text-[10px] md:text-xs font-medium text-amber-600">Fees</span>
              </div>
              <PercentageIndicator current={totalTransactionFees} previous={yesterdayData.totalTransactionFees || 0} />
            </div>
            <p className="text-sm md:text-lg font-bold text-amber-900 truncate">{formatCurrency(totalTransactionFees)}</p>
            <p className="text-[10px] md:text-xs text-amber-600/70 mt-0.5 md:mt-1 truncate">
              vs {formatCurrency(yesterdayData.totalTransactionFees || 0)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-orange-50 border border-orange-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-orange-600" />
                <span className="text-[10px] md:text-xs font-medium text-orange-600">Total Events</span>
              </div>
              <PercentageIndicator current={totalEvents} previous={yesterdayData.totalEvents || 0} />
            </div>
            <p className="text-sm md:text-lg font-bold text-orange-900">{formatNumber(totalEvents)}</p>
            <p className="text-[10px] md:text-xs text-orange-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(yesterdayData.totalEvents || 0)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-cyan-50 border border-cyan-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-cyan-600" />
                <span className="text-[10px] md:text-xs font-medium text-cyan-600">Paid Events</span>
              </div>
              <PercentageIndicator current={paidEvents} previous={yesterdayData.paidEvents || 0} />
            </div>
            <p className="text-sm md:text-lg font-bold text-cyan-900">{formatNumber(paidEvents)}</p>
            <p className="text-[10px] md:text-xs text-cyan-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(yesterdayData.paidEvents || 0)}
            </p>
          </div>
        </div>

        <div className="mt-4 md:mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 mb-3 md:mb-4">
            <h4 className="text-xs md:text-sm font-semibold text-gray-700">Daily Comparison</h4>
            <ToggleGroup
              type="single"
              value={compareMode}
              onValueChange={(v) => v && setCompareMode(v as CompareMode)}
              className="justify-start sm:justify-end"
            >
              <ToggleGroupItem
                value="1"
                aria-label="Compare 1 day"
                className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
              >
                1 Day
              </ToggleGroupItem>
              <ToggleGroupItem
                value="3"
                aria-label="Compare 3 days"
                className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
              >
                3 Days
              </ToggleGroupItem>
              <ToggleGroupItem
                value="7"
                aria-label="Compare 7 days"
                className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
              >
                7 Days
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <ChartContainer config={chartConfig} className="h-[150px] md:h-[180px] lg:h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={9} tick={{ fontSize: 9 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={9}
                  tick={{ fontSize: 9 }}
                  width={40}
                  tickFormatter={(v) => (viewMode === "tickets" || viewMode === "signups" ? v : `₦${v / 1000}k`)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        if (name === "tickets" || name === "signups") return formatNumber(value as number)
                        return formatCurrency(value as number)
                      }}
                    />
                  }
                />
                <Bar dataKey={dataKey} fill={currentColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}
