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

type ViewMode = "revenue" | "tickets" | "signups" | "profit"

const PLATFORM_FEE = 150
const CHARGE_PERCENTAGE = 0.05
const CHARGE_FIXED = 100

function calculateFinancials(totalRevenue: number, ticketsSold: number) {
  const platformFee = ticketsSold * PLATFORM_FEE
  const chargeAmount = totalRevenue * CHARGE_PERCENTAGE + ticketsSold * CHARGE_FIXED
  const profit = platformFee + chargeAmount

  return {
    totalRevenue,
    platformFee,
    chargeAmount,
    profit,
  }
}

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

  const { totalRevenue, ticketsSold, usersSignedUp } = stats.yearly
  const financials = calculateFinancials(totalRevenue, ticketsSold)

  const prevYearly = stats.previousYearly
  const prevFinancials = calculateFinancials(prevYearly.totalRevenue, prevYearly.ticketsSold)

  const chartData = stats.monthly.all.map((month) => {
    const monthNum = Number.parseInt(month.month.split("-")[1], 10)
    const monthTickets = month.ticketsSold || 0
    const monthRevenue = month.totalRevenue || 0
    const monthFinancials = calculateFinancials(monthRevenue, monthTickets)

    return {
      month: getMonthAbbreviation(monthNum),
      revenue: monthRevenue,
      tickets: monthTickets,
      signups: month.usersSignedUp || 0,
      profit: monthFinancials.profit,
      platformFee: monthFinancials.platformFee,
      charge: monthFinancials.chargeAmount,
    }
  })

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const monthAbbr = getMonthAbbreviation(i + 1)
    const existing = chartData.find((d) => d.month === monthAbbr)
    return existing || { month: monthAbbr, revenue: 0, tickets: 0, signups: 0, profit: 0, platformFee: 0, charge: 0 }
  })

  const chartConfig = {
    revenue: { label: "Revenue", color: "#6b2fa5" },
    tickets: { label: "Tickets", color: "#22c55e" },
    signups: { label: "Sign-ups", color: "#3b82f6" },
    profit: { label: "Profit", color: "#f59e0b" },
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
              value="profit"
              aria-label="View profit"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Profit
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <div className="grid grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6 lg:grid-cols-4">
          <div className="p-2 md:p-4 rounded-lg bg-purple-50 border border-purple-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Banknote className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                <span className="text-[10px] md:text-xs font-medium text-purple-600">Total Revenue</span>
              </div>
              <PercentageIndicator current={financials.totalRevenue} previous={prevFinancials.totalRevenue} />
            </div>
            <p className="text-sm md:text-xl font-bold text-purple-900 truncate">
              {formatCurrency(financials.totalRevenue)}
            </p>
            <p className="text-[10px] md:text-xs text-purple-600/70 mt-0.5 md:mt-1 truncate">
              vs {formatCurrency(prevFinancials.totalRevenue)}
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
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                <span className="text-[10px] md:text-xs font-medium text-amber-600">Total Profit</span>
              </div>
              <PercentageIndicator current={financials.profit} previous={prevFinancials.profit} />
            </div>
            <p className="text-sm md:text-xl font-bold text-amber-900 truncate">{formatCurrency(financials.profit)}</p>
            <p className="text-[10px] md:text-xs text-amber-600/70 mt-0.5 md:mt-1 truncate">
              vs {formatCurrency(prevFinancials.profit)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 mb-4 md:mb-6">
          <div className="p-2 md:p-3 rounded-lg bg-gray-50 border">
            <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">
              Platform Fee (NGN 150 x {formatNumber(ticketsSold)})
            </p>
            <p className="text-sm md:text-base font-semibold text-gray-900">{formatCurrency(financials.platformFee)}</p>
          </div>
          <div className="p-2 md:p-3 rounded-lg bg-gray-50 border">
            <p className="text-[10px] md:text-xs text-gray-500 mb-0.5 md:mb-1">Charge (5% + NGN 100/ticket)</p>
            <p className="text-sm md:text-base font-semibold text-gray-900">
              {formatCurrency(financials.chargeAmount)}
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
