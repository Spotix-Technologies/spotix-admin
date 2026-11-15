/**
 * app/lib/redis-admin.ts
 *
 * Same Upstash Redis instance spotix-booker's app/lib/redis.ts and
 * spotix-vote's src/lib/redis.ts already share — added here ONLY so an
 * admin/customer-support category edit can bust the
 * `poll-categories:{pollId}` cache key immediately, instead of waiting
 * out the 1-hour safety-net TTL those apps fall back to. See
 * invalidateCategoryTreeCacheAfterAdminEdit() in
 * lib/poll-categories-admin.ts for the one place this gets called.
 *
 * Also used to bust spotix-user's `event:doc:{eventId}` cache (see that
 * app's lib/eventCache.ts) after an admin/customer-support/exec-assistant
 * "editEvent" save — see app/api/v1/event-data/route.ts.
 */

import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function categoryTreeCacheKey(pollId: string): string {
  return `poll-categories:${pollId}`
}

export function eventDocCacheKey(eventId: string): string {
  return `event:doc:${eventId}`
}

/**
 * Matches v1/lib/campaigns/packages.js's ACTIVE_PACKAGES_CACHE_KEY on the
 * backend exactly — same shared Upstash instance, same key. Busted here
 * so an admin pricing edit (app/api/v1/admin/global/email-credit-packages)
 * shows up immediately instead of waiting out the backend's hourly TTL.
 */
export function activePackagesCacheKey(): string {
  return "campaigns:active-packages"
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (err) {
    console.error(`[redis-admin] cacheDel failed for "${key}":`, err)
  }
}
