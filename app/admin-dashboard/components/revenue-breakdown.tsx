"use client"

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { StatsData } from "./home-stats"

interface Props {
  stats: StatsData
}

const SLICES = [
  { key: "retained",        label: "Retained Revenue",  color: "#6b2fa5" },
  { key: "payout",          label: "Organiser Payouts", color: "#f97316" },
  { key: "transactionFees", label: "Transaction Fees",  color: "#f59e0b" },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
}

function pct(part: number, total: number) {
  if (!total) return "0%"
  return `${((part / total) * 100).toFixed(1)}%`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-800 mb-0.5">{name}</p>
      <p className="text-gray-600">{formatCurrency(value)}</p>
    </div>
  )
}


export function RevenueBreakdown({ stats }: Props) {
  const { totalRevenue, payout, totalTransactionFees } = stats.yearly
  const retained = Math.max(0, totalRevenue - payout - totalTransactionFees)

  const data = [
    { key: "retained",        name: "Retained Revenue",  value: retained },
    { key: "payout",          name: "Organiser Payouts", value: payout },
    { key: "transactionFees", name: "Transaction Fees",  value: totalTransactionFees },
  ].filter((d) => d.value > 0)

  const isEmpty = data.length === 0

  return (
    <Card>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-base md:text-lg font-semibold">{stats.year} Revenue Breakdown</CardTitle>
        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
          How total revenue of {formatCurrency(totalRevenue)} was distributed
        </p>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
        {isEmpty ? (
          <div className="flex items-center justify-center h-48 text-sm text-gray-400">
            No revenue data for {stats.year} yet.
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Pie */}
            <div className="w-full max-w-[220px] md:max-w-none md:w-[220px] shrink-0 h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                  >
                    {data.map((entry) => {
                      const slice = SLICES.find((s) => s.key === entry.key)
                      return <Cell key={entry.key} fill={slice?.color ?? "#94a3b8"} />
                    })}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Detail rows */}
            <div className="flex-1 w-full space-y-3">
              {data.map((entry) => {
                const slice = SLICES.find((s) => s.key === entry.key)!
                return (
                  <div key={entry.key} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="text-sm font-medium text-gray-700 truncate">{slice.label}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(entry.value)}</p>
                      <p className="text-[11px] text-gray-400">{pct(entry.value, totalRevenue)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}