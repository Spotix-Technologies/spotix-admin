/**
 * app/api/v1/admin/requisitions/list/route.ts
 *
 * GET ?page=1 → { requisitions, total, page, perPage, totalPages }  (10 per page)
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listRequisitions } from "@/lib/requisitions-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const PER_PAGE = 10

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const pageParam = new URL(request.url).searchParams.get("page")
  const page = Math.max(1, Number(pageParam) || 1)

  const { requisitions, total } = await listRequisitions(page, PER_PAGE)
  return ok({ requisitions, total, page, perPage: PER_PAGE, totalPages: Math.max(1, Math.ceil(total / PER_PAGE)) })
}
