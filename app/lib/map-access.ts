/**
 * app/lib/map-access.ts
 *
 * Reads/writes users/{userId}/settings/mapAccess — the same document
 * spotix-booker's lib/maps/limits.ts reads when picking a map provider
 * for that organizer's map-picker session. Both apps share one Firebase
 * project, so writing it here takes effect on the booker side immediately.
 *
 * Deliberately independent of spotix-booker's copy (separate deployable
 * app) rather than importing across repos — kept intentionally tiny so
 * the two stay easy to keep in sync by eye.
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export const MAP_PROVIDERS = ["google", "mapbox", "geoapify"] as const
export type MapProvider = (typeof MAP_PROVIDERS)[number]

export interface ProviderOverride {
  /** true = force on, false = force off, undefined = inherit env default */
  enabled?: boolean
  /** overrides the env daily-call cap for just this user; undefined = inherit env default */
  dailyLimit?: number
}

export type MapAccessOverrides = Partial<Record<MapProvider, ProviderOverride>>

function mapAccessDoc(userId: string) {
  return adminDb.collection("users").doc(userId).collection("settings").doc("mapAccess")
}

export async function getMapAccessOverrides(userId: string): Promise<MapAccessOverrides> {
  const snap = await mapAccessDoc(userId).get()
  if (!snap.exists) return {}
  const data = snap.data() ?? {}
  const overrides: MapAccessOverrides = {}
  for (const provider of MAP_PROVIDERS) {
    if (data[provider]) overrides[provider] = data[provider]
  }
  return overrides
}

export async function setMapAccessOverrides(
  userId: string,
  overrides: MapAccessOverrides,
  updatedBy: string
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp(), updatedBy }
  for (const provider of MAP_PROVIDERS) {
    const override = overrides[provider]
    // Store an explicit null (rather than omitting) so a value the admin
    // clears actually clears in Firestore instead of leaving a stale one.
    payload[provider] = override && (override.enabled !== undefined || override.dailyLimit !== undefined)
      ? {
          enabled: override.enabled ?? null,
          dailyLimit: override.dailyLimit ?? null,
        }
      : null
  }
  await mapAccessDoc(userId).set(payload, { merge: true })
}
