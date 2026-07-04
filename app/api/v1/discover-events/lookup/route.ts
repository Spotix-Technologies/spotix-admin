/**
 * GET    /api/v1/discover-events/lookup?state=Lagos&id=abc123
 * PUT    /api/v1/discover-events/lookup        { state, id, ...updates }
 * DELETE /api/v1/discover-events/lookup        { state, id }
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV = "API developed and maintained by Spotix Technologies"

function docRef(state: string, id: string) {
  return adminDb.collection("discover").doc(state).collection("events").doc(id)
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state")?.trim()
    const id = searchParams.get("id")?.trim()

    if (!state || !id) {
      return NextResponse.json({ error: "state and id are required", developer: DEV }, { status: 400 })
    }

    const snap = await docRef(state, id).get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV }, { status: 404 })
    }

    return NextResponse.json({ success: true, event: snap.data(), developer: DEV })
  } catch (error) {
    console.error("GET discover lookup error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const body = await request.json()
    const { state, id, ...updates } = body

    if (!state || !id) {
      return NextResponse.json({ error: "state and id are required", developer: DEV }, { status: 400 })
    }

    const ref = docRef(state, id)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV }, { status: 404 })
    }

    // Only a full "admin" can edit listings posted by other admins.
    // Non-"admin" roles may only edit listings they posted themselves.
    const eventData = snap.data()!
    const isOwner = eventData.postedByUid === admin.uid
    if (admin.role !== "admin" && !isOwner) {
      return NextResponse.json(
        { error: "You can only edit events you posted yourself", developer: DEV },
        { status: 403 }
      )
    }

    // Prevent overwriting system fields
    const { id: _id, postedByUid: _uid, createdAt: _ca, ...safeUpdates } = updates
    await ref.update({ ...safeUpdates, updatedAt: new Date().toISOString(), lastEditedBy: admin.username })

    return NextResponse.json({ success: true, developer: DEV })
  } catch (error) {
    console.error("PUT discover lookup error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await verifyAdminAccess(request)
    if ("error" in admin) return admin.error

    const body = await request.json()
    const { state, id } = body

    if (!state || !id) {
      return NextResponse.json({ error: "state and id are required", developer: DEV }, { status: 400 })
    }

    const ref = docRef(state, id)
    const snap = await ref.get()
    if (!snap.exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV }, { status: 404 })
    }

    // Same ownership rule as edits: only a full "admin" may delete other admins' listings.
    const eventData = snap.data()!
    const isOwner = eventData.postedByUid === admin.uid
    if (admin.role !== "admin" && !isOwner) {
      return NextResponse.json(
        { error: "You can only delete events you posted yourself", developer: DEV },
        { status: 403 }
      )
    }

    // Archive before delete
    await adminDb.collection("deletedDiscoverEvents").doc(`${state}_${id}`).set({
      ...snap.data(),
      deletedAt: new Date().toISOString(),
      deletedBy: admin.username,
      deletedByUid: admin.uid,
    })

    await ref.delete()

    return NextResponse.json({ success: true, developer: DEV })
  } catch (error) {
    console.error("DELETE discover lookup error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV }, { status: 500 })
  }
}
