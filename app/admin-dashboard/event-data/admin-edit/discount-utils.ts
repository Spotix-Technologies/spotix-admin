export function isExpired(expiryDate?: string | null): boolean {
  if (!expiryDate) return false
  const t = new Date(expiryDate).getTime()
  return Number.isFinite(t) && t < Date.now()
}

// ─── Discount value rules ───────────────────────────────────────────────────
// Mirrors spotix-booker's discounts-tab (itself mirroring the server-side
// check in /api/event/list/[eventId]) so an admin can't create/edit a coupon
// into a state the booker-side checkout would reject. Percentage discounts
// are capped at 90%. Flat discounts are capped at 90% of the highest-priced
// ticket tier the coupon applies to (or the event's highest tier overall
// when it isn't scoped to specific tickets).
export function getMaxApplicablePrice(
  ticketPrices: { policy: string; price: number }[],
  applicableTickets: string[] | null | undefined,
): number {
  const relevant =
    applicableTickets && applicableTickets.length > 0
      ? ticketPrices.filter((t) => applicableTickets.includes(t.policy))
      : ticketPrices
  return relevant.reduce((max, t) => Math.max(max, Number(t.price) || 0), 0)
}

export function validateDiscountValue(
  type: "percentage" | "flat",
  value: number | "",
  ticketPrices: { policy: string; price: number }[],
  applicableTickets: string[] | null | undefined,
): string | null {
  if (value === "" || value === null || value === undefined) {
    return "Please enter a discount value."
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Discount value must be a number greater than 0."
  }

  if (type === "percentage") {
    if (numeric > 90) return "Percentage discounts can't exceed 90%."
    return null
  }

  const maxPrice = getMaxApplicablePrice(ticketPrices, applicableTickets)
  if (maxPrice <= 0) return "This event has no priced ticket tiers to discount."
  if (numeric > maxPrice) {
    return `There's no ticket listed that costs that much — the highest applicable ticket is ₦${maxPrice.toLocaleString()}.`
  }
  const cap = maxPrice * 0.9
  if (numeric > cap) {
    return `You can't give away more than 90% of your highest applicable ticket price (₦${cap.toLocaleString()}).`
  }
  return null
}
