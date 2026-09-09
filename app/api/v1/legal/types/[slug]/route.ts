// DELETE /api/v1/legal/types/[slug] — remove a document type. Only allowed
// when it has zero versions, so a live/drafted document can never
// disappear out from under an editor by accident.

import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { LEGAL_EDITOR_ROLES } from "@/lib/legal-policies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error

    const { slug } = await params

    const { count, error: countError } = await supabaseAdmin
      .from("legal_policy_versions")
      .select("id", { count: "exact", head: true })
      .eq("slug", slug)

    if (countError) throw countError
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Delete this document's versions first, then remove the document type", developer: DEV_TAG },
        { status: 409 },
      )
    }

    const { error } = await supabaseAdmin.from("legal_policy_types").delete().eq("slug", slug)
    if (error) throw error

    return NextResponse.json({ success: true, message: "Document type deleted", developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("DELETE /api/v1/legal/types/[slug] error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to delete document type",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}
