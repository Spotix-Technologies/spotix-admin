// api/v1/users/[email]/polls/route.ts
//
// GET ?userId=<uid> → { voting: [...], nominations: [...], elections: [...] }
//
// Every way a booker can build a poll on Spotix, scoped to one user, for
// the Users admin page's "Created Content" tab (Polls sub-tabs). Three
// independent data sources, matching spotix-booker's own poll-creation
// surfaces:
//   - voting      → Firestore voting/{pollId}, organizerId == uid
//                    (single/group polls — app/polls/create/page.tsx)
//   - nominations → Supabase nomination_polls, creator_id == uid
//                    (app/polls/create/nomination/page.tsx)
//   - elections   → Supabase elections, organizer_id == uid
//                    (app/elections/page.tsx)
// Each source is fetched independently and a failure in one doesn't
// block the other two — the client shows an error only for the
// sub-tab that actually failed.

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { listNominationPollsByCreator } from "@/lib/nomination-db"
import { listElectionsByOrganizer } from "@/lib/election-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    await params // consume params (unused — lookup is userId-scoped)

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required", voting: [], nominations: [], elections: [] },
        { status: 400 }
      )
    }

    const [votingResult, nominationsResult, electionsResult] = await Promise.allSettled([
      // Requires a Firestore composite index on (organizerId ASC, createdAt DESC)
      // on the voting collection — Firestore will surface a console link to
      // create it the first time this query runs if it doesn't exist yet.
      adminDb
        .collection("voting")
        .where("organizerId", "==", userId)
        .orderBy("createdAt", "desc")
        .get(),
      listNominationPollsByCreator(userId),
      listElectionsByOrganizer(userId),
    ])

    const voting =
      votingResult.status === "fulfilled"
        ? votingResult.value.docs.map((doc) => {
            const d = doc.data()
            return {
              pollId: doc.id,
              pollName: d.pollName || "Untitled",
              pollImage: d.pollImage || "",
              pollType: d.pollType === "group" ? "group" : "single",
              status: d.status || "active",
            }
          })
        : []
    const votingError = votingResult.status === "rejected" ? "Failed to load voting polls" : null

    const nominations = nominationsResult.status === "fulfilled" ? nominationsResult.value : []
    const nominationsError =
      nominationsResult.status === "rejected" ? "Failed to load nomination polls" : null

    const elections = electionsResult.status === "fulfilled" ? electionsResult.value : []
    const electionsError = electionsResult.status === "rejected" ? "Failed to load elections" : null

    if (votingResult.status === "rejected") console.error("[v0] User voting polls error:", votingResult.reason)
    if (nominationsResult.status === "rejected") console.error("[v0] User nomination polls error:", nominationsResult.reason)
    if (electionsResult.status === "rejected") console.error("[v0] User elections error:", electionsResult.reason)

    return NextResponse.json({
      voting,
      votingError,
      nominations,
      nominationsError,
      elections,
      electionsError,
    })
  } catch (error) {
    console.error("[v0] User polls error:", error)
    return NextResponse.json(
      { error: "Failed to fetch polls", voting: [], nominations: [], elections: [] },
      { status: 500 }
    )
  }
}
