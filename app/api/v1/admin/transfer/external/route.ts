/**
 * app/api/v1/admin/transfer/external/route.ts
 *
 * GET ?page=1 → { transfers }
 *
 * Withdrawals initiated directly on Paystack's own dashboard — not
 * through this admin panel. Surfaced alongside our own transfer list so
 * admins have full visibility into wallet outflow either way.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listExternalTransfers, PaystackError } from "@/lib/paystack-admin"

// This list is a live view onto Paystack's own transfer history and must
// never be served from a cached snapshot — see the `cache: "no-store"` note
// on backendFetch in @/lib/paystack-admin for why that matters here.
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const pageParam = new URL(request.url).searchParams.get("page")
  const page = Math.max(1, Number(pageParam) || 1)

  try {
    const { transfers } = await listExternalTransfers(page)
    return ok({ transfers })
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Failed to fetch Paystack transfer history"
    return fail(message, 502)
  }
}
