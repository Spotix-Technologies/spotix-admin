// GET    /api/v1/tasks/[taskId]   — get task details
// PATCH  /api/v1/tasks/[taskId]   — update task (edit name/objectives/deadline) or acknowledge
// DELETE /api/v1/tasks/[taskId]   — delete task (admin only)

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function serializeTask(data: any) {
  return {
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    deadline:  data.deadline || null,
    objectives: (data.objectives || []).map((obj: any) => ({
      ...obj,
      completedAt: obj.completedAt?.toDate?.()?.toISOString?.() || null,
    })),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await verifyAdminAccess(request)
  if ("error" in auth) return auth.error

  const { taskId } = await params
  try {
    const doc = await adminDb.collection("tasks").doc(taskId).get()
    if (!doc.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const data = doc.data()!

    // Check access
    if (auth.role !== "admin") {
      const allRoles: string[] = [auth.role, ...auth.secondaryRoles]
      const allowed =
        data.type === "general" ||
        (data.departments || []).some((d: string) => allRoles.includes(d))
      if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ task: { id: doc.id, ...serializeTask(data) } })
  } catch (err) {
    console.error("[task GET]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await verifyAdminAccess(request)
  if ("error" in auth) return auth.error

  const { taskId } = await params
  const body = await request.json()

  try {
    const docRef = adminDb.collection("tasks").doc(taskId)
    const doc = await docRef.get()
    if (!doc.exists) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const data = doc.data()!

    // --- Acknowledge ---
    if (body.action === "acknowledge") {
      await docRef.update({
        acknowledgedBy: FieldValue.arrayUnion(auth.uid),
        status: "in-progress",
        updatedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true })
    }

    // --- Complete objective ---
    if (body.action === "complete-objective") {
      const { objectiveId, attachmentUrl } = body
      const objectives = data.objectives || []
      const updated = objectives.map((obj: any) => {
        if (obj.id !== objectiveId) return obj
        if (obj.requiresAttachment && !attachmentUrl) return obj // can't complete without attachment
        return {
          ...obj,
          completed:    true,
          completedBy:  auth.uid,
          completedAt:  new Date().toISOString(),
          attachmentUrl: attachmentUrl || null,
        }
      })

      const allDone = updated.every((o: any) => o.completed)
      await docRef.update({
        objectives: updated,
        status:     allDone ? "completed" : "in-progress",
        updatedAt:  FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, allDone })
    }

    // --- Admin edit ---
    if (auth.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updates: any = { updatedAt: FieldValue.serverTimestamp() }
    if (body.name)       updates.name       = body.name
    if (body.deadline !== undefined) updates.deadline = body.deadline
    if (body.objectives) updates.objectives = body.objectives
    if (body.departments) updates.departments = body.departments

    await docRef.update(updates)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[task PATCH]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const auth = await verifyAdminAccess(request, ["admin"])
  if ("error" in auth) return auth.error

  const { taskId } = await params
  try {
    await adminDb.collection("tasks").doc(taskId).delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[task DELETE]", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
