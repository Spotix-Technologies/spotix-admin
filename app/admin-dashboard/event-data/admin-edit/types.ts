export interface TicketTier {
  policy: string
  price: string | number
  description?: string
  availableTickets?: string | number
  /** Legacy alias some records still use instead of availableTickets. */
  availability?: string | number
  ticketsSold?: number
}

export interface EventLike {
  id: string
  eventName: string
  eventDescription: string
  eventDate: string
  eventEndDate: string
  eventStart: string
  eventEnd: string
  eventVenue: string
  eventType: string
  isFree: boolean
  hasStopDate?: boolean
  stopDate?: string | null
  ticketPrices: TicketTier[]
}

export interface DiscountData {
  id: string
  code: string
  type: "percentage" | "flat"
  value: number
  maxUses: number
  usedCount: number
  active: boolean
  /** Ticket policy names this coupon can be applied to. null/empty = all tickets. */
  applicableTickets?: string[] | null
  /** ISO date string. null = never expires. */
  expiryDate?: string | null
}

export interface DiscountDraft {
  code: string
  type: "percentage" | "flat"
  value: number | ""
  maxUses: number | ""
  expiryDate: string
  applicableTickets: string[]
}

export const emptyDiscountDraft: DiscountDraft = {
  code: "",
  type: "percentage",
  value: "",
  maxUses: 1,
  expiryDate: "",
  applicableTickets: [],
}
