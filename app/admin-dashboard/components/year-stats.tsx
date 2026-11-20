"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Ticket, Users, Banknote } from "lucide-react"
import type { StatsData } from "./home-stats"
import { getMonthAbbreviation } from "@/hooks/use-month"
import { formatCurrency, formatNumber } from "@/lib/stat-format"
import { StatCard, StatGrid } from "./stat-card"

interface YearStatsProps {
  stats: StatsData
}

type ViewMode = "revenue" | "tickets" | "signups" | "transactionFees" | "payout" | "payoutCount"

export function YearStats({ stats }: YearStatsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("revenue")

  const { totalRevenue, ticketsSold, usersSignedUp, totalTransactionFees, payout, payoutCount } = stats.yearly

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
      payout: month.payout || 0,
      payoutCount: month.payoutCount || 0,
    }
  })

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const monthAbbr = getMonthAbbreviation(i + 1)
    const existing = chartData.find((d) => d.month === monthAbbr)
    return existing || { month: monthAbbr, revenue: 0, tickets: 0, signups: 0, transactionFees: 0, payout: 0, payoutCount: 0 }
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
          <StatCard label="Total Revenue" icon={Banknote} tone="purple" current={totalRevenue} previous={prevYearly.totalRevenue} kind="currency" />
          <StatCard label="Tickets Sold" icon={Ticket} tone="green" current={ticketsSold} previous={prevYearly.ticketsSold} kind="number" />
          <StatCard label="Users Signed Up" icon={Users} tone="blue" current={usersSignedUp} previous={prevYearly.usersSignedUp} kind="number" />
          <StatCard label="Total Fees" icon={Banknote} tone="amber" current={totalTransactionFees} previous={prevYearly.totalTransactionFees} kind="currency" />
          <StatCard label="Total Payout" icon={Banknote} tone="orange" current={payout} previous={prevYearly.payout} kind="currency" />
          <StatCard label="Payout Count" icon={Ticket} tone="cyan" current={payoutCount} previous={prevYearly.payoutCount} kind="number" />
        </StatGrid>

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
