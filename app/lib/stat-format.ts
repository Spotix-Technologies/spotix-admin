/**
 * lib/stat-format.ts
 *
 * Shared number/currency formatting for the admin dashboard stat cards.
 * Previously copy-pasted into year-stats, month-stats and day-stats.
 */

const NGN_FULL = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const NGN_COMPACT = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  notation: "compact",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const PLAIN = new Intl.NumberFormat("en-NG")

/** Full precision, e.g. ₦2,603,745 */
export function formatCurrency(amount: number): string {
  return NGN_FULL.format(amount)
}

/** Compact, e.g. ₦2.6M — used when the full figure would overflow a card. */
export function formatCurrencyCompact(amount: number): string {
  return NGN_COMPACT.format(amount)
}

/**
 * Picks the display string for a stat card: full figure while it comfortably
 * fits (< ₦1,000,000), compact beyond that. The full figure is always
 * available separately for tooltips / accessibility.
 */
export function formatCurrencyFit(amount: number): string {
  return Math.abs(amount) >= 1_000_000 ? formatCurrencyCompact(amount) : formatCurrency(amount)
}

export function formatNumber(num: number): string {
  return PLAIN.format(num)
}

export function calculatePercentageChange(
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
