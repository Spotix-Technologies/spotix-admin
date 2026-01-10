"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Ticket, Users, Banknote, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { StatsData } from "./home-stats"
import { getMonthName, parseMonthString } from "@/hooks/use-month"

interface MonthStatsProps {
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

  return { totalRevenue, platformFee, chargeAmount, profit }
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

function getPreviousMonthName(currentMonth: string): string {
  const parsed = parseMonthString(currentMonth)
  if (!parsed) return "Previous Month"

  if (parsed.month === 1) {
    return `December ${parsed.year - 1}`
  }
  return getMonthName(parsed.month - 1)
}

export function MonthStats({ stats }: MonthStatsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue")

  const { ticketsSold, totalRevenue, usersSignedUp } = stats.monthly.current
  const financials = calculateFinancials(totalRevenue, ticketsSold)

  const prevMonth = stats.monthly.previous
  const prevFinancials = calculateFinancials(prevMonth.totalRevenue, prevMonth.ticketsSold)
  const prevMonthName = getPreviousMonthName(stats.currentMonth)

  const parsedMonth = parseMonthString(stats.currentMonth)
  const monthName = parsedMonth ? getMonthName(parsedMonth.month) : "Current Month"

  const chartData = stats.daily.all.map((day) => {
    const dayNum = Number.parseInt(day.day.split("-")[2], 10)
    const dayTickets = day.ticketsSold || 0
    const dayRevenue = day.totalRevenue || 0
    const dayFinancials = calculateFinancials(dayRevenue, dayTickets)

    return {
      day: dayNum.toString(),
      revenue: dayRevenue,
      tickets: dayTickets,
      signups: day.usersSignedUp || 0,
      profit: dayFinancials.profit,
    }
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
            <CardTitle className="text-base md:text-lg font-semibold">{monthName} Statistics</CardTitle>
            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">Compared to {prevMonthName}</p>
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
                <span className="text-[10px] md:text-xs font-medium text-purple-600">Monthly Revenue</span>
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
              <PercentageIndicator current={ticketsSold} previous={prevMonth.ticketsSold} />
            </div>
            <p className="text-sm md:text-xl font-bold text-green-900">{formatNumber(ticketsSold)}</p>
            <p className="text-[10px] md:text-xs text-green-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(prevMonth.ticketsSold)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                <span className="text-[10px] md:text-xs font-medium text-blue-600">Users Signed Up</span>
              </div>
              <PercentageIndicator current={usersSignedUp} previous={prevMonth.usersSignedUp} />
            </div>
            <p className="text-sm md:text-xl font-bold text-blue-900">{formatNumber(usersSignedUp)}</p>
            <p className="text-[10px] md:text-xs text-blue-600/70 mt-0.5 md:mt-1">
              vs {formatNumber(prevMonth.usersSignedUp)}
            </p>
          </div>
          <div className="p-2 md:p-4 rounded-lg bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between mb-1 md:mb-2 flex-wrap gap-1">
              <div className="flex items-center gap-1 md:gap-2">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                <span className="text-[10px] md:text-xs font-medium text-amber-600">Monthly Profit</span>
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

        <ChartContainer config={chartConfig} className="h-[180px] md:h-[220px] lg:h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} tick={{ fontSize: 10 }} />
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
              <defs>
                <linearGradient id={`gradient-${viewMode}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={currentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={currentColor}
                strokeWidth={2}
                fill={`url(#gradient-${viewMode})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
