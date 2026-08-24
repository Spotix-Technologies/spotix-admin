/**
 * app/api/v1/admin/otta/revoke/route.ts
 *
 * POST { keyId } → revokes an unused OTTA key the calling admin owns.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { revokeOttaKey } from "@/lib/otta"

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

  const { keyId } = body
  if (!keyId?.trim()) return fail("keyId is required", 400)

  const result = await revokeOttaKey(admin.uid, keyId)
  if (!result.ok) return fail(result.error ?? "Failed to revoke key", 400)

  return ok({ message: "OTTA key revoked" })
}
