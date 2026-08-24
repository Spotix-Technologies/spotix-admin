/**
 * app/api/v1/support-polls/categories/route.ts
 *
 * GET ?pollId=xxx → { pollName, pollType, categories: <tree> }
 * PUT { pollId, categories: <tree> }
 *
 * Customer-support's own counterpart to /api/v1/admin-polls/categories —
 * deliberately a separate route/file (not a shared one with a wider role
 * list) so the admin and customer-support surfaces can be locked down and
 * evolve independently, even though the two currently do the same thing.
 * Unlike limits, category editing is allowed for BOTH admin and
 * customer-support per product decision — see the votes-limits panel.
 *
 * Access: "customer-support" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import {
  fetchAdminCategoryTree,
  writeAdminCategoryTree,
  findVotedRemoval,
  collectAllCategoryIds,
  flattenTreeToMap,
  mergeVoteCounts,
} from "@/lib/poll-categories-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["customer-support"])
  if ("error" in auth) return auth.error

  const pollId = new URL(request.url).searchParams.get("pollId")?.trim()
  if (!pollId) return fail("pollId is required", 400)

  const pollSnap = await adminDb.collection("voting").doc(pollId).get()
  if (!pollSnap.exists) return fail("Poll not found", 404)
  const poll = pollSnap.data()!

  if (poll.pollType !== "group") return fail("Only group polls have a category tree", 400)

  const categories = await fetchAdminCategoryTree(pollId, poll.categories ?? [])
  return ok({ pollName: poll.pollName ?? "", pollType: poll.pollType, categories })
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["customer-support"])
  if ("error" in auth) return auth.error

  let body: { pollId?: string; categories?: any[] }
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { pollId, categories } = body
  if (!pollId?.trim()) return fail("pollId is required", 400)
  if (!Array.isArray(categories)) return fail("categories must be an array", 400)

  const pollRef = adminDb.collection("voting").doc(pollId)
  const pollSnap = await pollRef.get()
  if (!pollSnap.exists) return fail("Poll not found", 404)
  const poll = pollSnap.data()!
  if (poll.pollType !== "group") return fail("Only group polls have a category tree", 400)

  const existingTree = await fetchAdminCategoryTree(pollId, poll.categories ?? [])
  const existingMap = flattenTreeToMap(existingTree)

  for (const [i, cat] of categories.entries()) {
    if (!cat.categoryId?.trim()) return fail(`Category ${i + 1}: categoryId is required`, 400)
    if (!cat.name?.trim()) return fail(`Category ${i + 1}: name is required`, 400)
  }

  const incomingIds = collectAllCategoryIds(categories)
  const votedRemovalError = findVotedRemoval(existingTree, incomingIds)
  if (votedRemovalError) return fail(votedRemovalError, 409)

  const merged = mergeVoteCounts(categories, existingMap)
  await writeAdminCategoryTree(pollId, merged)

  return ok({ message: "Categories updated", categories: merged })
}

export async function POST() { return fail("Method Not Allowed", 405) }
export async function DELETE() { return fail("Method Not Allowed", 405) }
