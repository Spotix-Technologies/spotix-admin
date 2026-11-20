"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Ticket, Users, Banknote } from "lucide-react"
import type { StatsData } from "./home-stats"
import { getMonthName, getPreviousMonthName, parseMonthString } from "@/hooks/use-month"
import { formatCurrency, formatNumber } from "@/lib/stat-format"
import { StatCard, StatGrid } from "./stat-card"

interface MonthStatsProps {
  stats: StatsData
}

type ViewMode = "revenue" | "tickets" | "signups" | "transactionFees" | "payout" | "payoutCount"

export function MonthStats({ stats }: MonthStatsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue")

  const { ticketsSold, totalRevenue, usersSignedUp, totalTransactionFees, payout, payoutCount } = stats.monthly.current

  const prevMonth = stats.monthly.previous
  const prevMonthName = getPreviousMonthName(stats.currentMonth)

  const parsedMonth = parseMonthString(stats.currentMonth)
  const monthName = parsedMonth ? getMonthName(parsedMonth.month) : "Current Month"

  const chartData = stats.daily.all.map((day) => {
    const dayNum = Number.parseInt(day.day.split("-")[2], 10)
    const dayTickets = day.ticketsSold || 0
    const dayRevenue = day.totalRevenue || 0

    return {
      day: dayNum.toString(),
      revenue: dayRevenue,
      tickets: dayTickets,
      signups: day.usersSignedUp || 0,
      transactionFees: day.totalTransactionFees || 0,
      payout: day.payout || 0,
      payoutCount: day.payoutCount || 0,
    }
  })

  const chartConfig = {
    revenue: { label: "Revenue", color: "#6b2fa5" },
    tickets: { label: "Tickets", color: "#22c55e" },
    signups: { label: "Sign-ups", color: "#3b82f6" },
    transactionFees: { label: "Transaction Fees", color: "#f59e0b" },
    payout: { label: "Payout", color: "#f97316" },
    payoutCount: { label: "Payout Count", color: "#06b6d4" },
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
              value="transactionFees"
              aria-label="View transaction fees"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Fees
            </ToggleGroupItem>
            <ToggleGroupItem
              value="payout"
              aria-label="View payout"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Payout
            </ToggleGroupItem>
            <ToggleGroupItem
              value="payoutCount"
              aria-label="View payout count"
              className="text-[10px] md:text-xs h-7 md:h-8 px-2 md:px-3"
            >
              Payout Count
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        <StatGrid className="mb-4 md:mb-6">
          <StatCard label="Monthly Revenue" icon={Banknote} tone="purple" current={totalRevenue} previous={prevMonth.totalRevenue} kind="currency" />
          <StatCard label="Tickets Sold" icon={Ticket} tone="green" current={ticketsSold} previous={prevMonth.ticketsSold} kind="number" />
          <StatCard label="Users Signed Up" icon={Users} tone="blue" current={usersSignedUp} previous={prevMonth.usersSignedUp} kind="number" />
          <StatCard label="Monthly Fees" icon={Banknote} tone="amber" current={totalTransactionFees} previous={prevMonth.totalTransactionFees} kind="currency" />
          <StatCard label="Monthly Payout" icon={Banknote} tone="orange" current={payout} previous={prevMonth.payout} kind="currency" />
          <StatCard label="Payout Count" icon={Ticket} tone="cyan" current={payoutCount} previous={prevMonth.payoutCount} kind="number" />
        </StatGrid>

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
