/**
 * app/api/v1/documents/[docId]/status/route.ts
 *
 * PATCH /api/v1/documents/[docId]/status
 *   Body { status: "Raised" | "Accepted" | "Failed" }
 *   → Updates status on a REQ document. Forbidden for non-REQ types.
 *
 * Access: exec-assistant only
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

function ok(data: object) {
  return NextResponse.json({ success: true, ...data })
}
function fail(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const auth = await verifyAdminAccess(req, ["exec-assistant"])
  if ("error" in auth) return auth.error

  const { docId } = await params
  const docRef = adminDb.collection("documents").doc(docId)
  const snap = await docRef.get()
  if (!snap.exists) return fail("Document not found", 404)

  const data = snap.data()!
  if (data.docType !== "REQ") {
    return fail("Status can only be changed on Requisition (REQ) documents", 400)
  }

  let body: { status?: string }
  try { body = await req.json() } catch { return fail("Invalid JSON", 400) }

  const { status } = body
  if (!status || !["Raised", "Accepted", "Failed"].includes(status)) {
    return fail("status must be one of: Raised, Accepted, Failed", 400)
  }

  await docRef.update({ status })
  return ok({ message: "Status updated", status })
}
