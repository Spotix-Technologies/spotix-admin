/**
 * app/api/v1/admin-elections/[electionId]/candidates/route.ts
 * GET → every candidate across every office in this election.
 *
 * Read-only — mirrors app/lib/election-db.ts's listCandidatesForElection
 * on the booker side, but scoped to admin's own Supabase client and
 * available to any verified admin identity (not just full "admin" role)
 * since this is view-only, same bar as the settings GET.
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listCandidatesForAdmin } from "@/lib/election-settings"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest, { params }: { params: Promise<{ electionId: string }> }) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const { electionId } = await params
    const candidates = await listCandidatesForAdmin(electionId)
    return NextResponse.json({ success: true, candidates, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/admin-elections/[electionId]/candidates error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
