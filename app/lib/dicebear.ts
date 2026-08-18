/**
 * lib/dicebear.ts
 *
 * Points at spotix-backend's own self-hosted Dicebear endpoint
 * (v1/dicebear.js) — same avatar system already used elsewhere in the
 * Spotix ecosystem, not the public api.dicebear.com.
 *
 * Deterministic per seed (use the admin's uid, not username — a uid
 * never changes even if the admin later renames themselves, so their
 * avatar stays stable).
 */

export function getDicebearAvatarUrl(seed: string, size = 128): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  const safeSeed = encodeURIComponent(seed || "admin")
  if (!backendUrl) {
    // No backend configured — callers should already be falling back to
    // /TempUser.svg in this case via their own || chain; this return
    // value is never actually rendered when that's true, but keeping it
    // well-formed avoids an empty src attribute if it somehow is.
    return "/TempUser.svg"
  }
  return `${backendUrl}/v1/dicebear/${safeSeed}?style=avataaars&size=${size}`
}
