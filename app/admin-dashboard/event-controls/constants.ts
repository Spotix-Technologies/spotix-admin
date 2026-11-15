import type { ControlKind } from "./types"

/**
 * How many entries the Spotix user app actually reads per collection:
 *   - featured → src/app/home/constants.ts FEATURED_LIMIT (+ landing Events.tsx)
 *   - themed   → src/components/landing/Events.tsx limit(8)
 * Both queries order by `addedAt` desc, so only the newest N are visible.
 * Keep in sync with the user app.
 */
export const CONTROL_LIMITS: Record<ControlKind, number> = {
  featured: 5,
  themed: 8,
}

/** Firestore collection each kind is stored in (read client-side by the user app). */
export const CONTROL_COLLECTIONS: Record<ControlKind, string> = {
  featured: "featuredEvents",
  themed: "themedEvents",
}

export const KIND_LABEL: Record<ControlKind, string> = {
  featured: "Featured events",
  themed: "Themed events",
}

export const KIND_BLURB: Record<ControlKind, string> = {
  featured: "Hero carousel on the landing page and the banner at the top of the home page.",
  themed: "Themed grid on the landing page, each card tagged with its theme.",
}

export const DEFAULT_THEME = "Featured"
export const MAX_THEME_LENGTH = 30
/** Max docs the admin list pulls per collection (well above the live limits). */
export const ADMIN_LIST_LIMIT = 50
