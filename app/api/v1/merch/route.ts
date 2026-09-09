/**
 * app/api/v1/merch/route.ts
 *
 * GET ?page=1 → { listings, total, page, perPage, totalPages }  (15 per page)
 *
 * Shared by admin-dashboard/merch and customer-support-dashboard/merch —
 * same route, same data, just gated to both roles (mirrors how
 * /api/v1/event-data is one route serving several dashboards). Read-only:
 * listings are created/edited by bookers in spotix-booker, not here.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listAllMerchListings } from "@/lib/merch-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const PER_PAGE = 15

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const pageParam = new URL(request.url).searchParams.get("page")
  const page = Math.max(1, Number(pageParam) || 1)

  try {
    const { listings, total } = await listAllMerchListings(page, PER_PAGE)
    return ok({ listings, total, page, perPage: PER_PAGE, totalPages: Math.max(1, Math.ceil(total / PER_PAGE)) })
  } catch (err) {
    console.error("[GET /api/v1/merch]", err)
    return fail("Failed to load merch listings", 500)
  }
}
