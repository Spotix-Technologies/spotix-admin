/**
 * GET  /api/v1/admin-polls?pollId=xxx
 *   Looks up a poll by ID (checks the live "voting" collection first, then
 *   the "deletedPolls" archive so a soft-deleted poll can still be reviewed
 *   and restored). Any registered admin role may look up a poll.
 *
 * POST /api/v1/admin-polls   { pollId, action }
 *   action: "flag" | "unflag" | "suspend" | "unsuspend" | "delete" | "restore"
 *   Any registered admin role may perform these actions.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

const DEV = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV }, { status })
}

/** Recursively sum votes across a flat contestants[] or a categories[] tree. */
function computeStats(poll: Record<string, any>) {
  let totalVotes = 0
  let leaderboard: { name: string; votes: number; image?: string }[] = []

  function walk(contestants: any[] = []) {
    for (const c of contestants) {
      totalVotes += c.votes ?? 0
      leaderboard.push({ name: c.name, votes: c.votes ?? 0, image: c.image })
    }
  }

  function walkCategories(cats: any[] = []) {
    for (const cat of cats) {
      if (Array.isArray(cat.contestants) && cat.contestants.length > 0) walk(cat.contestants)
      if (Array.isArray(cat.subcategories) && cat.subcategories.length > 0) walkCategories(cat.subcategories)
    }
  }

  if (poll.pollType === "group") walkCategories(poll.categories ?? [])
  else walk(poll.contestants ?? [])

  leaderboard.sort((a, b) => b.votes - a.votes)
  return { totalVotes, leaderboard }
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request)
  if ("error" in admin) return admin.error

  const { searchParams } = new URL(request.url)
  const pollId = searchParams.get("pollId")?.trim()
  if (!pollId) return fail("pollId is required", 400)

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
  const admin = await verifyAdminAccess(request)
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
