/**
 * GET /api/v1/event-data/passes?eventId=xxx
 *
 * Lists physical passes generated per agent for this event, for the
 * admin-facing "Passes" tab.
 *
 * Where these live: agents/{agentId}/{eventId}/{ticketId} — a subcollection
 * under the top-level `agents` collection, named after the literal eventId
 * string. Only exists for agents on a "pregenerated" pass config (booker's
 * Agent Requests -> ticket issuance panel); "unrestricted" agents have no
 * pool documents to show here, which is expected, not a bug.
 *
 * Access: role "admin", "customer-support", or "exec-assistant" — same as
 * the Event Data page itself.
 */
import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { verifyAdminAccess } from "@/lib/verify-admin"

const DEV = "API developed and maintained by Spotix Technologies"

function ok(data: object, status = 200) {
  return NextResponse.json({ success: true, developer: DEV, ...data }, { status })
}
function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error, developer: DEV }, { status })
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdminAccess(request, ["admin", "customer-support", "exec-assistant"])
  if ("error" in admin) return admin.error

  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get("eventId")?.trim()
  if (!eventId) return fail("eventId is required", 400)

  try {
    const requestsSnap = await adminDb
      .collection("agentRequests")
      .doc(eventId)
      .collection("agents")
      .where("status", "==", "accepted")
      .get()

    const agents = await Promise.all(
      requestsSnap.docs.map(async (reqDoc) => {
        const r = reqDoc.data()
        const passConfig = r.passConfig || null
        const mode: "pregenerated" | "unrestricted" | "unset" = passConfig?.mode || "unset"

        let tickets: { ticketId: string; ticketType: string; price: number; status: string }[] = []
        if (mode === "pregenerated") {
          const poolSnap = await adminDb.collection("agents").doc(r.agentId).collection(eventId).get()
          tickets = poolSnap.docs.map((d) => {
            const t = d.data()
            return {
              ticketId: d.id,
              ticketType: t.ticketType || "",
              price: t.price || 0,
              status: t.status || "available",
            }
          })
        }

        return {
          agentId: r.agentId,
          agentName: r.agentName || "",
          agentProfile: r.agentProfile || null,
          mode,
          tickets,
        }
      })
    )

    return ok({ agents })
  } catch (e: any) {
    console.error("[GET event-data/passes] failed", e)
    return fail("Failed to load passes", 500)
  }
}
