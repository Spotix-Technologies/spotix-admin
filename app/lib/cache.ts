/**
 * Client-side cache utility with TTL support
 * Used for caching API responses to reduce server load and improve UX
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // in seconds
}

const CACHE_STORAGE_KEY = "spotix_admin_cache"

/**
 * Get all cached items
 */
function getCacheStorage(): Record<string, CacheEntry<any>> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save cache to localStorage
 */
function saveCacheStorage(cache: Record<string, CacheEntry<any>>): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Silently fail if storage is full or unavailable
  }
}

/**
 * Get cached data if not expired
 */
export function getCache<T>(key: string): T | null {
  const cache = getCacheStorage()
  const entry = cache[key]

  if (!entry) return null

  const ageInSeconds = (Date.now() - entry.timestamp) / 1000
  if (ageInSeconds > entry.ttl) {
    // Remove expired entry
    delete cache[key]
    saveCacheStorage(cache)
    return null
  }

  return entry.data
}

/**
 * Set cache with TTL
 */
export function setCache<T>(key: string, data: T, ttlSeconds: number = 300): void {
  const cache = getCacheStorage()
  cache[key] = {
    data,
    timestamp: Date.now(),
    ttl: ttlSeconds,
  }
  saveCacheStorage(cache)
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  const cache = getCacheStorage()
  delete cache[key]
  saveCacheStorage(cache)
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CACHE_STORAGE_KEY)
  } catch {
    // Silently fail
  }
}

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  // Users
  USER_SEARCH: (query: string) => `user_search_${query}`,
  USER_DETAILS: (email: string) => `user_details_${email}`,
  
  // User data
  USER_PAYOUTS: (email: string) => `user_payouts_${email}`,
  USER_TICKETS: (email: string) => `user_tickets_${email}`,
  USER_SESSIONS: (email: string) => `user_sessions_${email}`,
}
