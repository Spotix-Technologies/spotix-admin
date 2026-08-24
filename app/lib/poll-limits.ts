/**
 * app/lib/poll-limits.ts
 *
 * Mirrors the platform-default structure-limit constants in
 * spotix-booker's app/lib/poll-config.ts (separate repo/deploy, so the
 * numbers are duplicated here — keep the two in sync by hand if either
 * changes) and adds the admin-side read/write helpers for the
 * per-poll `limitsOverride` field that spotix-booker's
 * resolvePollLimits() also reads.
 *
 * Only a full "admin" can WRITE an override (see the route's role check);
 * customer-support has read-only access via its own separate route.
 */

import { adminDb } from "@/lib/firebase-admin"

// ── Platform defaults (must match spotix-booker/app/lib/poll-config.ts) ──────

export const MAX_SINGLE_CONTESTANTS = 50
export const MAX_GROUP_TOP_CATEGORIES = 50
export const MAX_GROUP_TOTAL_SUBCATEGORIES = 150
export const MAX_CONTESTANTS_PER_CATEGORY = 35

export interface PollLimitsOverride {
  maxSingleContestants?: number | null
  maxGroupTopCategories?: number | null
  maxGroupTotalSubcategories?: number | null
  maxContestantsPerCategory?: number | null
}

export interface ResolvedPollLimits {
  maxSingleContestants: number
  maxGroupTopCategories: number
  maxGroupTotalSubcategories: number
  maxContestantsPerCategory: number
}

export function resolvePollLimits(override?: PollLimitsOverride | null): ResolvedPollLimits {
  const pick = (v: number | null | undefined, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback

  return {
    maxSingleContestants:       pick(override?.maxSingleContestants,       MAX_SINGLE_CONTESTANTS),
    maxGroupTopCategories:      pick(override?.maxGroupTopCategories,      MAX_GROUP_TOP_CATEGORIES),
    maxGroupTotalSubcategories: pick(override?.maxGroupTotalSubcategories, MAX_GROUP_TOTAL_SUBCATEGORIES),
    maxContestantsPerCategory:  pick(override?.maxContestantsPerCategory,  MAX_CONTESTANTS_PER_CATEGORY),
  }
}

/** Reads a poll's raw `limitsOverride` field + the resolved effective limits. */
export async function getPollLimits(pollId: string): Promise<{
  override: PollLimitsOverride | null
  resolved: ResolvedPollLimits
  defaults: ResolvedPollLimits
} | null> {
  const snap = await adminDb.collection("voting").doc(pollId).get()
  if (!snap.exists) return null
  const d = snap.data()!
  const override: PollLimitsOverride | null = d.limitsOverride ?? null
  return {
    override,
    resolved: resolvePollLimits(override),
    defaults: resolvePollLimits(null),
  }
}

/**
 * Writes (or clears) a poll's limitsOverride field. Passing `null`/`undefined`
 * for a given field clears just that override, falling back to the platform
 * default again.
 */
export async function setPollLimits(pollId: string, override: PollLimitsOverride): Promise<void> {
  const clean: Record<string, number | FirebaseFirestore.FieldValue> = {}
  const { FieldValue } = await import("firebase-admin/firestore")

  for (const key of [
    "maxSingleContestants",
    "maxGroupTopCategories",
    "maxGroupTotalSubcategories",
    "maxContestantsPerCategory",
  ] as const) {
    const v = override[key]
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      clean[`limitsOverride.${key}`] = Math.floor(v)
    } else if (v === null) {
      clean[`limitsOverride.${key}`] = FieldValue.delete()
    }
  }

  if (Object.keys(clean).length === 0) return
  await adminDb.collection("voting").doc(pollId).update({
    ...clean,
    updatedAt: new Date().toISOString(),
  })
}
