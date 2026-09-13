// api/v1/users/[email]/merch/route.ts
//
// GET ?userId=<uid> → { listings: [{ id, productName, images, status, price }] }
//
// Lists merch this user has listed (merch_listings where booker_id ==
// uid), for the Users admin page's "Created Content" tab. Reuses
// listMerchListingsByBooker() from lib/merch-db.ts — the same helper
// file behind the existing /admin-dashboard/merch section.

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listMerchListingsByBooker } from "@/lib/merch-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    await params // consume params (unused — lookup is userId-scoped)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required", listings: [] },
        { status: 400 }
      )
    }

    const listings = await listMerchListingsByBooker(userId)
    return NextResponse.json({ listings })
  } catch (error) {
    console.error("[v0] User merch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch merch listings", listings: [] },
      { status: 500 }
    )
  }
}
