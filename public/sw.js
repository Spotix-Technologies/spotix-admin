// public/sw.js
//
// Spotix Admin service worker.
// Caches the static app shell (JS/CSS/fonts/icons + the offline fallback page)
// so the app installs cleanly and reloads faster. Deliberately does NOT cache
// anything under /api/ or any non-GET request, since dashboard data must
// always come fresh from the network.

const CACHE_VERSION = "v1"
const SHELL_CACHE = `spotix-admin-shell-${CACHE_VERSION}`

const PRECACHE_URLS = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/logo-cropped.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("spotix-admin-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

function isApiRequest(url) {
  return url.pathname.startsWith("/api/")
}

function isStaticAsset(request, url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    ["style", "script", "font", "image"].includes(request.destination)
  )
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests. Everything else (API calls, POSTs,
  // third-party requests) passes straight through to the network untouched.
  if (request.method !== "GET" || url.origin !== self.location.origin) return
  if (isApiRequest(url)) return

  // App navigations: network-first, falling back to cache, then an offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () => caches.match(request).then((cached) => cached || caches.match("/offline.html"))
      )
    )
    return
  }

  // Static shell assets: cache-first, refreshing the cache in the background.
  if (isStaticAsset(request, url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              caches.open(SHELL_CACHE).then((cache) => cache.put(request, response.clone()))
            }
            return response
          })
          .catch(() => cached)
        return cached || fetchPromise
      })
    )
  }
})
