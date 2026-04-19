import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
// @/* = app/* so this resolves to app/admin-dashboard/tasks/[taskId]/task-detail-client
import { TaskDetailClient } from "@/admin-dashboard/tasks/[taskId]/task-detail-client"

async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("spotix_session")?.value
  if (!sessionCookie) redirect("/login")
  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const userDoc = await adminDb.collection("users").doc(claims.uid).get()
    return { uid: claims.uid, username: userDoc.data()?.username || "User" }
  } catch {
    redirect("/login")
  }
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = await params
  const session = await getSession()
  return (
    <TaskDetailClient
      taskId={taskId}
      isAdmin={false}
      currentUid={session.uid}
      currentUsername={session.username}
    />
  )
}
