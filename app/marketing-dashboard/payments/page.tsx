import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { adminAuth } from "@/lib/firebase-admin"
import PaymentsClient from "@/components/payments/payments-client"

export const metadata: Metadata = { title: "Payments | Marketing Dashboard" }

async function requireSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("spotix_session")?.value
  if (!sessionCookie) redirect("/login")
  try {
    await adminAuth.verifySessionCookie(sessionCookie, true)
  } catch { redirect("/login") }
}

export default async function PaymentsPage() {
  await requireSession()
  return <PaymentsClient />
}
