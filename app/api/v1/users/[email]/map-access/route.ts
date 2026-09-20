import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getMapAccessOverrides, setMapAccessOverrides, MAP_PROVIDERS, type MapAccessOverrides } from "@/lib/map-access"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function findUidByEmail(decodedEmail: string): Promise<string | null> {
  const userQuery = await adminDb.collection("users").where("email", "==", decodedEmail).limit(1).get()
  return userQuery.empty ? null : userQuery.docs[0].id
}

// Note: this intentionally returns only the *configured* overrides
// (access on/off + daily-limit cap), never today's usage/consumption —
// that's a separate, not-yet-built page.
export async function GET(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    const uid = await findUidByEmail(decodedEmail)
    if (!uid) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const overrides = await getMapAccessOverrides(uid)
    return NextResponse.json({ overrides })
  } catch (error) {
    console.error("[v0] Map access fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch map access" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    const uid = await findUidByEmail(decodedEmail)
    if (!uid) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const body = await request.json()
    const overrides: MapAccessOverrides = {}

    for (const provider of MAP_PROVIDERS) {
      const entry = body?.[provider]
      if (!entry) continue

      if (entry.enabled !== undefined && entry.enabled !== null && typeof entry.enabled !== "boolean") {
        return NextResponse.json({ error: `${provider}.enabled must be a boolean` }, { status: 400 })
      }
      if (entry.dailyLimit !== undefined && entry.dailyLimit !== null) {
        const n = Number(entry.dailyLimit)
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: `${provider}.dailyLimit must be a non-negative number` }, { status: 400 })
        }
        entry.dailyLimit = n
      }

      overrides[provider] = {
        enabled: entry.enabled ?? undefined,
        dailyLimit: entry.dailyLimit ?? undefined,
      }
    }

    await setMapAccessOverrides(uid, overrides, adminResult.username)

    return NextResponse.json({ success: true, overrides })
  } catch (error) {
    console.error("[v0] Map access update error:", error)
    return NextResponse.json({ error: "Failed to update map access" }, { status: 500 })
  }
}
