// GET  /api/v1/legal/types  — list document types (tabs on the public site)
// POST /api/v1/legal/types  — create a new document type

import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { LEGAL_EDITOR_ROLES, isValidSlugFormat, slugify } from "@/lib/legal-policies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdminAccess(request, [...LEGAL_EDITOR_ROLES])
    if ("error" in adminResult) return adminResult.error

    const { data, error } = await supabaseAdmin
      .from("legal_policy_types")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, types: data ?? [], developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("GET /api/v1/legal/types error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to fetch document types",
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
    const label: string = (body.label || "").trim()
    const requestedSlug: string = (body.slug || "").trim()

    if (!label) {
      return NextResponse.json({ error: "A document title is required", developer: DEV_TAG }, { status: 400 })
    }

    const slug = requestedSlug ? slugify(requestedSlug) : slugify(label)
    if (!slug || !isValidSlugFormat(slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase letters, numbers, and hyphens only", developer: DEV_TAG },
        { status: 400 },
      )
    }

    const { data: maxRow } = await supabaseAdmin
      .from("legal_policy_types")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextSortOrder = (maxRow?.sort_order ?? 0) + 1

    const { data, error } = await supabaseAdmin
      .from("legal_policy_types")
      .insert({
        slug,
        label,
        sort_order: nextSortOrder,
        created_by_uid: admin.uid,
        created_by_name: admin.username,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A document type with that slug already exists", developer: DEV_TAG },
          { status: 409 },
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, type: data, developer: DEV_TAG }, { status: 201 })
  } catch (error) {
    console.error("POST /api/v1/legal/types error:", error)
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "Failed to create document type",
        details: error instanceof Error ? error.message : "Unknown error",
        developer: DEV_TAG,
      },
      { status: 500 },
    )
  }
}
