/**
 * app/lib/poll-categories-admin.ts
 *
 * Admin-side mirror of spotix-booker's app/lib/poll-categories.ts — reads
 * and writes the SAME voting/{pollId}/categories subcollection, so a
 * category edited here shows up in the booker app and vice versa. See
 * that file for the full design rationale (why a subcollection instead of
 * a nested array field on the poll doc).
 *
 * This version intentionally does NOT touch the Redis cache spotix-booker
 * maintains on top of this subcollection — that cache is invalidated on
 * every credited vote from spotix-backend and on every booker-side save.
 * An admin/customer-support edit here should show up on the booker's next
 * cache refresh (≤ 1 hour, same safety-net TTL) even without us reaching
 * into spotix-booker's Redis instance from this codebase.
 */

import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { redis, categoryTreeCacheKey } from "@/lib/redis-admin"

export interface CategoryDoc {
  categoryId: string
  name: string
  pollPrice: number
  parentId: string | null
  depth: number
  path: string[]
  hasChildren: boolean
  contestants: any[]
}

export function flattenCategoryTree(
  nodes: any[],
  parentId: string | null = null,
  parentPath: string[] = [],
): CategoryDoc[] {
  const out: CategoryDoc[] = []
  for (const node of nodes) {
    const hasChildren = Array.isArray(node.subcategories) && node.subcategories.length > 0
    const name = String(node.name ?? "").trim()
    out.push({
      categoryId: node.categoryId,
      name,
      pollPrice: Number(node.pollPrice ?? 0),
      parentId,
      depth: parentPath.length,
      path: parentPath,
      hasChildren,
      contestants: hasChildren ? [] : (node.contestants ?? []),
    })
    if (hasChildren) {
      out.push(...flattenCategoryTree(node.subcategories, node.categoryId, [...parentPath, name]))
    }
  }
  return out
}

export function buildCategoryTree(docs: CategoryDoc[]): any[] {
  const byParent = new Map<string | null, CategoryDoc[]>()
  for (const d of docs) {
    const list = byParent.get(d.parentId) ?? []
    list.push(d)
    byParent.set(d.parentId, list)
  }

  function build(parentId: string | null): any[] {
    return (byParent.get(parentId) ?? []).map((d) => ({
      categoryId: d.categoryId,
      name: d.name,
      pollPrice: d.pollPrice,
      contestants: d.contestants ?? [],
      subcategories: build(d.categoryId),
    }))
  }

  return build(null)
}

export function countTreeContestants(tree: any[]): number {
  let total = 0
  for (const node of tree ?? []) {
    const subs = node.subcategories ?? []
    if (subs.length > 0) total += countTreeContestants(subs)
    else total += Array.isArray(node.contestants) ? node.contestants.length : 0
  }
  return total
}

export async function fetchAdminCategoryTree(pollId: string, legacyCategories: any[] = []): Promise<any[]> {
  const snap = await adminDb.collection("voting").doc(pollId).collection("categories").get()
  if (snap.empty) return legacyCategories
  const docs = snap.docs.map((d) => d.data() as CategoryDoc)
  return buildCategoryTree(docs)
}

/**
 * Finds every categoryId in the LIVE tree whose leaf contestants carry
 * votes but are missing from `incomingIds` — used to block an admin from
 * silently deleting a category/contestant that already has votes cast,
 * same rule spotix-booker enforces on the booker-side edit flow.
 */
export function findVotedRemoval(existingTree: any[], incomingIds: Set<string>): string | null {
  for (const cat of existingTree) {
    const subs = cat.subcategories ?? []
    if (subs.length > 0) {
      const err = findVotedRemoval(subs, incomingIds)
      if (err) return err
    } else {
      for (const c of cat.contestants ?? []) {
        if ((c.votes ?? 0) > 0 && !incomingIds.has(c.contestantId)) {
          return `Contestant "${c.name}" in "${cat.name}" has votes and cannot be removed`
        }
      }
    }
    if (!incomingIds.has(cat.categoryId)) {
      const hasVotes = subs.length > 0
        ? countTreeContestants(subs) > 0 && subs.some((s: any) => (s.contestants ?? []).some((c: any) => (c.votes ?? 0) > 0))
        : (cat.contestants ?? []).some((c: any) => (c.votes ?? 0) > 0)
      if (hasVotes) return `Category "${cat.name}" has votes and cannot be deleted`
    }
  }
  return null
}

export function collectAllCategoryIds(tree: any[], ids: Set<string> = new Set()): Set<string> {
  for (const cat of tree) {
    ids.add(cat.categoryId)
    if (Array.isArray(cat.subcategories)) collectAllCategoryIds(cat.subcategories, ids)
  }
  return ids
}

/** Preserves vote counts on contestants that already existed, by contestantId. */
export function mergeVoteCounts(incomingTree: any[], existingMap: Map<string, any>): any[] {
  return incomingTree.map((cat) => {
    const subs = cat.subcategories ?? []
    if (subs.length > 0) {
      return { ...cat, contestants: [], subcategories: mergeVoteCounts(subs, existingMap) }
    }
    const existingCat = existingMap.get(cat.categoryId)
    const existingContMap = new Map<string, any>(
      (existingCat?.contestants ?? []).map((c: any): [string, any] => [c.contestantId, c]),
    )
    return {
      ...cat,
      subcategories: [],
      contestants: (cat.contestants ?? []).map((c: any) => ({
        ...c,
        votes: existingContMap.get(c.contestantId)?.votes ?? c.votes ?? 0,
      })),
    }
  })
}

export function flattenTreeToMap(tree: any[]): Map<string, any> {
  const map = new Map<string, any>()
  function walk(nodes: any[]) {
    for (const n of nodes) {
      map.set(n.categoryId, n)
      if (Array.isArray(n.subcategories)) walk(n.subcategories)
    }
  }
  walk(tree)
  return map
}

export async function writeAdminCategoryTree(pollId: string, tree: any[]): Promise<void> {
  const pollRef = adminDb.collection("voting").doc(pollId)
  const catsRef = pollRef.collection("categories")

  const incoming = flattenCategoryTree(tree)
  const incomingIds = new Set(incoming.map((c) => c.categoryId))

  const existingSnap = await catsRef.get()
  const existingIds = new Set(existingSnap.docs.map((d) => d.id))

  const batch = adminDb.batch()
  const now = FieldValue.serverTimestamp()

  for (const node of incoming) {
    const payload: Record<string, any> = { ...node, updatedAt: now }
    if (!existingIds.has(node.categoryId)) payload.createdAt = now
    batch.set(catsRef.doc(node.categoryId), payload, { merge: true })
  }
  for (const id of existingIds) {
    if (!incomingIds.has(id)) batch.delete(catsRef.doc(id))
  }

  batch.update(pollRef, {
    categories: FieldValue.delete(),
    contestantTotal: countTreeContestants(tree),
    updatedAt: now,
  })

  await batch.commit()

  // Bust the Redis cache spotix-booker (and spotix-vote) read this poll's
  // category tree through — without this, an admin's edit is correct in
  // Firestore immediately but the booker app keeps serving the stale
  // cached tree for up to its 1-hour safety-net TTL. This makes the
  // booker-side change genuinely instant instead. Non-fatal if it fails
  // (e.g. Redis briefly unavailable) — the 1-hour TTL still eventually
  // catches up, so we don't fail the whole save over it.
  try {
    await redis.del(categoryTreeCacheKey(pollId))
  } catch (err) {
    console.error(`[poll-categories-admin] Failed to invalidate cache for ${pollId}:`, err)
  }
}
