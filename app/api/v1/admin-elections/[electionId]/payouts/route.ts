/**
 * app/api/v1/admin-elections/[electionId]/payouts/route.ts
 *
 * Election equivalent of admin-polls' payouts actions (see
 * admin-polls/route.ts's "transactions"/"payouts" branches) plus its
 * admin-payout/route.ts POST — combined into one file since elections
 * get their own nested [electionId] folder already (unlike polls,
 * which are flat query-param routes).
 *
 * GET  ?action=transactions (default) → daily form-fee totals (Firestore)
 * GET  ?action=payouts                → payout history (Supabase)
 * POST                                → admin-initiated payout for a date
 *      (bypasses Paystack entirely, inserts an already-"successful" row
 *      — see lib/payout-admin-db.ts's createAdminInitiatedPayout)
 *
 * Refuses (403) when the election is suspended — same rule spotix-booker's
 * own payout route enforces for organiser-initiated payouts; an admin
 * shouldn't be able to bypass a suspension they just as easily lifted.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess, verifyFullAdmin } from "@/lib/verify-admin"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { adminDb } from "@/lib/firebase-admin"
import { listElectionTransactions, writePayoutReferenceOnDateDoc, getSinglePayoutMethod, applySuccessfulPayoutAnalytics } from "@/lib/payout-firestore-admin"
import { getPayoutsForElection, createAdminInitiatedPayout, hasActiveOrSuccessfulPayout } from "@/lib/payout-admin-db"
import { claimIdempotencyKey, DuplicateRequestError } from "@/lib/payout-idempotency"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const { electionId } = await params
    const action = request.nextUrl.searchParams.get("action") ?? "transactions"

    if (action === "payouts") {
      const rows = await getPayoutsForElection(electionId)
      const payouts = rows
        .map((r) => ({
          reference: r.reference,
          electionId: r.election_id,
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
          adminInitiated: r.admin_initiated === true,
          adminInitiatedByName: r.admin_initiated_by_name ?? null,
          durationSeconds: r.duration_seconds,
          createdAt: r.created_at,
          resolvedAt: r.resolved_at,
        }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      return ok({ data: payouts })
    }

    const transactions = await listElectionTransactions(electionId)
    return ok({ data: transactions })
  } catch (error) {
    console.error("GET /api/v1/admin-elections/[electionId]/payouts error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  try {
    const admin = await verifyFullAdmin(request)
    if ("error" in admin) return admin.error

    const { electionId } = await params

    const idempotencyKey = request.headers.get("idempotency-key")
    if (!idempotencyKey?.trim()) return fail("Idempotency-Key header is required", 400)
    try {
      await claimIdempotencyKey(idempotencyKey, admin.uid)
    } catch (err) {
      if (err instanceof DuplicateRequestError) return fail(err.message, 409)
      return fail("Could not verify request uniqueness. Please try again.", 500)
    }

    let body: { date?: string }
    try {
      body = await request.json()
    } catch {
      return fail("Invalid JSON", 400)
    }
    const { date } = body
    if (!date?.trim()) return fail("date is required", 400)

    const { data: election, error: electionErr } = await supabaseAdmin
      .from("elections")
      .select("id, name, organizer_id, suspended")
      .eq("id", electionId)
      .maybeSingle()
    if (electionErr) throw new Error(electionErr.message)
    if (!election) return fail("Election not found", 404)
    if (election.suspended) return fail("This election is suspended — unsuspend it before paying out.", 403)

    const dateDoc = await adminDb.collection("admin").doc("elections").collection(electionId).doc(date).get()
    if (!dateDoc.exists) return fail("Transaction date record not found", 404)
    const amount = dateDoc.data()?.totalAmount
    if (typeof amount !== "number" || amount <= 0) return fail("This date has no positive totalAmount to pay out", 400)

    const alreadyActive = await hasActiveOrSuccessfulPayout({ electionId }, date)
    if (alreadyActive) return fail("A payout for this date already exists (active or successful).", 409)

    const { usable: method, methods } = await getSinglePayoutMethod(election.organizer_id)
    if (!method) {
      return fail(
        methods.length === 0
          ? "This organizer has no payout method on file. Admins cannot create one — they must add it themselves."
          : `This organizer has ${methods.length} payout methods on file. Admin-initiated payout is only available when exactly one method exists.`,
        400,
      )
    }

    let row
    try {
      row = await createAdminInitiatedPayout({
        isEvent: false,
        isPoll: false,
        isElection: true,
        electionId,
        electionName: election.name ?? "",
        payDate: date,
        beneficiaryUserId: election.organizer_id,
        amount,
        method: {
          methodId: method.id,
          bankName: method.bankName,
          bankCode: method.bankCode,
          accountNumber: method.accountNumber,
          accountName: method.accountName,
          recipientCode: method.recipientCode,
        },
        vaultLocked: false,
        adminUid: admin.uid,
        adminName: admin.username,
      })
    } catch (err: any) {
      if (err instanceof DuplicateRequestError) return fail(err.message, 409)
      throw err
    }

    await writePayoutReferenceOnDateDoc({ electionId }, date, row.reference)
    await applySuccessfulPayoutAnalytics(row)

    return ok({ message: "Payout recorded successfully", reference: row.reference })
  } catch (error) {
    console.error("POST /api/v1/admin-elections/[electionId]/payouts error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
