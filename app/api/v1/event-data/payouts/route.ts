/**
 * app/api/v1/event-data/payouts/route.ts
 * GET ?eventId=...
 *
 * Every payout attempt ever filed for this event — now reading the
 * Supabase `payouts` table (the old Firestore `payouts` collection this
 * route used to query no longer exists; see /supabase/payout-schema.sql
 * and the booker payout rewrite). Includes admin_initiated fields so the
 * UI can badge admin-settled payouts distinctly from booker/Paystack
 * ones — see the `adminInitiated` note in the response shape below.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getPayoutsForEvent } from "@/lib/payout-admin-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")?.trim()
    if (!eventId) return NextResponse.json({ error: "eventId is required", developer: DEV_TAG }, { status: 400 })

    const rows = await getPayoutsForEvent(eventId)
    const payouts = rows.map((r) => ({
      reference: r.reference,
      eventId: r.event_id,
      userId: r.user_id,
      date: r.pay_date,
      amount: r.amount,
      bankName: r.bank_name,
      bankCode: r.bank_code,
      accountNumber: r.account_number,
      accountName: r.account_name,
      status: r.status,
      failureReason: r.failure_reason,
      narration: r.narration,
      vaultLocked: r.vault_locked,
      // Absent/false on every booker-initiated row (nothing here changed
      // for those — old rows and new booker rows alike simply don't carry
      // this field set to true). The frontend should interpret a
      // false/undefined adminInitiated as "initiated by the booker/owner
      // themselves," same as it always has, and only special-case the UI
      // when adminInitiated is explicitly true.
      adminInitiated: r.admin_initiated === true,
      adminInitiatedByName: r.admin_initiated_by_name ?? null,
      durationSeconds: r.duration_seconds,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
    }))

    return NextResponse.json({ success: true, payouts, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/event-data/payouts error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
