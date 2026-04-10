// api/v1/users/[email]/payout-methods/route.ts

import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface PayoutMethod {
  id: string
  accountName: string
  accountNumber: string
  bankCode: string
  bankName: string
  createdAt: string
  primary: boolean
  recipientCode?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    const { email } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required", methods: [] },
        { status: 400 }
      )
    }

    const methodsRef = adminDb
      .collection("payoutMethods")
      .doc(userId)
      .collection("methods")

    const snapshot = await methodsRef.orderBy("createdAt", "desc").get()

    const methods: PayoutMethod[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      methods.push({
        id: doc.id,
        accountName: data.accountName ?? "",
        accountNumber: data.accountNumber ?? "",
        bankCode: data.bankCode ?? "",
        bankName: data.bankName ?? "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? "",
        primary: data.primary ?? false,
        recipientCode: data.recipientCode ?? undefined,
      })
    })

    return NextResponse.json({ methods })
  } catch (error) {
    console.error("[v0] Payout methods GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payout methods", methods: [] },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    await params // consume params (unused but required by Next.js signature)

    const { userId, methodId } = await request.json()

    if (!userId || !methodId) {
      return NextResponse.json(
        { error: "userId and methodId are required" },
        { status: 400 }
      )
    }

    const methodsRef = adminDb
      .collection("payoutMethods")
      .doc(userId)
      .collection("methods")

    // Verify the target method exists
    const targetDoc = await methodsRef.doc(methodId).get()
    if (!targetDoc.exists) {
      return NextResponse.json(
        { error: "Payout method not found" },
        { status: 404 }
      )
    }

    // Clear primary on all other methods, then set on target — in one batch
    const allSnapshot = await methodsRef.get()
    const batch = adminDb.batch()

    allSnapshot.forEach((doc) => {
      batch.update(doc.ref, { primary: doc.id === methodId })
    })

    await batch.commit()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Payout methods PATCH error:", error)
    return NextResponse.json(
      { error: "Failed to update primary method" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) return adminResult.error

    await params // consume params

    const { userId, methodId } = await request.json()

    if (!userId || !methodId) {
      return NextResponse.json(
        { error: "userId and methodId are required" },
        { status: 400 }
      )
    }

    const methodRef = adminDb
      .collection("payoutMethods")
      .doc(userId)
      .collection("methods")
      .doc(methodId)

    const methodDoc = await methodRef.get()
    if (!methodDoc.exists) {
      return NextResponse.json(
        { error: "Payout method not found" },
        { status: 404 }
      )
    }

    await methodRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Payout methods DELETE error:", error)
    return NextResponse.json(
      { error: "Failed to delete payout method" },
      { status: 500 }
    )
  }
}