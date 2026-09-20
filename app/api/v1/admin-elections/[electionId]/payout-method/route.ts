/**
 * app/api/v1/admin-elections/[electionId]/payout-method/route.ts
 * GET
 *
 * Election equivalent of admin-polls/payout-method/route.ts — see that
 * file for the full rationale. Same rule: admins can never set a payout
 * method, only use the one on file when the organizer has exactly one.
 * The owner here is the election's organizer_id (Supabase), not a
 * Firestore creatorId.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { getSinglePayoutMethod } from "@/lib/payout-firestore-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const { electionId } = await params

    const { data: election, error } = await supabaseAdmin.from("elections").select("organizer_id").eq("id", electionId).maybeSingle()
    if (error) throw new Error(error.message)
    if (!election) return NextResponse.json({ error: "Election not found", developer: DEV_TAG }, { status: 404 })

    const { methods, usable } = await getSinglePayoutMethod(election.organizer_id)
    return NextResponse.json({ success: true, ownerId: election.organizer_id, methods, usable, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/admin-elections/[electionId]/payout-method error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
