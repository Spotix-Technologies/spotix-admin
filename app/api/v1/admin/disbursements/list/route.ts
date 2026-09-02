/**
 * app/api/v1/admin/disbursements/list/route.ts
 *
 * GET ?page=1 → { disbursements, total, page, perPage, totalPages }  (10 per page)
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listDisbursements, listPayoutsForDisbursementIds } from "@/lib/disbursements-db"

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

  const { disbursements, total } = await listDisbursements(page, PER_PAGE)

  // Attach each disbursement's actual payout status (successful/failed/
  // etc per recipient) — DisbursementRow.status alone only reflects the
  // approval workflow and freezes at "approved" once payout rows exist.
  const payoutsByDisbursement = await listPayoutsForDisbursementIds(disbursements.map((d) => d.id))
  const withPayouts = disbursements.map((d) => ({ ...d, payouts: payoutsByDisbursement[d.id] ?? [] }))

  return ok({ disbursements: withPayouts, total, page, perPage: PER_PAGE, totalPages: Math.max(1, Math.ceil(total / PER_PAGE)) })
}
