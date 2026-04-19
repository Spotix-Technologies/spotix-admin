// GET  /api/v1/tasks   — list tasks (filtered by role)
// POST /api/v1/tasks   — create task (admin only)

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import type { AdminRole } from "@/lib/verify-admin"
import { FieldValue } from "firebase-admin/firestore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type TaskType = "general" | "dept"
type DeptName = "exec-assistant" | "customer-support" | "marketing" | "IT"

function generateTaskId(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mmm = now.toLocaleString("en", { month: "short" }).toUpperCase()
  const dd = String(now.getDate()).padStart(2, "0")
  const ts = now.getTime()
  return `sptx-tsk-${yyyy}${mmm}${dd}-${ts}`
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccess(request)
  if ("error" in auth) return auth.error

  try {
    const { searchParams } = new URL(request.url)
    const dept = searchParams.get("dept") // optional filter by dept

    let query: FirebaseFirestore.Query = adminDb.collection("tasks")

    if (auth.role === "admin") {
      // Admin sees all; optionally filter by dept
      if (dept) {
        query = query.where("departments", "array-contains", dept)
      }
    } else {
      // Non-admin: see general tasks OR tasks for their dept
      // Firestore doesn't support OR natively without composite index tricks,
      // so we fetch general tasks and dept tasks separately
      const [generalSnap, deptSnap] = await Promise.all([
        adminDb.collection("tasks").where("type", "==", "general").orderBy("createdAt", "desc").limit(50).get(),
        adminDb.collection("tasks").where("departments", "array-contains", auth.role).orderBy("createdAt", "desc").limit(50).get(),
      ])

      const seen = new Set<string>()
      const tasks: any[] = []

      for (const doc of [...generalSnap.docs, ...deptSnap.docs]) {
        if (seen.has(doc.id)) continue
        seen.add(doc.id)
        tasks.push({ id: doc.id, ...serializeTask(doc.data()) })
      }

      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      return NextResponse.json({ tasks })
    }

    // Admin path
    const snap = await query.orderBy("createdAt", "desc").limit(100).get()
    const tasks = snap.docs.map((d) => ({ id: d.id, ...serializeTask(d.data()) }))
    return NextResponse.json({ tasks })
  } catch (err) {
    console.error("[tasks GET]", err)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["admin"])
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { name, type, departments, objectives, deadline, mentions } = body

    if (!name || !type) {
      return NextResponse.json({ error: "name and type are required" }, { status: 400 })
    }
    if (type === "dept" && (!departments || departments.length === 0)) {
      return NextResponse.json({ error: "departments required for dept task" }, { status: 400 })
    }

    const taskId = generateTaskId()

    const taskData = {
      taskId,
      name,
      type,
      departments: type === "general" ? [] : departments,
      objectives: (objectives || []).map((obj: any, i: number) => ({
        id:              `obj-${i + 1}`,
        text:            obj.text || "",
        mentions:        obj.mentions || [],
        requiresAttachment: obj.requiresAttachment || false,
        attachmentType:  obj.attachmentType || null,
        completed:       false,
        completedBy:     null,
        completedAt:     null,
        attachmentUrl:   null,
      })),
      deadline:     deadline || null,
      createdBy:    auth.uid,
      createdAt:    FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
      status:       "open",      // open | in-progress | completed
      acknowledgedBy: [],
    }

    await adminDb.collection("tasks").doc(taskId).set(taskData)
    return NextResponse.json({ success: true, taskId })
  } catch (err) {
    console.error("[tasks POST]", err)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}

function serializeTask(data: any) {
  return {
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    deadline:  data.deadline  || null,
  }
}
