// GET  /api/v1/legal?slug=tos   — list versions (all slugs if omitted)
// POST /api/v1/legal            — create a new draft version for a policy
//
// Restricted to admin + exec-assistant (Legal Content menu item).

import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { LEGAL_POLICY_TABS, LEGAL_EDITOR_ROLES } from "@/lib/legal-policies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get("slug")

    let query = supabaseAdmin
      .from("legal_policy_versions")
      .select("*")
      .order("slug", { ascending: true })
      .order("created_at", { ascending: false })

    if (slug) query = query.eq("slug", slug)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(
      { success: true, versions: data ?? [], policyTabs: LEGAL_POLICY_TABS, developer: DEV_TAG },
      { status: 200 },
    )
  } catch (error) {
    console.error("GET /api/v1/legal error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch legal policy versions",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error
    const admin = adminResult

    const body = await request.json()
    const { slug, version, title, content, lastRevised, changelog } = body

    if (!slug || !version?.trim() || !title?.trim()) {
      return NextResponse.json(
        { error: "slug, version, and title are required", developer: DEV_TAG },
        { status: 400 },
      )
    }
    if (!LEGAL_POLICY_TABS.some((t) => t.slug === slug)) {
      return NextResponse.json({ error: "Unknown policy slug", developer: DEV_TAG }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("legal_policy_versions")
      .insert({
        slug,
        version: version.trim(),
        title: title.trim(),
        content: content || "",
        last_revised: lastRevised || new Date().toISOString().slice(0, 10),
        changelog: changelog || null,
        is_published: false,
        created_by_uid: admin.uid,
        created_by_name: admin.username,
      })
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

    return NextResponse.json({ success: true, version: data, developer: DEV_TAG }, { status: 201 })
  } catch (error) {
    console.error("POST /api/v1/legal error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to create legal policy version",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}
