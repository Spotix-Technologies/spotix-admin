/**
 * app/api/v1/payments/route.ts
 *
 * GET → every disbursement-sourced payout the calling admin can see:
 *   - type "member" rows addressed to them personally
 *   - type "department" rows addressed to any department (role) they
 *     belong to — shown to the whole department regardless of whether
 *     it's still unclaimed or someone already withdrew it
 *
 * Backs the "Payments" tab on the Customer Support, Marketing, IT, and
 * Exec Assistant dashboards (see app/components/payments/payments-client.tsx),
 * as well as the "My Payments" panel on the full admin's Disbursements
 * page — any registered admin, of any role, can be a disbursement
 * recipient.
 *
 * Access: any registered admin role.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listPaymentsFor } from "@/lib/payments-db"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  const roles = Array.from(new Set([admin.role, ...admin.secondaryRoles].filter(Boolean)))
  const payments = await listPaymentsFor(admin.uid, roles)

  const withCanWithdraw = payments.map((p) => ({
    ...p,
    canWithdraw:
      (p.status === "unclaimed" || p.status === "failed") &&
      (p.recipient_admin_uid === admin.uid || (p.recipient_department != null && roles.includes(p.recipient_department))),
  }))

  return ok({ payments: withCanWithdraw })
}
