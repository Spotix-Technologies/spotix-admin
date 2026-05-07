/**
 * app/api/v1/documents/[docId]/files/route.ts
 *
 * POST   /api/v1/documents/[docId]/files
 *   Body { fileName, fileUrl, fileType, fileSize, storagePath }
 *   → Registers an uploaded file in Firestore under documents/{docId}/files
 *
 * DELETE /api/v1/documents/[docId]/files?fileId=xxx
 *   → Removes a file record from Firestore (storage deletion handled client-side)
 *
 * PATCH  /api/v1/documents/[docId]/status   (REQ only)
 *   Body { status: "Raised"|"Accepted"|"Failed" }
 *   → Updates the status field on the document
 *
 * Access: exec-assistant only
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

// POST — register uploaded file
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await verifyAdminAccess(req, ["exec-assistant"])
  if ("error" in auth) return auth.error

  const { docId } = await params
  const docRef = adminDb.collection("documents").doc(docId)
  const snap = await docRef.get()
  if (!snap.exists) return fail("Document not found", 404)

  let body: { fileName?: string; fileUrl?: string; fileType?: string; fileSize?: number; storagePath?: string }
  try { body = await req.json() } catch { return fail("Invalid JSON", 400) }

  const { fileName, fileUrl, fileType, fileSize, storagePath } = body
  if (!fileName || !fileUrl || !fileType || !storagePath) {
    return fail("fileName, fileUrl, fileType, and storagePath are required", 400)
  }

  const fileData = {
    fileName,
    fileUrl,
    fileType,
    fileSize: fileSize ?? 0,
    storagePath,
    uploadedBy: auth.uid,
    uploadedByUsername: auth.username,
    uploadedAt: FieldValue.serverTimestamp(),
  }

  const fileRef = await docRef.collection("files").add(fileData)

  // Increment fileCount on parent doc
  await docRef.update({ fileCount: FieldValue.increment(1) })

  return ok({ file: { id: fileRef.id, ...fileData, uploadedAt: new Date().toISOString() } }, 201)
}

// DELETE — remove file record
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await verifyAdminAccess(req, ["exec-assistant"])
  if ("error" in auth) return auth.error

  const { docId } = await params
  const { searchParams } = new URL(req.url)
  const fileId = searchParams.get("fileId")
  if (!fileId) return fail("fileId is required", 400)

  const docRef = adminDb.collection("documents").doc(docId)
  const fileRef = docRef.collection("files").doc(fileId)
  const fileSnap = await fileRef.get()
  if (!fileSnap.exists) return fail("File not found", 404)

  await fileRef.delete()
  await docRef.update({ fileCount: FieldValue.increment(-1) })

  return ok({ message: "File deleted", storagePath: fileSnap.data()?.storagePath })
}
