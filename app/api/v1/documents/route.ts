/**
 * app/api/v1/documents/route.ts
 *
 * GET  /api/v1/documents?docId=SPTX-REQ-20260507-01
 *   → Returns document metadata + file list
 *
 * GET  /api/v1/documents?type=REQ&dateFrom=20260501&dateTo=20260507
 *   → Time-series search: returns docs grouped by date
 *
 * GET  /api/v1/documents?type=REQ&date=20260507&index=01
 *   → Single doc lookup by type + date + index (index defaults to 01)
 *
 * GET  /api/v1/documents?name=Binge%20Xperience
 *   → Name search: case-insensitive prefix match on the document's name
 *
 * POST /api/v1/documents
 *   Body { docType: "REQ"|"MEM"|"MIN"|"DOC", name?: string }
 *   → Creates a new document with auto-generated reference ID.
 *     `name` is required for docType "DOC" so it can be searched later.
 *
 * DELETE /api/v1/documents?docId=SPTX-REQ-20260507-01
 *   → Deletes an entire document (metadata only — caller deletes files from storage)
 *
 * Access:
 *   - POST/DELETE: exec-assistant only (only they can create/remove documents)
 *   - GET: any registered admin role (search/view only)
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { FieldValue } from "firebase-admin/firestore"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status })
}
function fail(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status })
}

type DocType = "REQ" | "MEM" | "MIN" | "DOC"

/** Returns today as YYYYMMDD in UTC+1 (WAT) */
function todayStamp(): string {
  const now = new Date()
  // Offset to WAT (UTC+1)
  const wat = new Date(now.getTime() + 60 * 60 * 1000)
  const y = wat.getUTCFullYear()
  const m = String(wat.getUTCMonth() + 1).padStart(2, "0")
  const d = String(wat.getUTCDate()).padStart(2, "0")
  return `${y}${m}${d}`
}

/** Converts YYYYMMDD string to a JS Date at midnight UTC */
function stampToDate(stamp: string): Date {
  const y = Number(stamp.slice(0, 4))
  const m = Number(stamp.slice(4, 6)) - 1
  const d = Number(stamp.slice(6, 8))
  return new Date(Date.UTC(y, m, d))
}

/** Next index (01, 02, …) for a given docType + dateStamp */
async function nextIndex(docType: DocType, dateStamp: string): Promise<string> {
  const prefix = `SPTX-${docType}-${dateStamp}-`
  const snap = await adminDb
    .collection("documents")
    .where("__name__", ">=", prefix)
    .where("__name__", "<", `${prefix}\uFFFF`)
    .get()
  return String(snap.size + 1).padStart(2, "0")
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Any registered admin role may search/view documents. Only exec-assistant
  // can create or upload (enforced in POST/DELETE and the files sub-route).
  const auth = await verifyAdminAccess(req)
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const docId = searchParams.get("docId")

  // Direct lookup by full docId
  if (docId) {
    const snap = await adminDb.collection("documents").doc(docId).get()
    if (!snap.exists) return fail("Document not found", 404)
    const filesSnap = await adminDb
      .collection("documents")
      .doc(docId)
      .collection("files")
      .orderBy("uploadedAt", "asc")
      .get()
    const files = filesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return ok({ document: { id: snap.id, ...snap.data() }, files })
  }

  const type = searchParams.get("type") as DocType | null
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const date = searchParams.get("date")
  const index = searchParams.get("index") ?? "01"
  const name = searchParams.get("name")?.trim()

  // Search by document name (all admin roles — case-insensitive prefix match)
  if (name) {
    const nameLower = name.toLowerCase()
    let query = adminDb
      .collection("documents")
      .where("docNameLower", ">=", nameLower)
      .where("docNameLower", "<", `${nameLower}\uf8ff`)
      .limit(20)
    if (type) query = query.where("docType", "==", type) as typeof query
    const snap = await query.get()
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return ok({ results })
  }

  // Single doc lookup: type + date [+ index]
  if (type && date && !dateFrom && !dateTo) {
    const paddedIndex = String(Number(index)).padStart(2, "0")
    const id = `SPTX-${type}-${date}-${paddedIndex}`
    const snap = await adminDb.collection("documents").doc(id).get()
    if (!snap.exists) return fail("Document not found", 404)
    const filesSnap = await adminDb
      .collection("documents")
      .doc(id)
      .collection("files")
      .orderBy("uploadedAt", "asc")
      .get()
    const files = filesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    return ok({ document: { id: snap.id, ...snap.data() }, files })
  }

  // Time-series lookup: type + dateFrom + dateTo
  if (type && dateFrom && dateTo) {
    const today = todayStamp()
    // Clamp end date to today
    const effectiveTo = dateTo > today ? today : dateTo

    const fromDate = stampToDate(dateFrom)
    const toDate = stampToDate(effectiveTo)
    // Add 1 day to toDate to make range inclusive
    toDate.setUTCDate(toDate.getUTCDate() + 1)

    // Query by prefix range on document ID
    const prefix = `SPTX-${type}-`
    const snap = await adminDb
      .collection("documents")
      .where("__name__", ">=", `${prefix}${dateFrom < effectiveTo ? dateFrom : effectiveTo}`)
      .where("__name__", "<=", `${prefix}${dateFrom > effectiveTo ? dateFrom : effectiveTo}-99`)
      .get()

    // Group results by dateStamp
    const grouped: Record<string, Array<{ id: string; [k: string]: unknown }>> = {}
    for (const d of snap.docs) {
      // Parse date from id: SPTX-REQ-20260507-01
      const parts = d.id.split("-")
      const ds = parts[2] ?? ""
      if (!grouped[ds]) grouped[ds] = []
      grouped[ds].push({ id: d.id, ...d.data() })
    }

    // Sort dates
    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStamp, docs]) => ({ dateStamp, docs }))

    return ok({ results: result, total: snap.size })
  }

  return fail("Invalid query parameters", 400)
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await verifyAdminAccess(req, ["exec-assistant"])
  if ("error" in auth) return auth.error

  let body: { docType?: string; name?: string }
  try { body = await req.json() } catch { return fail("Invalid JSON", 400) }

  const { docType, name } = body
  if (!docType || !["REQ", "MEM", "MIN", "DOC"].includes(docType)) {
    return fail("docType must be one of: REQ, MEM, MIN, DOC", 400)
  }
  if (docType === "DOC" && !name?.trim()) {
    return fail("A name is required for 'Other' documents so it can be searched later", 400)
  }

  const dt = docType as DocType
  const stamp = todayStamp()
  const idx = await nextIndex(dt, stamp)
  const docId = `SPTX-${dt}-${stamp}-${idx}`

  const docData: Record<string, unknown> = {
    docType: dt,
    reference: docId,
    dateStamp: stamp,
    index: idx,
    docName: name?.trim() || null,
    docNameLower: name?.trim() ? name.trim().toLowerCase() : null,
    createdBy: auth.uid,
    createdByUsername: auth.username,
    createdAt: FieldValue.serverTimestamp(),
    fileCount: 0,
    ...(dt === "REQ" ? { status: "Raised" } : {}),
  }

  await adminDb.collection("documents").doc(docId).set(docData)
  return ok({ document: { id: docId, ...docData, createdAt: new Date().toISOString() } }, 201)
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await verifyAdminAccess(req, ["exec-assistant"])
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(req.url)
  const docId = searchParams.get("docId")
  if (!docId) return fail("docId is required", 400)

  const docRef = adminDb.collection("documents").doc(docId)
  const snap = await docRef.get()
  if (!snap.exists) return fail("Document not found", 404)

  // Delete all files subcollection docs
  const filesSnap = await docRef.collection("files").get()
  const batch = adminDb.batch()
  for (const f of filesSnap.docs) batch.delete(f.ref)
  batch.delete(docRef)
  await batch.commit()

  return ok({ message: "Document deleted" })
}
