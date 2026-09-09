// PATCH  /api/v1/legal/[id]  — edit a version's title/content/last-revised/changelog/label
// DELETE /api/v1/legal/[id]  — delete a draft version (published versions can't be deleted)

import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { LEGAL_EDITOR_ROLES } from "@/lib/legal-policies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error

    const { id } = await params
    const body = await request.json()
    const { title, content, lastRevised, changelog, version } = body

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (content !== undefined) updates.content = content
    if (lastRevised !== undefined) updates.last_revised = lastRevised
    if (changelog !== undefined) updates.changelog = changelog
    if (version !== undefined) updates.version = version

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update", developer: DEV_TAG }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("legal_policy_versions")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "That version label already exists for this policy", developer: DEV_TAG },
          { status: 409 },
        )
      }
      throw error
    }
    if (!data) {
      return NextResponse.json({ error: "Version not found", developer: DEV_TAG }, { status: 404 })
    }

    return NextResponse.json({ success: true, version: data, developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("PATCH /api/v1/legal/[id] error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to update legal policy version",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error

    const { id } = await params

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("legal_policy_versions")
      .select("is_published")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Version not found", developer: DEV_TAG }, { status: 404 })
    }
    if (existing.is_published) {
      return NextResponse.json(
        { error: "Cannot delete the published version. Publish another version first.", developer: DEV_TAG },
        { status: 403 },
      )
    }

    const { error } = await supabaseAdmin.from("legal_policy_versions").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true, message: "Version deleted", developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("DELETE /api/v1/legal/[id] error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to delete legal policy version",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}
