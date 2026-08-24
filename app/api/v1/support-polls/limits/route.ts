/**
 * app/api/v1/support-polls/limits/route.ts
 *
 * GET ?pollId=xxx → { override, resolved, defaults }
 *
 * Customer-support's own read-only counterpart to
 * /api/v1/admin-polls/limits — deliberately a separate route/file (not a
 * shared one with a wider role list) so the admin and customer-support
 * surfaces can be locked down and evolve independently. Configuring
 * limits is an admin-only capability; customer-support can only view
 * what's currently configured for a poll (no PUT here at all).
 *
 * Access: "customer-support" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { getPollLimits } from "@/lib/poll-limits"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV_TAG, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV_TAG }, { status })
}

export async function GET(request: NextRequest) {
  const auth = await verifyAdminAccess(request, ["customer-support"])
  if ("error" in auth) return auth.error

  const pollId = new URL(request.url).searchParams.get("pollId")?.trim()
  if (!pollId) return fail("pollId is required", 400)

  const data = await getPollLimits(pollId)
  if (!data) return fail("Poll not found", 404)

  return ok(data)
}

export async function PUT() { return fail("Method Not Allowed — limits are admin-only, view only here", 403) }
export async function POST() { return fail("Method Not Allowed", 405) }
export async function DELETE() { return fail("Method Not Allowed", 405) }
