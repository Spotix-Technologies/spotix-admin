/**
 * app/lib/admin-roster.ts
 *
 */

import { adminDb } from "@/lib/firebase-admin"

export interface AdminApprover {
  uid: string
  username: string
}

export async function listAdminApprovers(): Promise<AdminApprover[]> {
  const snap = await adminDb.collection("admins").where("role", "==", "admin").get()
  const uids = snap.docs.map((d) => d.id)

  if (uids.length === 0) return []

  const userDocs = await Promise.all(uids.map((uid) => adminDb.collection("users").doc(uid).get()))
  return uids.map((uid, i) => ({
    uid,
    username: userDocs[i].data()?.username ?? "Admin",
  }))
}
