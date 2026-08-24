/**
 * app/api/v1/admin/transfer/resolve-account/route.ts
 *
 * POST { accountNumber, bankCode } →
 *   { accountName, totalSent, transferCount }
 *
 * Called by the Create Transfer form as soon as a 10-digit account
 * number and a bank are both selected — resolves the account name via
 * Paystack (through spotix-backend) and, if we've sent this exact
 * account successful transfers before, the running total so far.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { resolveAccount, PaystackError } from "@/lib/paystack-admin"
import { sumSuccessfulTransfersTo } from "@/lib/transfers-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function POST(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: Record<string, any>
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const accountNumber = String(body.accountNumber ?? "").trim()
  const bankCode = String(body.bankCode ?? "").trim()
  if (accountNumber.length !== 10) return fail("accountNumber must be 10 digits", 400)
  if (!bankCode) return fail("bankCode is required", 400)

  try {
    const [{ accountName }, history] = await Promise.all([
      resolveAccount(accountNumber, bankCode),
      sumSuccessfulTransfersTo(accountNumber, bankCode),
    ])
    return ok({ accountName, totalSent: history.totalSent, transferCount: history.transferCount })
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : "Could not resolve this account"
    return fail(message, 400)
  }
}
