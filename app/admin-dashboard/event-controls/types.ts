export type ControlKind = "featured" | "themed"

/** One entry of `featuredEvents` / `themedEvents`, as the admin UI sees it. */
export interface ControlEvent {
  /** Firestore doc id inside the collection. */
  id: string
  kind: ControlKind
  eventId: string
  eventName: string
  imageURL: string
  eventType: string
  venue: string
  /** Same string the user app renders (copied from `events.eventDate`). */
  eventStartDate: string
  /** Historical naming: `true` means PAID, `false` means FREE. */
  freeOrPaid: boolean
  creatorID: string
  bookerName: string
  /** Themed entries only. */
  theme: string | null
  addedAt: string | null
  addedBy: string | null
  /** Among the newest N for its kind AND has eventId + creatorID, i.e. visible on the user app. */
  live: boolean
  /** Missing eventId/creatorID — the user app silently skips it. */
  invalid: boolean
}

export interface ControlsPayload {
  featured: ControlEvent[]
  themed: ControlEvent[]
  limits: Record<ControlKind, number>
  /** Distinct themes already in use, for quick re-use when adding. */
  themes: string[]
}
