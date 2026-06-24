/**
 * app/api/v1/event-data/sync-key/route.ts
 *
 * POST { eventId } → generates a fresh Scanner sync key for an event and
 * stores it on events/{eventId} (syncKey, syncKeyCreatedAt) — the exact
 * same fields spotix-booker's /api/sync writes. A key minted here works
 * identically in Spotix Scanner as one minted from the booker app.
 *
 * Access: admin + exec-assistant
 */

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function generateSyncKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const arr = new Uint8Array(12)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join("")
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request, ["admin", "exec-assistant"])
    if ("error" in adminResult) return adminResult.error

    const body = await request.json()
    const eventId = body?.eventId?.trim()
    if (!eventId) {
      return NextResponse.json({ error: "eventId is required", developer: DEV_TAG }, { status: 400 })
    }

    const eventRef = adminDb.collection("events").doc(eventId)
    const eventSnap = await eventRef.get()
    if (!eventSnap.exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
    }

    const key = generateSyncKey()
    await eventRef.update({
      syncKey: key,
      syncKeyCreatedAt: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, key, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("POST /api/v1/event-data/sync-key error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}
