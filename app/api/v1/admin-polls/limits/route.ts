/**
 * app/api/v1/admin-polls/limits/route.ts
 *
 * GET  ?pollId=xxx  → { override, resolved, defaults }
 * PUT  { pollId, maxSingleContestants?, maxGroupTopCategories?,
 *        maxGroupTotalSubcategories?, maxContestantsPerCategory? }
 *   Each field: a positive number sets an override, `null` clears it back
 *   to the platform default, `undefined`/omitted leaves it untouched.
 *
 * This is the ADMIN dashboard's own route for configuring a poll's
 * structure limits (see spotix-booker's lib/poll-config.ts
 * resolvePollLimits() for how the booker app consumes this). It is
 * deliberately a separate route/file from
 * /api/v1/support-polls/limits (customer-support's view-only
 * counterpart) rather than one shared route with a role list, so the two
 * surfaces can be locked down and evolve independently.
 *
 * Access: full "admin" only, both GET and PUT — configuring limits is an
 * admin-only capability per product decision; customer-support gets a
 * read-only view via its own route instead.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getPollLimits, setPollLimits, type PollLimitsOverride } from "@/lib/poll-limits"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const pollId = new URL(request.url).searchParams.get("pollId")?.trim()
  if (!pollId) return fail("pollId is required", 400)

  const data = await getPollLimits(pollId)
  if (!data) return fail("Poll not found", 404)

  return ok(data)
}

export async function PUT(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  let body: { pollId?: string } & PollLimitsOverride
  try { body = await request.json() } catch { return fail("Invalid JSON", 400) }

  const { pollId, ...override } = body
  if (!pollId?.trim()) return fail("pollId is required", 400)

  for (const [key, v] of Object.entries(override)) {
    if (v !== undefined && v !== null && (typeof v !== "number" || !Number.isFinite(v) || v <= 0)) {
      return fail(`${key} must be a positive number, or null to reset to default`, 400)
    }
  }

  const data = await getPollLimits(pollId)
  if (!data) return fail("Poll not found", 404)

  await setPollLimits(pollId, override)
  const updated = await getPollLimits(pollId)

  return ok({ message: "Poll limits updated", ...updated })
}

export async function POST() { return fail("Method Not Allowed", 405) }
export async function DELETE() { return fail("Method Not Allowed", 405) }
