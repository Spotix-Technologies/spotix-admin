"use client"

import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { calculatePercentageChange, formatCurrency, formatCurrencyFit, formatNumber } from "@/lib/stat-format"

export type StatTone = "purple" | "green" | "blue" | "amber" | "orange" | "cyan"

const TONES: Record<StatTone, { box: string; label: string; value: string; sub: string }> = {
  purple: { box: "bg-purple-50 border-purple-100", label: "text-purple-600", value: "text-purple-900", sub: "text-purple-600/70" },
  green: { box: "bg-green-50 border-green-100", label: "text-green-600", value: "text-green-900", sub: "text-green-600/70" },
  blue: { box: "bg-blue-50 border-blue-100", label: "text-blue-600", value: "text-blue-900", sub: "text-blue-600/70" },
  amber: { box: "bg-amber-50 border-amber-100", label: "text-amber-600", value: "text-amber-900", sub: "text-amber-600/70" },
  orange: { box: "bg-orange-50 border-orange-100", label: "text-orange-600", value: "text-orange-900", sub: "text-orange-600/70" },
  cyan: { box: "bg-cyan-50 border-cyan-100", label: "text-cyan-600", value: "text-cyan-900", sub: "text-cyan-600/70" },
}

export function PercentageIndicator({ current, previous }: { current: number; previous: number }) {
  const { value, trend } = calculatePercentageChange(current, previous)

  if (trend === "neutral") {
    return (
      <div className="flex items-center gap-1 text-gray-500 whitespace-nowrap">
        <Minus className="w-3 h-3" />
        <span className="text-xs">0%</span>
      </div>
    )
  }

  const isUp = trend === "up"
  return (
    <div className={`flex items-center gap-1 whitespace-nowrap ${isUp ? "text-green-600" : "text-red-600"}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="text-xs font-medium">{value.toFixed(1)}%</span>
    </div>
  )
}

interface StatCardProps {
  label: string
  icon: LucideIcon
  tone: StatTone
  current: number
  previous: number
  /** "currency" values switch to a compact form (₦2.6M) once they'd overflow. */
  kind: "currency" | "number"
  /** Text for the "vs …" line, e.g. "yesterday" is not needed — we just show the previous value. */
  size?: "md" | "lg"
}

/**
 * One dashboard stat tile. Never truncates the figure: large naira amounts
 * are shown compact (₦2.6M) with the exact amount in the hover title, so a
 * number is never silently cut off with an ellipsis.
 */
export function StatCard({ label, icon: Icon, tone, current, previous, kind, size = "md" }: StatCardProps) {
  const t = TONES[tone]
  const show = (n: number) => (kind === "currency" ? formatCurrencyFit(n) : formatNumber(n))
  const exact = (n: number) => (kind === "currency" ? formatCurrency(n) : formatNumber(n))
  const valueSize = size === "lg" ? "text-base md:text-lg" : "text-lg md:text-xl"

  return (
    <div className={`min-w-0 p-3 md:p-4 rounded-lg border ${t.box}`}>
      <div className="flex items-center gap-1 md:gap-2 mb-1">
        <Icon className={`w-3 h-3 md:w-4 md:h-4 shrink-0 ${t.label}`} />
        <span className={`text-[10px] md:text-xs font-medium leading-tight ${t.label}`}>{label}</span>
      </div>
      <div className="mb-1 md:mb-2">
        <PercentageIndicator current={current} previous={previous} />
      </div>
      <p className={`${valueSize} font-bold leading-tight whitespace-nowrap ${t.value}`} title={exact(current)}>
        {show(current)}
      </p>
      <p className={`text-[10px] md:text-xs mt-0.5 md:mt-1 whitespace-nowrap ${t.sub}`} title={exact(previous)}>
        vs {show(previous)}
      </p>
    </div>
  )
}

/** Responsive grid shared by year/month/day stat rows. */
export function StatGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-4 2xl:grid-cols-6 ${className}`}>{children}</div>
}
