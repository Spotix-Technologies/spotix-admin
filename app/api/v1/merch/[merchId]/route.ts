/**
 * app/api/v1/merch/[merchId]/route.ts
 *
 * GET /api/v1/merch/:merchId → { listing } — the single merch item that
 * backs the merch/{merchId} detail page. Not booker-scoped: any admin or
 * customer-support user can look up any listing (see lib/merch-db.ts).
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getMerchListingById } from "@/lib/merch-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

type Params = { params: Promise<{ merchId: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support"])
  if ("error" in admin) return admin.error

  const { merchId } = await params

  try {
    const listing = await getMerchListingById(merchId)
    if (!listing) return fail("Merch item not found", 404)
    return ok({ listing })
  } catch (err) {
    console.error("[GET /api/v1/merch/:merchId]", err)
    return fail("Failed to load merch item", 500)
  }
}
