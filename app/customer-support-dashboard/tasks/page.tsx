import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import { TasksMemberClient } from "./tasks-member-client"

export const metadata: Metadata = { title: "Tasks | Customer Support Dashboard" }

async function getSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("spotix_session")?.value
  if (!sessionCookie) redirect("/login")
  try {
    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const userDoc = await adminDb.collection("users").doc(claims.uid).get()
    const adminDoc = await adminDb.collection("admins").doc(claims.uid).get()
    return {
      uid: claims.uid,
      username: userDoc.data()?.username || "User",
      role: adminDoc.data()?.role || "",
    }
  } catch { redirect("/login") }
}

export default async function TasksPage() {
  const session = await getSession()
  return <TasksMemberClient currentUid={session.uid} currentUsername={session.username} currentRole={session.role} />
}
