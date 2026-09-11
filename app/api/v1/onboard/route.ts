// GET  /api/v1/onboard         — list all admins
// POST /api/v1/onboard         — add a new admin
// DELETE /api/v1/onboard       — remove an admin

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyFullAdmin } from "@/lib/verify-admin"
import type { AdminRole } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_ROLES: AdminRole[] = ["admin", "exec-assistant", "customer-support", "marketing", "IT"]

export async function GET(request: NextRequest) {
  const auth = await verifyFullAdmin(request)
  if ("error" in auth) return auth.error

  try {
    const snapshot = await adminDb.collection("admins").get()
    if (snapshot.empty) return NextResponse.json({ admins: [] })

    const uids = snapshot.docs.map((d) => d.id)

    // Batch-fetch user records (Firestore getAll handles up to 500)
    const userRefs = uids.map((uid) => adminDb.collection("users").doc(uid))
    const userDocs = await adminDb.getAll(...userRefs)

    const admins = snapshot.docs.map((adminDoc, i) => {
      const adminData = adminDoc.data()
      const userData = userDocs[i].data()
      return {
        uid:            adminDoc.id,
        email:          userData?.email          || "",
        username:       userData?.username        || "",
        fullName:       userData?.fullName        || "",
        profilePicture: userData?.profilePicture  || null,
        role:           adminData.role            || "",
        secondaryRoles: adminData.secondaryRoles  || [],
        isSuperAdmin:   adminData.setup === true,
        onboardedAt:    adminData.onboardedAt?.toDate?.()?.toISOString?.() || null,
        onboardedBy:    adminData.onboardedBy     || null,
      }
    })

    return NextResponse.json({ admins })
  } catch (err) {
    console.error("[onboard GET]", err)
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyFullAdmin(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { email, role, secondaryRoles = [] } = body

    if (!email || !role) {
      return NextResponse.json({ error: "email and role are required" }, { status: 400 })
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    for (const r of secondaryRoles) {
      if (!VALID_ROLES.includes(r)) {
        return NextResponse.json({ error: `Invalid secondary role: ${r}` }, { status: 400 })
      }
    }

    // Find user by email
    const q = await adminDb.collection("users").where("email", "==", email).limit(1).get()
    if (q.empty) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userDoc = q.docs[0]
    const uid = userDoc.id
    const userData = userDoc.data()

    // Check not already onboarded
    const existing = await adminDb.collection("admins").doc(uid).get()
    if (existing.exists) {
      return NextResponse.json({ error: "User is already an admin" }, { status: 409 })
    }

    await adminDb.collection("admins").doc(uid).set({
      role,
      secondaryRoles,
      onboardedAt: new Date(),
      onboardedBy: auth.uid,
    })

    return NextResponse.json({
      success: true,
      admin: {
        uid,
        email:    userData.email    || email,
        username: userData.username || "",
        fullName: userData.fullName || "",
        role,
        secondaryRoles,
        isSuperAdmin: false,
      },
    })
  } catch (err) {
    console.error("[onboard POST]", err)
    return NextResponse.json({ error: "Failed to onboard admin" }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/onboard — edit an existing admin's primary role and/or
 * secondary roles. Lets a full admin correct someone's access without
 * having to remove and re-onboard them (see onboard-client.tsx's Edit
 * modal).
 *
 * A super admin's role can't be changed here (same as DELETE refusing
 * to remove them), and a full admin can't edit their own role — both
 * guard against a full admin accidentally locking themselves, or the
 * last super admin, out of the Onboard page.
 */
export async function PATCH(request: NextRequest) {
  const auth = await verifyFullAdmin(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { uid, role, secondaryRoles = [] } = body

    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 })
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }
    for (const r of secondaryRoles) {
      if (!VALID_ROLES.includes(r)) {
        return NextResponse.json({ error: `Invalid secondary role: ${r}` }, { status: 400 })
      }
    }
    if (secondaryRoles.includes(role)) {
      return NextResponse.json({ error: "Secondary roles cannot include the primary role" }, { status: 400 })
    }

    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    // Super admins' roles cannot be changed
    if (adminDoc.data()?.setup === true) {
      return NextResponse.json({ error: "Super admin's role cannot be changed" }, { status: 403 })
    }

    // Cannot edit your own role
    if (uid === auth.uid) {
      return NextResponse.json({ error: "Cannot edit your own role" }, { status: 403 })
    }

    await adminDb.collection("admins").doc(uid).update({
      role,
      secondaryRoles,
      roleUpdatedAt: new Date(),
      roleUpdatedBy: auth.uid,
    })

    return NextResponse.json({ success: true, admin: { uid, role, secondaryRoles } })
  } catch (err) {
    console.error("[onboard PATCH]", err)
    return NextResponse.json({ error: "Failed to update admin" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyFullAdmin(request)
  if ("error" in auth) return auth.error

  try {
    const body = await request.json()
    const { uid } = body

    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 })

    const adminDoc = await adminDb.collection("admins").doc(uid).get()
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    // Super admins cannot be removed
    if (adminDoc.data()?.setup === true) {
      return NextResponse.json({ error: "Super admin cannot be removed" }, { status: 403 })
    }

    // Cannot remove yourself
    if (uid === auth.uid) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 403 })
    }

    await adminDb.collection("admins").doc(uid).delete()
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[onboard DELETE]", err)
    return NextResponse.json({ error: "Failed to remove admin" }, { status: 500 })
  }
}
