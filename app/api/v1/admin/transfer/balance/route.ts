/**
 * app/api/v1/admin/transfer/balance/route.ts
 *
 * GET → current Paystack wallet balance(s).
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getWalletBalance, PaystackError } from "@/lib/paystack-admin"

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

  try {
    const balances = await getWalletBalance()
    return ok({ balances })
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Failed to fetch Paystack balance"
    return fail(message, 502)
  }
}
