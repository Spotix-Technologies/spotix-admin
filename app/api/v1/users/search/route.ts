import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface UserSearchResult {
  email: string
  displayName: string
  userId: string
  createdAt: string
  lastLogin?: string
  ticketsCount: number
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")?.trim().toLowerCase()

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters", results: [] },
        { status: 400 }
      )
    }

    // Search users by email
    const usersRef = adminDb.collection("users")
    let results: UserSearchResult[] = []

    // Firestore doesn't support LIKE queries, so we fetch users and filter
    // For production, consider using Algolia or Meilisearch
    const snapshot = await usersRef.limit(100).get()

    snapshot.forEach((doc) => {
      const data = doc.data()
      const email = data.email?.toLowerCase() || ""
      const displayName = data.username || data.email || "Unknown"

      if (email.includes(query) || displayName.toLowerCase().includes(query)) {
        results.push({
          email: data.email,
          displayName,
          userId: doc.id,
          createdAt: data.createdAt || "",
          lastLogin: data.lastLogin,
          ticketsCount: data.ticketsCount || 0,
        })
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Users search error:", error)
    return NextResponse.json(
      { error: "Failed to search users", results: [] },
      { status: 500 }
    )
  }
}
