/**
 * app/api/v1/event-data/revert-payout/route.ts
 * POST { eventId, reference, reason }
 *
 * "Revert a transaction back to no status, ready for payout again" —
 * deletes the Supabase `payouts` row entirely (per spec), after:
 *   1. Archiving a full snapshot to `reverted_payouts` (never a silent
 *      delete of a financial record — see lib/payout-admin-db.ts).
 *   2. Clearing `payoutReference` off the Firestore date doc, so the
 *      Transactions view stops pointing at a row that no longer exists
 *      and the date is genuinely payable again.
 *   3. If the row was "successful", REVERSING the totalPaidOut/analytics
 *      increments that were applied when it resolved — otherwise the
 *      books would show money paid out that this action just undid the
 *      record of.
 *
 * A `reason` is mandatory — this is a destructive action on a financial
 * record, and "why" is the whole point of the audit trail.
 *
 * Same "admin" role restriction as admin-payout for the same reasoning:
 * this can erase evidence of an in-flight or completed transfer, and
 * that's a materially different trust level than moderation actions.
 *
 * Reverting a "processing" row deserves particular caution: Paystack may
 * already be moving money for that reference even though our system
 * hasn't received the resolving webhook yet. Deleting the row does NOT
 * stop a real transfer — it only stops OUR system from being able to
 * react to it later. The webhook handler fails safe if it arrives after
 * this (a no-op, since the row is gone — see spotix-backend/v1/payout.js),
 * but that means a transfer that actually succeeds at Paystack after
 * being reverted here would leave real money sent with no matching
 * record. The frontend surfaces a strong warning for this case; this
 * route still permits it, since blocking it outright would take away a
 * capability an admin may genuinely need (e.g. correcting a stuck row
 * they've already verified never actually reached Paystack) — but it's
 * on the admin to have checked Paystack's own transfer list first.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyFullAdmin } from "@/lib/verify-admin"
import { revertPayout } from "@/lib/payout-admin-db"
import { clearPayoutReferenceOnDateDoc, reverseSuccessfulPayoutAnalytics } from "@/lib/payout-firestore-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyFullAdmin(request)
    if ("error" in admin) return admin.error

    let body: { eventId?: string; reference?: string; reason?: string }
    try { body = await request.json() } catch { return fail("Invalid JSON", 400) }
    const { eventId, reference, reason } = body

    if (!eventId?.trim()) return fail("eventId is required", 400)
    if (!reference?.trim()) return fail("reference is required", 400)
    if (!reason?.trim() || reason.trim().length < 5) return fail("A reason (at least 5 characters) is required to revert a payout", 400)

    const { snapshot } = await revertPayout(reference, reason.trim(), admin.uid, admin.username)

    if (snapshot.event_id !== eventId) {
      // Defensive — shouldn't happen since the UI only ever offers revert
      // scoped to the event it's currently displaying, but a mismatched
      // eventId here would silently touch the wrong event's date doc.
      console.warn(`[revert-payout] reference ${reference} belongs to event ${snapshot.event_id}, not ${eventId}`)
    } else {
      await clearPayoutReferenceOnDateDoc({ eventId }, snapshot.pay_date)
    }

    if (snapshot.status === "successful") {
      await reverseSuccessfulPayoutAnalytics(snapshot)
    }

    return ok({
      message: `Payout ${reference} reverted. The date is available for a new payout request.`,
      previousStatus: snapshot.status,
      analyticsReversed: snapshot.status === "successful",
    })
  } catch (error) {
    console.error("POST /api/v1/event-data/revert-payout error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
