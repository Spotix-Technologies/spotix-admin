import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export interface PayoutMethod {
  id: string
  type: "bank" | "paypal" | "stripe"
  displayName: string
  lastFour?: string
  email?: string
  isDefault: boolean
  createdAt: string
  verified: boolean
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)

    // Get payout methods
    const payoutRef = adminDb.collection("payoutMethods")
    const snapshot = await payoutRef.where("userEmail", "==", decodedEmail).get()

    const methods: PayoutMethod[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      methods.push({
        id: doc.id,
        type: data.type,
        displayName: data.displayName,
        lastFour: data.lastFour,
        email: data.email,
        isDefault: data.isDefault || false,
        createdAt: data.createdAt || "",
        verified: data.verified || false,
      })
    })

    return NextResponse.json({ methods })
  } catch (error) {
    console.error("[v0] Payout methods error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payout methods", methods: [] },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)
    const body = await request.json()

    const { type, displayName, lastFour, paypalEmail } = body

    if (!type || !displayName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const newMethod = {
      userEmail: decodedEmail,
      type,
      displayName,
      lastFour: lastFour || null,
      email: paypalEmail || null,
      isDefault: false,
      verified: false,
      createdAt: new Date().toISOString(),
    }

    const payoutRef = adminDb.collection("payoutMethods")
    const docRef = await payoutRef.add(newMethod)

    return NextResponse.json({
      id: docRef.id,
      ...newMethod,
    })
  } catch (error) {
    console.error("[v0] Add payout method error:", error)
    return NextResponse.json(
      { error: "Failed to add payout method" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      return adminResult.error
    }

    const { email } = await params
    const decodedEmail = decodeURIComponent(email)
    const { methodId } = await request.json()

    if (!methodId) {
      return NextResponse.json(
        { error: "Missing methodId" },
        { status: 400 }
      )
    }

    // Verify the method belongs to the user
    const methodRef = adminDb.collection("payoutMethods").doc(methodId)
    const methodDoc = await methodRef.get()

    if (!methodDoc.exists) {
      return NextResponse.json(
        { error: "Payout method not found" },
        { status: 404 }
      )
    }

    if (methodDoc.data()?.userEmail !== decodedEmail) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    await methodRef.delete()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Delete payout method error:", error)
    return NextResponse.json(
      { error: "Failed to delete payout method" },
      { status: 500 }
    )
  }
}
