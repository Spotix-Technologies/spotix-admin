/**
 * app/api/v1/admin-polls/revert-payout/route.ts
 * POST { pollId, reference, reason }
 *
 * Poll equivalent of event-data/revert-payout/route.ts — see that file
 * for the full rationale (mandatory reason, archive-before-delete,
 * analytics reversal for a "successful" row, "processing" caveat).
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

    let body: { pollId?: string; reference?: string; reason?: string }
    try { body = await request.json() } catch { return fail("Invalid JSON", 400) }
    const { pollId, reference, reason } = body

    if (!pollId?.trim()) return fail("pollId is required", 400)
    if (!reference?.trim()) return fail("reference is required", 400)
    if (!reason?.trim() || reason.trim().length < 5) return fail("A reason (at least 5 characters) is required to revert a payout", 400)

    const { snapshot } = await revertPayout(reference, reason.trim(), admin.uid, admin.username)

    if (snapshot.poll_id !== pollId) {
      console.warn(`[revert-payout] reference ${reference} belongs to poll ${snapshot.poll_id}, not ${pollId}`)
    } else {
      await clearPayoutReferenceOnDateDoc({ pollId }, snapshot.pay_date)
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
    console.error("POST /api/v1/admin-polls/revert-payout error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 }
    )
  }
}
