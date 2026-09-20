/**
 * app/api/v1/admin-elections/[electionId]/suspend/route.ts
 * PATCH { suspended: boolean, reason?: string }
 *
 * Spotix-level kill switch for one election — see
 * lib/election-settings.ts's suspendElection/unsuspendElection for what
 * this actually touches and who sees the effect (candidates/voters in
 * spotix-vote, the organiser's banner in spotix-booker, and the
 * withdrawal block in spotix-booker's payout route).
 *
 * Full "admin" only, same as the fee settings route — customer-support
 * gets read-only visibility via /api/v1/support-elections, not this.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyFullAdmin } from "@/lib/verify-admin"
import { suspendElection, unsuspendElection } from "@/lib/election-settings"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  try {
    const admin = await verifyFullAdmin(request)
    if ("error" in admin) return admin.error

    const { electionId } = await params

    let body: { suspended?: boolean; reason?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON", developer: DEV_TAG }, { status: 400 })
    }
    if (typeof body.suspended !== "boolean") {
      return NextResponse.json({ error: "suspended (boolean) is required", developer: DEV_TAG }, { status: 400 })
    }

    if (body.suspended) {
      await suspendElection(electionId, body.reason ?? null, admin.uid, admin.username)
    } else {
      await unsuspendElection(electionId)
    }

    return NextResponse.json(
      { success: true, message: body.suspended ? "Election suspended" : "Election unsuspended", developer: DEV_TAG },
      { status: 200 },
    )
  } catch (error) {
    console.error("PATCH /api/v1/admin-elections/[electionId]/suspend error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
