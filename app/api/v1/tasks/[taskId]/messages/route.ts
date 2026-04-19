// GET  /api/v1/tasks/[taskId]/messages  — load chat messages (paginated)
// POST /api/v1/tasks/[taskId]/messages  — post a message

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await verifyAdminAccess(request)
  if ("error" in auth) return auth.error

  const { taskId } = await params
  const { searchParams } = new URL(request.url)
  const limitN = Math.min(parseInt(searchParams.get("limit") || "50"), 100)

  try {
    const snap = await adminDb
      .collection("tasks").doc(taskId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .limit(limitN)
      .get()

    const messages = snap.docs.map((d) => {
      const m = d.data()
      return {
        id:        d.id,
        text:      m.text,
        authorId:  m.authorId,
        authorName:m.authorName,
        mentions:  m.mentions || [],
        taskRef:   m.taskRef   || null,
        replyTo:   m.replyTo   || null,
        createdAt: m.createdAt?.toDate?.()?.toISOString?.() || null,
      }
    })

    return NextResponse.json({ messages })
  } catch (err) {
    console.error("[messages GET]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await verifyAdminAccess(request)
  if ("error" in auth) return auth.error

  const { taskId } = await params
  const body = await request.json()
  const { text, replyTo, taskRef, mentions } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: "Message text required" }, { status: 400 })
  }

  try {
    const msgRef = adminDb.collection("tasks").doc(taskId).collection("messages").doc()
    await msgRef.set({
      text:       text.trim(),
      authorId:   auth.uid,
      authorName: auth.username,
      mentions:   mentions || [],
      taskRef:    taskRef  || null,
      replyTo:    replyTo  || null,
      createdAt:  FieldValue.serverTimestamp(),
    })

    // Update task updatedAt
    await adminDb.collection("tasks").doc(taskId).update({
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, messageId: msgRef.id })
  } catch (err) {
    console.error("[messages POST]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
