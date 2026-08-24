/**
 * GET  /api/v1/admin-polls?action=listRecent
 *   Returns the 10 most recently created polls (voting collection).
 *
 * GET  /api/v1/admin-polls?action=search&term=xxx
 *   Suggestions by exact pollId or pollName prefix (5+ chars), live polls only.
 *
 * GET  /api/v1/admin-polls?pollId=xxx
 *   Looks up a poll by ID (checks the live "voting" collection first, then
 *   the "deletedPolls" archive so a soft-deleted poll can still be reviewed
 *   and restored). Any registered admin role may look up a poll.
 *
 * GET  /api/v1/admin-polls?pollId=xxx&action=payouts
 *   Returns every payout ever filed for this poll (any user), newest
 *   first — reads the Supabase `payouts` table (see
 *   /supabase/payout-schema.sql), not Firestore.
 *
 * GET  /api/v1/admin-polls?pollId=xxx&action=transactions
 *   Every per-day vote transaction record for this poll
 *   (admin/votes/{pollId} in Firestore) — mirrors the booker's own
 *   GET /api/polls/payout?action=list.
 *
 * POST /api/v1/admin-polls   { pollId, action }
 *   action: "flag" | "unflag" | "suspend" | "unsuspend" | "delete" | "restore"
 *   Any registered admin role may perform these actions.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getPayoutsForPoll } from "@/lib/payout-admin-db"
import { listPollTransactions } from "@/lib/payout-firestore-admin"

const DEV = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV }, { status })
}

interface LeaderboardEntry {
  name: string
  votes: number
  image?: string
  categoryName?: string
}

/**
 * Recursively sum votes across a flat contestants[] (single polls) or a
 * categories[] tree (group polls). For group polls, every entry is tagged
 * with the name of the category (or "Parent > Child" for nested
 * subcategories) it was pulled from.
 */
function computeStats(poll: Record<string, any>) {
  let totalVotes = 0
  const leaderboard: LeaderboardEntry[] = []

  function walk(contestants: any[] = [], categoryName?: string) {
    for (const c of contestants) {
      totalVotes += c.votes ?? 0
      leaderboard.push({ name: c.name, votes: c.votes ?? 0, image: c.image, categoryName })
    }
  }

  function walkCategories(cats: any[] = [], parentPath?: string) {
    for (const cat of cats) {
      const path = parentPath ? `${parentPath} > ${cat.name}` : cat.name
      if (Array.isArray(cat.contestants) && cat.contestants.length > 0) walk(cat.contestants, path)
      if (Array.isArray(cat.subcategories) && cat.subcategories.length > 0) walkCategories(cat.subcategories, path)
    }
  }

  if (poll.pollType === "group") walkCategories(poll.categories ?? [])
  else walk(poll.contestants ?? [])

  leaderboard.sort((a, b) => b.votes - a.votes)
  return { totalVotes, leaderboard }
}

function summarizePoll(id: string, d: Record<string, any>) {
  return {
    pollId: id,
    pollName: d.pollName || "Untitled",
    pollImage: d.pollImage || "",
    pollType: d.pollType || "single",
    status: d.status || "active",
    createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
  }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const pollId = searchParams.get("pollId")?.trim()

  /* RECENT POLLS */
  if (action === "listRecent") {
    const snap = await adminDb
      .collection("voting")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get()

    const results = snap.docs.map((doc) => summarizePoll(doc.id, doc.data()))
    return ok({ data: results })
  }

  /* SEARCH SUGGESTIONS */
  if (action === "search") {
    const term = searchParams.get("term")?.trim()
    if (!term || term.length < 5) return ok({ data: [] })

    const results: ReturnType<typeof summarizePoll>[] = []

    // Exact pollId lookup
    const byId = await adminDb.collection("voting").doc(term).get()
    if (byId.exists) results.push(summarizePoll(byId.id, byId.data()!))

    // pollName prefix query
    const nameSnap = await adminDb
      .collection("voting")
      .orderBy("pollName")
      .startAt(term)
      .endAt(term + "\uf8ff")
      .limit(8)
      .get()

    for (const doc of nameSnap.docs) {
      if (results.find((r) => r.pollId === doc.id)) continue
      results.push(summarizePoll(doc.id, doc.data()))
    }

    return ok({ data: results.slice(0, 8) })
  }

  if (!pollId) return fail("pollId is required", 400)

  /* TRANSACTIONS (per-day vote records) */
  if (action === "transactions") {
    const transactions = await listPollTransactions(pollId)
    return ok({ data: transactions })
  }

  /* PAYOUT HISTORY — Supabase-backed */
  if (action === "payouts") {
    const rows = await getPayoutsForPoll(pollId)
    const payouts = rows
      .map((r) => ({
        reference: r.reference,
        pollId: r.poll_id,
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
        // See event-side payouts route for the backward-compat contract
        // on this field — absent/false means booker-initiated, as always.
        adminInitiated: r.admin_initiated === true,
        adminInitiatedByName: r.admin_initiated_by_name ?? null,
        durationSeconds: r.duration_seconds,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      }))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))

    return ok({ data: payouts })
  }

  /* SINGLE POLL LOOKUP */
  const liveSnap = await adminDb.collection("voting").doc(pollId).get()
  if (liveSnap.exists) {
    const poll = liveSnap.data()!
    return ok({ pollId, poll, deleted: false, stats: computeStats(poll) })
  }

  const deletedSnap = await adminDb.collection("deletedPolls").doc(pollId).get()
  if (deletedSnap.exists) {
    const poll = deletedSnap.data()!
    return ok({ pollId, poll, deleted: true, stats: computeStats(poll) })
  }

  return fail("Poll not found", 404)
}

const VALID_ACTIONS = ["flag", "unflag", "suspend", "unsuspend", "delete", "restore"] as const
type Action = (typeof VALID_ACTIONS)[number]

export async function POST(request: NextRequest) {
  // flag/unflag/suspend/unsuspend/delete/restore all change a poll's
  // account-facing stats/visibility — restricted to full admins only.
  // customer-support and exec-assistant keep read access via GET above.
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: { pollId?: string; action?: string }
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { pollId, action } = body
  if (!pollId) return fail("pollId is required", 400)
  if (!action || !VALID_ACTIONS.includes(action as Action)) {
    return fail(`action must be one of: ${VALID_ACTIONS.join(", ")}`, 400)
  }

  const liveRef = adminDb.collection("voting").doc(pollId)
  const deletedRef = adminDb.collection("deletedPolls").doc(pollId)

  if (action === "delete") {
    const snap = await liveRef.get()
    if (!snap.exists) return fail("Poll not found", 404)

    // Soft delete: copy to deletedPolls, then remove the live doc, so it can
    // be restored later.
    await deletedRef.set({
      ...snap.data(),
      deletedAt: new Date().toISOString(),
      deletedBy: admin.username,
      deletedByUid: admin.uid,
    })
    await liveRef.delete()
    return ok({ message: "Poll soft-deleted" })
  }

  if (action === "restore") {
    const snap = await deletedRef.get()
    if (!snap.exists) return fail("This poll is not in the deleted archive", 404)

    const { deletedAt, deletedBy, deletedByUid, ...pollData } = snap.data()!
    await liveRef.set({
      ...pollData,
      restoredAt: new Date().toISOString(),
      restoredBy: admin.username,
    })
    await deletedRef.delete()
    return ok({ message: "Poll restored" })
  }

  // flag / unflag / suspend / unsuspend all act on the live doc
  const snap = await liveRef.get()
  if (!snap.exists) return fail("Poll not found (it may be soft-deleted — restore it first)", 404)

  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (action === "flag") updates.flagged = true
  if (action === "unflag") updates.flagged = false
  if (action === "suspend") { updates.suspended = true; updates.status = "suspended" }
  if (action === "unsuspend") { updates.suspended = false; updates.status = "active" }

  await liveRef.update(updates)
  return ok({ message: `Poll ${action}d successfully` })
}
