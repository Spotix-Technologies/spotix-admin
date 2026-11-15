/**
 * /api/v1/event-controls   (full admins only)
 *
 * GET                                  → { featured[], themed[], limits, themes[] }
 * POST   { kind, eventId, theme? }     → { entry }   add an event to featured/themed
 * PATCH  { id, theme }                 → { theme }   rename a themed entry's theme
 * DELETE ?kind=featured|themed&id=...  → { success } remove an entry
 *
 * Firestore (read client-side by the Spotix user app):
 *   featuredEvents/{id}, themedEvents/{id} — see app/lib/event-controls-db.ts
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { addControl, ControlsError, isKind, listControls, removeControl, updateTheme } from "@/lib/event-controls-db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"
const json = (body: object, status = 200) => NextResponse.json({ ...body, developer: DEV_TAG }, { status })

async function guard(request: NextRequest) {
  const result = await verifyAdminAccess(request, ["admin"])
  if ("error" in result) {
    const res = result.error as NextResponse
    const body = (await res.json()) as any
    return { error: json({ error: body.error || "Forbidden" }, res.status) }
  }
  return { admin: result }
}

function fail(err: unknown, label: string) {
  if (err instanceof ControlsError) return json({ error: err.message }, err.status)
  console.error(`${label} error:`, err)
  return json({ error: "Internal Server Error" }, 500)
}

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request)
    if ("error" in g) return g.error
    return json(await listControls())
  } catch (err) {
    return fail(err, "GET /api/v1/event-controls")
  }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request)
    if ("error" in g) return g.error
    const body = await request.json().catch(() => ({}))
    if (!isKind(body.kind)) return json({ error: "kind must be 'featured' or 'themed'" }, 400)
    if (typeof body.eventId !== "string") return json({ error: "eventId is required" }, 400)
    const entry = await addControl(body.kind, body.eventId, body.theme, g.admin)
    return json({ entry }, 201)
  } catch (err) {
    return fail(err, "POST /api/v1/event-controls")
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const g = await guard(request)
    if ("error" in g) return g.error
    const body = await request.json().catch(() => ({}))
    if (typeof body.id !== "string" || !body.id) return json({ error: "id is required" }, 400)
    const theme = await updateTheme(body.id, body.theme)
    return json({ theme })
  } catch (err) {
    return fail(err, "PATCH /api/v1/event-controls")
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const g = await guard(request)
    if ("error" in g) return g.error
    const params = new URL(request.url).searchParams
    const kind = params.get("kind")
    const id = params.get("id")
    if (!isKind(kind)) return json({ error: "kind must be 'featured' or 'themed'" }, 400)
    if (!id) return json({ error: "id is required" }, 400)
    await removeControl(kind, id)
    return json({ success: true })
  } catch (err) {
    return fail(err, "DELETE /api/v1/event-controls")
  }
}
