/**
 * app/api/v1/admin/transfer/list/route.ts
 *
 * GET ?page=1 → { transfers, total, page, perPage }  (10 per page)
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listTransfers } from "@/lib/transfers-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const PER_PAGE = 10

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

  const { transfers, total } = await listTransfers(page, PER_PAGE)
  return ok({ transfers, total, page, perPage: PER_PAGE, totalPages: Math.max(1, Math.ceil(total / PER_PAGE)) })
}
