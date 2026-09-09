// POST /api/v1/legal/[id]/publish
// Marks this version as the live/published one for its policy slug and
// unpublishes whichever version was previously live (only one published
// version per slug at a time — enforced again here, and by a unique
// partial index in Postgres as a backstop).

import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { LEGAL_EDITOR_ROLES } from "@/lib/legal-policies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error

    const { id } = await params

    const { data: target, error: fetchError } = await supabaseAdmin
      .from("legal_policy_versions")
      .select("id, slug")
      .eq("id", id)
      .single()

    if (fetchError || !target) {
      return NextResponse.json({ error: "Version not found", developer: DEV_TAG }, { status: 404 })
    }

    const { error: unpublishError } = await supabaseAdmin
      .from("legal_policy_versions")
      .update({ is_published: false })
      .eq("slug", target.slug)
      .eq("is_published", true)

    if (unpublishError) throw unpublishError

    const { data, error } = await supabaseAdmin
      .from("legal_policy_versions")
      .update({ is_published: true })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, version: data, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("POST /api/v1/legal/[id]/publish error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to publish legal policy version",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}
