/**
 * lib/campaign-backend.ts
 *
 * Same x-internal-secret convention spotix-booker's campaign routes use
 * (app/lib/campaign-backend.ts there) — new to spotix-admin specifically,
 * since nothing here called the backend internally before this. Callers
 * MUST run verifyAdminAccess() first; this file trusts the caller
 * completely and does no auth of its own.
 */

export async function callCampaignBackend(path: string, init?: RequestInit) {
  const backendUrl = process.env.BACKEND_URL
  const secret = process.env.CRON_SECRET
  if (!backendUrl || !secret) {
    throw new Error("Server configuration error: backend URL or internal secret missing")
  }
  const res = await fetch(`${backendUrl}/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  return { res, data }
}
