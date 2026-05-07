import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth, adminDb } from "@/lib/firebase-admin"
import DocumentsClient from "../../../exec-assistant-dashboard/documents/documents-client"

export const metadata = { title: "Documents | Admin" }

export default async function AdminDocumentsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("spotix_session")?.value
  if (!sessionCookie) redirect("/login")

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true)
    const adminDoc = await adminDb.collection("admins").doc(decoded.uid).get()
    if (!adminDoc.exists || adminDoc.data()?.role !== "admin") redirect("/unauth")
  } catch {
    redirect("/login")
  }

  return <DocumentsClient canWrite={false} />
}
