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
 */

import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function categoryTreeCacheKey(pollId: string): string {
  return `poll-categories:${pollId}`
}
