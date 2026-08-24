/**
 * app/api/v1/admin/transfer/stream/route.ts
 *
 * GET → Server-Sent Events stream of admin_transfers changes.
 *
 * Subscribes to Postgres realtime (via the existing service-role
 * `supabaseAdmin` client — same one every other route in this feature
 * uses, never exposed to the browser) and relays every insert/update on
 * `admin_transfers` to the client as an SSE event. The frontend treats
 * each event as "something changed, re-fetch" rather than trying to
 * hand-patch approval arrays/status transitions client-side — the
 * list/pending endpoints remain the source of truth for shape.
 *
 * Requires the `admin_transfers` table to be added to Supabase's
 * `supabase_realtime` publication (see supabase/admin-transfers-schema.sql,
 * or toggle "Enable Realtime" on the table from the Supabase dashboard —
 * same effect).
 *
 * Access: full "admin" only.
 */

import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminAccess } from "@/lib/verify-admin"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const HEARTBEAT_MS = 25_000

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin"])
  if ("error" in admin) return admin.error

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false
      const send = (event: string, data: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
        } catch {
          // controller already closed mid-flight — ignore
        }
      }

      const channel = supabaseAdmin
        .channel(`admin-transfers-stream-${admin.uid}-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "admin_transfers" },
          (payload) => {
            const row: any = payload.new ?? payload.old ?? {}
            send("transfer-change", {
              type: payload.eventType,
              id: row.id,
              reference: row.reference,
              status: row.status,
            })
          },
        )
        .subscribe()

      const heartbeat = setInterval(() => {
        if (closed) return
        try { controller.enqueue(encoder.encode(`: heartbeat\n\n`)) } catch {}
      }, HEARTBEAT_MS)

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(heartbeat)
        supabaseAdmin.removeChannel(channel)
        try { controller.close() } catch {}
      }

      request.signal.addEventListener("abort", cleanup)
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
