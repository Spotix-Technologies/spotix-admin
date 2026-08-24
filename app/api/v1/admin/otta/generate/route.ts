/**
 * app/api/v1/admin/otta/generate/route.ts
 *
 * POST { maxAmount, durationMinutes } → { id, plainKey, expiresAt }
 *
 * plainKey is returned exactly once — it is never retrievable again (only
 * a bcrypt hash is stored, see lib/otta.ts). The generating admin is
 * responsible for sending it to whichever other admin they want to
 * authorize.
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { generateOttaKey } from "@/lib/otta"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const MAX_DURATION_MINUTES = 120

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

  const maxAmount = Number(body.maxAmount)
  const durationMinutes = Number(body.durationMinutes)

  if (!Number.isFinite(maxAmount) || maxAmount <= 0) return fail("maxAmount must be a positive number", 400)
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return fail("durationMinutes must be a positive number", 400)
  if (durationMinutes > MAX_DURATION_MINUTES) return fail(`An OTTA key can last at most ${MAX_DURATION_MINUTES} minutes`, 400)

  const key = await generateOttaKey({ ownerUid: admin.uid, ownerName: admin.username, maxAmount, durationMinutes })

  return ok({
    message: "OTTA key generated. Copy it now — it will not be shown again.",
    id: key.id,
    plainKey: key.plainKey,
    expiresAt: key.expiresAt,
  }, 201)
}
