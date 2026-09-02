/**
 * app/api/v1/payments/banks/route.ts
 *
 * GET → Nigerian bank list from Paystack, for the "Add payout method"
 * form on the Payments tab. Deliberate twin of
 * app/api/v1/admin/transfer/banks/route.ts, just open to every admin
 * role instead of full "admin" only — any team member may need to add
 * their own bank details here.
 *
 * Access: any registered admin role.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listBanks, PaystackError } from "@/lib/paystack-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  try {
    const banks = await listBanks()
    return ok({ banks })
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Failed to fetch banks from Paystack"
    return fail(message, 502)
  }
}
