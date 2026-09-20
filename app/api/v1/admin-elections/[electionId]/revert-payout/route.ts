/**
 * app/api/v1/admin-elections/[electionId]/revert-payout/route.ts
 * POST { reference, reason }
 *
 * Election equivalent of admin-polls/revert-payout/route.ts — see that
 * file for the full rationale (mandatory reason, archive-before-delete,
 * analytics reversal for a "successful" row).
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyFullAdmin } from "@/lib/verify-admin"
import { revertPayout } from "@/lib/payout-admin-db"
import { clearPayoutReferenceOnDateDoc, reverseSuccessfulPayoutAnalytics } from "@/lib/payout-firestore-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  try {
    const admin = await verifyFullAdmin(request)
    if ("error" in admin) return admin.error

    const { electionId } = await params

    let body: { reference?: string; reason?: string }
    try {
      body = await request.json()
    } catch {
      return fail("Invalid JSON", 400)
    }
    const { reference, reason } = body

    if (!reference?.trim()) return fail("reference is required", 400)
    if (!reason?.trim() || reason.trim().length < 5) return fail("A reason (at least 5 characters) is required to revert a payout", 400)

    const { snapshot } = await revertPayout(reference, reason.trim(), admin.uid, admin.username)

    if (snapshot.election_id !== electionId) {
      console.warn(`[revert-payout] reference ${reference} belongs to election ${snapshot.election_id}, not ${electionId}`)
    } else {
      await clearPayoutReferenceOnDateDoc({ electionId }, snapshot.pay_date)
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
    console.error("POST /api/v1/admin-elections/[electionId]/revert-payout error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
