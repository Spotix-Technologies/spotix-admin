/**
 * app/api/v1/merch/[merchId]/orders/route.ts
 *
 * GET /api/v1/merch/:merchId/orders → { listing, orders } — the listing
 * plus every order placed against it, so the detail page can render its
 * header/stats and order table from a single request (same shape as
 * spotix-booker's /api/listings/[listingId]/orders route).
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getMerchListingById, listMerchOrdersForListing } from "@/lib/merch-db"

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

    const orders = await listMerchOrdersForListing(merchId)
    return ok({ listing, orders })
  } catch (err) {
    console.error("[GET /api/v1/merch/:merchId/orders]", err)
    return fail("Failed to load orders", 500)
  }
}
