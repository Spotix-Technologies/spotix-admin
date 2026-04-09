"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Ticket, Users, Banknote, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { StatsData } from "./home-stats"
import { getMonthAbbreviation } from "@/hooks/use-month"

interface YearStatsProps {
  stats: StatsData
}

type ViewMode = "revenue" | "tickets" | "signups" | "transactionFees" | "totalEvents" | "paidEvents"

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

export function YearStats({ stats }: YearStatsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue")

  const { totalRevenue, ticketsSold, usersSignedUp, totalTransactionFees, totalEvents, paidEvents, freeEvents } = stats.yearly

  const prevYearly = stats.previousYearly

  const chartData = stats.monthly.all.map((month) => {
    const monthNum = Number.parseInt(month.month.split("-")[1], 10)
    const monthTickets = month.ticketsSold || 0
    const monthRevenue = month.totalRevenue || 0

    return {
      month: getMonthAbbreviation(monthNum),
      revenue: monthRevenue,
      tickets: monthTickets,
      signups: month.usersSignedUp || 0,
      transactionFees: month.totalTransactionFees || 0,
      totalEvents: month.totalEvents || 0,
      paidEvents: month.paidEvents || 0,
    }
  })

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const monthAbbr = getMonthAbbreviation(i + 1)
    const existing = chartData.find((d) => d.month === monthAbbr)
    return existing || { month: monthAbbr, revenue: 0, tickets: 0, signups: 0, transactionFees: 0, totalEvents: 0, paidEvents: 0 }
  })

  const chartConfig = {
    revenue: { label: "Revenue", color: "#6b2fa5" },
    tickets: { label: "Tickets", color: "#22c55e" },
    signups: { label: "Sign-ups", color: "#3b82f6" },
    transactionFees: { label: "Transaction Fees", color: "#f59e0b" },
    totalEvents: { label: "Total Events", color: "#f97316" },
    paidEvents: { label: "Paid Events", color: "#06b6d4" },
  }

  const dataKey = viewMode
  const currentColor = chartConfig[viewMode].color

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col gap-3 md:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base md:text-lg font-semibold">{stats.year} Year Statistics</CardTitle>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Compared to {stats.previousYear}</p>
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
        <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6 lg:grid-cols-6">
          <div className="p-2 md:p-4 rounded-lg bg-purple-50 border border-purple-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Banknote className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                <span className="text-[10px] md:text-xs font-medium text-purple-600">Total Revenue</span>
              </div>
              <PercentageIndicator current={totalRevenue} previous={prevYearly.totalRevenue} />
            </div>
            <p className="text-sm md:text-xl font-bold text-purple-900 truncate">
              {formatCurrency(totalRevenue)}
            </p>
            <p className="text-[10px] md:text-xs text-purple-600/70 mt-0.5 md:mt-1 truncate">
              vs {formatCurrency(prevYearly.totalRevenue)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-green-50 border border-green-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                <span className="text-[10px] md:text-xs font-medium text-green-600">Tickets Sold</span>
              </div>
              <PercentageIndicator current={ticketsSold} previous={prevYearly.ticketsSold} />
            </div>
            <p className="text-sm md:text-xl font-bold text-green-900">{formatNumber(ticketsSold)}</p>
            <p className="text-[10px] md:text-xs text-green-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(prevYearly.ticketsSold)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                <span className="text-[10px] md:text-xs font-medium text-blue-600">Users Signed Up</span>
              </div>
              <PercentageIndicator current={usersSignedUp} previous={prevYearly.usersSignedUp} />
            </div>
            <p className="text-sm md:text-xl font-bold text-blue-900">{formatNumber(usersSignedUp)}</p>
            <p className="text-[10px] md:text-xs text-blue-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(prevYearly.usersSignedUp)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Banknote className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                <span className="text-[10px] md:text-xs font-medium text-amber-600">Total Fees</span>
              </div>
              <PercentageIndicator current={totalTransactionFees} previous={prevYearly.totalTransactionFees} />
            </div>
            <p className="text-sm md:text-xl font-bold text-amber-900 truncate">{formatCurrency(totalTransactionFees)}</p>
            <p className="text-[10px] md:text-xs text-amber-600/70 mt-0.5 md:mt-1 truncate">
              vs {formatCurrency(prevYearly.totalTransactionFees)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-orange-50 border border-orange-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-orange-600" />
                <span className="text-[10px] md:text-xs font-medium text-orange-600">Total Events</span>
              </div>
              <PercentageIndicator current={totalEvents} previous={prevYearly.totalEvents} />
            </div>
            <p className="text-sm md:text-xl font-bold text-orange-900">{formatNumber(totalEvents)}</p>
            <p className="text-[10px] md:text-xs text-orange-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(prevYearly.totalEvents)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-cyan-50 border border-cyan-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-cyan-600" />
                <span className="text-[10px] md:text-xs font-medium text-cyan-600">Paid Events</span>
              </div>
              <PercentageIndicator current={paidEvents} previous={prevYearly.paidEvents} />
            </div>
            <p className="text-sm md:text-xl font-bold text-cyan-900">{formatNumber(paidEvents)}</p>
            <p className="text-[10px] md:text-xs text-cyan-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(prevYearly.paidEvents)}
            </p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[200px] md:h-[250px] lg:h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={allMonths} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={10}
                tick={{ fontSize: 10 }}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={10}
                tick={{ fontSize: 10 }}
                width={45}
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
      </CardContent>
    </Card>
  )
}
