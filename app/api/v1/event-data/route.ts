import { type NextRequest, NextResponse } from "next/server"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"
import { verifyAdminAccess } from "@/lib/verify-admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEV_TAG = "API developed and maintained by Spotix Technologies"

function jsonSafe(value: unknown): unknown {
  if (value === undefined) return null
  if (value && typeof value === "object" && "toDate" in value && typeof (value as any).toDate === "function") return (value as any).toDate().toISOString()
  try { return JSON.parse(JSON.stringify(value)) } catch { return String(value) }
}
function diffEventFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...fields].reduce<Record<string, { before: unknown; after: unknown }>>((out, field) => {
    if (field === "updatedAt") return out
    const oldValue = jsonSafe(before[field]); const newValue = jsonSafe(after[field])
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) out[field] = { before: oldValue, after: newValue }
    return out
  }, {})
}
async function eventDocData(eventRef: FirebaseFirestore.DocumentReference) {
  return (await eventRef.get()).data() || {}
}
// Discount actions (addDiscount/editDiscount/toggleDiscount/deleteDiscount) don't
// require a `reason`, so it can arrive as `undefined` — Firestore rejects
// `undefined` values outright, so normalize it to `null` before any write.
function safeReason(reason: unknown): string | null {
  return typeof reason === "string" && reason.trim() ? reason : null
}




/* ─────────────────────────────────────────────
   GET
   ?action=search&term=       → suggestions (5+ chars)
   ?action=getEventDetails&eventId=  → full doc
───────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdminAccess(request)
    if ("error" in adminResult) {
      const response = adminResult.error as NextResponse
      const json = await response.json() as any
      return NextResponse.json({ error: json.error || "Forbidden: admin access required", developer: DEV_TAG }, { status: response.status })
    }

    

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "listRecent") {
  const snap = await adminDb
    .collection("events")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get()

  const results = snap.docs.map((doc) => {
    const d = doc.data()
    return {
      eventId: doc.id,
      eventName: d.eventName || "Untitled",
      eventImage: d.eventImage || "",
      status: d.status || "active",
      organizerId: d.organizerId || "",
    }
  })

  return NextResponse.json({ success: true, data: results, developer: DEV_TAG }, { status: 200 })
}

    /* SEARCH SUGGESTIONS */
    if (action === "search") {
      const term = searchParams.get("term")?.trim()
      if (!term || term.length < 5) {
        return NextResponse.json({ success: true, data: [] }, { status: 200 })
      }

      const results: Array<{
        eventId: string
        eventName: string
        eventImage: string
        status: string
        organizerId: string
      }> = []

      // Exact eventId lookup
      const byId = await adminDb.collection("events").doc(term).get()
      if (byId.exists) {
        const d = byId.data()!
        results.push({
          eventId: byId.id,
          eventName: d.eventName || "Untitled",
          eventImage: d.eventImage || "",
          status: d.status || "active",
          organizerId: d.organizerId || "",
        })
      }

      // Name prefix query
      const nameSnap = await adminDb
        .collection("events")
        .orderBy("eventName")
        .startAt(term)
        .endAt(term + "\uf8ff")
        .limit(8)
        .get()

      for (const doc of nameSnap.docs) {
        if (results.find((r) => r.eventId === doc.id)) continue
        const d = doc.data()
        results.push({
          eventId: doc.id,
          eventName: d.eventName || "Untitled",
          eventImage: d.eventImage || "",
          status: d.status || "active",
          organizerId: d.organizerId || "",
        })
      }

      return NextResponse.json({ success: true, data: results.slice(0, 8), developer: DEV_TAG }, { status: 200 })
    }

    /* EVENT DETAILS */
    if (action === "getEventDetails") {
      const eventId = searchParams.get("eventId")
      if (!eventId) {
        return NextResponse.json({ error: "eventId required", developer: DEV_TAG }, { status: 400 })
      }

      const eventDoc = await adminDb.collection("events").doc(eventId).get()
      if (!eventDoc.exists) {
        return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
      }

      const d = eventDoc.data()!
      const eventRef = adminDb.collection("events").doc(eventId)
      const attendeesSnap = await eventRef.collection("attendees").get()
      const discountsSnap = await eventRef.collection("discounts").get()
      const historySnap = await eventRef.collection("editHistory").orderBy("createdAt", "desc").limit(50).get()

      return NextResponse.json({
        success: true,
        data: {
          id: eventId,
          eventName: d.eventName || "",
          eventDescription: d.eventDescription || "",
          eventImage: d.eventImage || "",
          eventImages: d.eventImages || [],
          eventDate: d.eventDate || "",
          eventEndDate: d.eventEndDate || "",
          eventStart: d.eventStart || "",
          eventEnd: d.eventEnd || "",
          eventVenue: d.eventVenue || "",
          venueCoordinates: d.venueCoordinates || null,
          eventType: d.eventType || "",
          isFree: d.isFree ?? false,
          ticketPrices: d.ticketPrices || [],
          ticketsSold: d.ticketsSold ?? attendeesSnap.size,
          revenue: d.revenue ?? 0,
          totalRevenue: d.totalRevenue ?? 0,
          paidAmount: d.paidAmount ?? 0,
          totalPaidOut: d.totalPaidOut ?? 0,
          likeCount: d.likeCount ?? 0,
          status: d.status || "active",
          flagged: d.flagged ?? false,
          suspended: d.suspended ?? false,
          organizerId: d.organizerId || "",
          affiliateId: d.affiliateId || null,
          affiliateName: d.affiliateName || null,
          allowAgents: d.allowAgents ?? false,
          virtualQueueEnabled: d.virtualQueueEnabled ?? false,
          queueBatchSize: d.queueBatchSize ?? 50,
          queueSessionTTL: d.queueSessionTTL ?? 480,
          enabledCollaboration: d.enabledCollaboration ?? false,
          hasStopDate: d.hasStopDate ?? false,
          stopDate: d.stopDate || null,
          // Admin-editable platform fee overrides for this event. Raw values
          // as stored — null means "not set", which the checkout resolves as:
          // percentage → system default (5%), flat fee → ₦0 (NOT the ₦100
          // default; an unset flat fee means one was deliberately not added).
          platformPercentageFee:
            typeof d.platformPercentageFee === "number" ? d.platformPercentageFee : null,
          platformFlatFee: typeof d.platformFlatFee === "number" ? d.platformFlatFee : null,
          createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
          attendeeCount: attendeesSnap.size,
          discounts: discountsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
          editHistory: historySnap.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null })),
        },
        developer: DEV_TAG,
      }, { status: 200 })
    }

    return NextResponse.json({ error: "Invalid action or missing parameters", developer: DEV_TAG }, { status: 400 })
  } catch (error) {
    console.error("GET /api/v1/event-data error:", error)
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : "Unknown", developer: DEV_TAG },
      { status: 500 },
    )
  }
}

/* ─────────────────────────────────────────────
   PATCH — flag | setStatus | suspend
   Body: { eventId, action, reason, ...payload }
───────────────────────────────────────────── */
export async function PATCH(request: NextRequest) {
  try {
    // flag/setStatus/suspend all modify the event's account-facing stats —
    // restricted to full admins only (enforced per-action below).
    // toggleQueue is an operational traffic-management toggle, not a
    // punitive moderation action, so customer-support can reach it too —
    // gate widened here, then narrowed back down per-action.
    const adminResult = await verifyAdminAccess(request, ["admin", "customer-support"])
    if ("error" in adminResult) {
      const response = adminResult.error as NextResponse
      const json = await response.json() as any
      return NextResponse.json({ error: json.error || "Forbidden: admin access required", developer: DEV_TAG }, { status: response.status })
    }
    const admin = adminResult
    const isFullAdmin = admin.role === "admin" || admin.secondaryRoles.includes("admin")

    const body = await request.json()
    const { eventId, action, reason } = body

    if (!eventId || !action) {
      return NextResponse.json({ error: "eventId and action are required", developer: DEV_TAG }, { status: 400 })
    }

    if (["flag", "setStatus", "suspend", "updatePricing"].includes(action) && !isFullAdmin) {
      return NextResponse.json({ error: "Forbidden: admin access required", developer: DEV_TAG }, { status: 403 })
    }
    const requiresReason = action !== "addDiscount" && action !== "editDiscount" && action !== "toggleDiscount" && action !== "deleteDiscount"
    if (requiresReason && !reason?.trim()) {
      return NextResponse.json({ error: "A reason is required for event changes", developer: DEV_TAG }, { status: 400 })
    }

    const eventRef = adminDb.collection("events").doc(eventId)
    if (!(await eventRef.get()).exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
    }

    const auditEntry = {
      adminUid: admin.uid,
      adminUsername: admin.username,
      reason,
      timestamp: new Date().toISOString(),
      action,
    }

    if (action === "editEvent") {
      const editableFields = ["eventName", "eventDescription", "eventDate", "eventEndDate", "eventStart", "eventEnd", "eventVenue", "eventType", "isFree", "ticketPrices", "hasStopDate", "stopDate"]
      const before = await eventDocData(eventRef)
      const updates: Record<string, unknown> = {}
      for (const field of editableFields) if (Object.prototype.hasOwnProperty.call(body, field)) updates[field] = body[field]
      if (typeof updates.eventName !== "undefined" && !(updates.eventName as string)?.trim()) return NextResponse.json({ error: "eventName is required", developer: DEV_TAG }, { status: 400 })
      if (updates.ticketPrices !== undefined && !Array.isArray(updates.ticketPrices)) return NextResponse.json({ error: "ticketPrices must be an array", developer: DEV_TAG }, { status: 400 })
      updates.updatedAt = new Date()
      const after = { ...before, ...updates }
      const changes = diffEventFields(before, after)
      await eventRef.firestore.runTransaction(async (transaction) => {
        transaction.update(eventRef, updates)
        if (Object.keys(changes).length) transaction.create(eventRef.collection("editHistory").doc(), { action: "event_updated", actor: { uid: admin.uid, type: "Spotix", role: admin.role, username: admin.username }, reason, changes, createdAt: FieldValue.serverTimestamp() })
      })
      return NextResponse.json({ success: true, message: "Event updated", data: updates, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "addDiscount" || action === "editDiscount" || action === "toggleDiscount" || action === "deleteDiscount") {
      const discountRef = body.discountId ? eventRef.collection("discounts").doc(body.discountId) : null
      if (action === "addDiscount") {
        if (!body.code?.trim() || !["percentage", "flat"].includes(body.type) || !Number.isFinite(Number(body.value))) return NextResponse.json({ error: "Valid code, type, and value are required", developer: DEV_TAG }, { status: 400 })
        const ref = eventRef.collection("discounts").doc()
        const discount = { code: body.code.trim().toUpperCase(), type: body.type, value: Number(body.value), maxUses: Number(body.maxUses) || 1, usedCount: 0, active: body.active !== false, expiryDate: body.expiryDate || null, applicableTickets: body.applicableTickets || null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
        await ref.set(discount)
        await eventRef.collection("editHistory").add({ action: "discount_created", actor: { uid: admin.uid, type: "Spotix", role: admin.role, username: admin.username }, reason: safeReason(reason), changes: { [ref.id]: { before: null, after: { code: discount.code, type: discount.type, value: discount.value, maxUses: discount.maxUses, active: discount.active, expiryDate: discount.expiryDate, applicableTickets: discount.applicableTickets } } }, createdAt: FieldValue.serverTimestamp() })
        return NextResponse.json({ success: true, discount: { id: ref.id, ...discount }, developer: DEV_TAG }, { status: 201 })
      }
      if (!body.discountId) return NextResponse.json({ error: "discountId required", developer: DEV_TAG }, { status: 400 })
      if (!discountRef) return NextResponse.json({ error: "discountId required", developer: DEV_TAG }, { status: 400 })
      const snap = await discountRef.get()
      if (!snap.exists) return NextResponse.json({ error: "Discount not found", developer: DEV_TAG }, { status: 404 })
      const before = snap.data() || {}
      if (action === "deleteDiscount") {
        await discountRef.delete()
        await eventRef.collection("editHistory").add({ action: "discount_deleted", actor: { uid: admin.uid, type: "Spotix", role: admin.role, username: admin.username }, reason: safeReason(reason), changes: { [body.discountId]: { before, after: null } }, createdAt: FieldValue.serverTimestamp() })
        return NextResponse.json({ success: true, deleted: body.discountId, developer: DEV_TAG }, { status: 200 })
      }
      const updates = action === "toggleDiscount" ? { active: before.active === false, updatedAt: new Date() } : { ...(body.code !== undefined ? { code: String(body.code).trim().toUpperCase() } : {}), ...(body.type !== undefined ? { type: body.type } : {}), ...(body.value !== undefined ? { value: Number(body.value) } : {}), ...(body.maxUses !== undefined ? { maxUses: Number(body.maxUses) } : {}), ...(body.expiryDate !== undefined ? { expiryDate: body.expiryDate || null } : {}), ...(body.applicableTickets !== undefined ? { applicableTickets: body.applicableTickets || null } : {}), updatedAt: new Date() }
      const changes = diffEventFields(before, { ...before, ...updates })
      await discountRef.update(updates)
      await eventRef.collection("editHistory").add({ action: action === "toggleDiscount" ? "discount_toggled" : "discount_updated", actor: { uid: admin.uid, type: "Spotix", role: admin.role, username: admin.username }, reason: safeReason(reason), changes, createdAt: FieldValue.serverTimestamp() })
      return NextResponse.json({ success: true, discount: { id: snap.id, ...before, ...updates }, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "flag") {
      const { flagged } = body
      if (typeof flagged !== "boolean") {
        return NextResponse.json({ error: "flagged (boolean) required", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({ flagged, updatedAt: new Date(), flagAudit: FieldValue.arrayUnion({ ...auditEntry, flagged }) })
      return NextResponse.json({ success: true, message: `Event ${flagged ? "flagged" : "unflagged"}`, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "setStatus") {
      const { status } = body
      if (!["active", "inactive"].includes(status)) {
        return NextResponse.json({ error: "status must be 'active' or 'inactive'", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({ status, updatedAt: new Date(), statusAudit: FieldValue.arrayUnion({ ...auditEntry, status }) })
      return NextResponse.json({ success: true, message: `Event set to ${status}`, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "suspend") {
      const { suspended } = body
      if (typeof suspended !== "boolean") {
        return NextResponse.json({ error: "suspended (boolean) required", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({ suspended, updatedAt: new Date(), suspendAudit: FieldValue.arrayUnion({ ...auditEntry, suspended }) })
      return NextResponse.json({ success: true, message: `Event ${suspended ? "suspended" : "unsuspended"}`, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "toggleQueue") {
      const { virtualQueueEnabled } = body
      if (typeof virtualQueueEnabled !== "boolean") {
        return NextResponse.json({ error: "virtualQueueEnabled (boolean) required", developer: DEV_TAG }, { status: 400 })
      }
      await eventRef.update({
        virtualQueueEnabled,
        updatedAt: new Date(),
        queueAudit: FieldValue.arrayUnion({ ...auditEntry, virtualQueueEnabled }),
      })
      return NextResponse.json({ success: true, message: `Virtual queue ${virtualQueueEnabled ? "enabled" : "disabled"}`, developer: DEV_TAG }, { status: 200 })
    }

    if (action === "updateQueueConfig") {
      const { queueBatchSize, queueWaitMinutes } = body
      const batchSize = Number(queueBatchSize)
      const waitMinutes = Number(queueWaitMinutes)

      if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
        return NextResponse.json({ error: "queueBatchSize must be a whole number between 1 and 5000", developer: DEV_TAG }, { status: 400 })
      }
      if (!Number.isInteger(waitMinutes) || waitMinutes < 1 || waitMinutes > 60) {
        return NextResponse.json({ error: "queueWaitMinutes must be a whole number between 1 and 60", developer: DEV_TAG }, { status: 400 })
      }

      const queueSessionTTL = waitMinutes * 60 // spotix-backend's queue reads this in seconds

      await eventRef.update({
        queueBatchSize: batchSize,
        queueSessionTTL,
        updatedAt: new Date(),
        queueConfigAudit: FieldValue.arrayUnion({ ...auditEntry, queueBatchSize: batchSize, queueSessionTTL }),
      })
      return NextResponse.json({
        success: true,
        message: `Queue settings updated — ${batchSize} admitted at a time, ${waitMinutes} min to check out`,
        developer: DEV_TAG,
      }, { status: 200 })
    }

    if (action === "updatePricing") {
      // platformPercentageFee: whole percent, 0-100 (e.g. 5 = 5%).
      // platformFlatFee: naira amount, >= 0.
      // Either can be sent as `null` to clear the override and fall back to
      // the checkout's own defaults (5% / ₦0 respectively — see priceUtility.ts
      // in spotix-user) instead of writing a literal number.
      const { platformPercentageFee, platformFlatFee } = body

      const pct = platformPercentageFee === null || platformPercentageFee === undefined
        ? null
        : Number(platformPercentageFee)
      const flat = platformFlatFee === null || platformFlatFee === undefined
        ? null
        : Number(platformFlatFee)

      if (pct !== null && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
        return NextResponse.json({ error: "platformPercentageFee must be a number between 0 and 100", developer: DEV_TAG }, { status: 400 })
      }
      if (flat !== null && (!Number.isFinite(flat) || flat < 0)) {
        return NextResponse.json({ error: "platformFlatFee must be a number of 0 or more", developer: DEV_TAG }, { status: 400 })
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        pricingAudit: FieldValue.arrayUnion({ ...auditEntry, platformPercentageFee: pct, platformFlatFee: flat }),
      }
      updates.platformPercentageFee = pct === null ? FieldValue.delete() : pct
      updates.platformFlatFee = flat === null ? FieldValue.delete() : flat

      await eventRef.update(updates)
      return NextResponse.json({
        success: true,
        message: "Platform fee updated for this event",
        platformPercentageFee: pct,
        platformFlatFee: flat,
        developer: DEV_TAG,
      }, { status: 200 })
    }

    return NextResponse.json({ error: "Unknown action", developer: DEV_TAG }, { status: 400 })
  } catch (error) {
    console.error("PATCH /api/v1/event-data error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV_TAG }, { status: 500 })
  }
}

/* ─────────────────────────────────────────────
   DELETE — soft-delete → deletedEvents/
   Body: { eventId, reason }
───────────────────────────────────────────── */
export async function DELETE(request: NextRequest) {
  try {
    // Soft-deleting an event is an account-modifying action — admin only.
    const adminResult = await verifyAdminAccess(request, ["admin"])
    if ("error" in adminResult) {
      const response = adminResult.error as NextResponse
      const json = await response.json() as any
      return NextResponse.json({ error: json.error || "Forbidden: admin access required", developer: DEV_TAG }, { status: response.status })
    }
    const admin = adminResult

    const body = await request.json()
    const { eventId, reason } = body

    if (!eventId) return NextResponse.json({ error: "eventId required", developer: DEV_TAG }, { status: 400 })
    if (!reason?.trim()) return NextResponse.json({ error: "A reason is required for deletion", developer: DEV_TAG }, { status: 400 })

    const eventRef = adminDb.collection("events").doc(eventId)
    const eventDoc = await eventRef.get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: "Event not found", developer: DEV_TAG }, { status: 404 })
    }

    await adminDb.collection("deletedEvents").doc(eventId).set({
      ...eventDoc.data()!,
      deletedAt: new Date().toISOString(),
      deletedBy: { adminUid: admin.uid, adminUsername: admin.username },
      deletionReason: reason,
      originalEventId: eventId,
    })

    await eventRef.delete()

    return NextResponse.json({ success: true, message: "Event moved to deletedEvents", developer: DEV_TAG }, { status: 200 })
  } catch (error) {
    console.error("DELETE /api/v1/event-data error:", error)
    return NextResponse.json({ error: "Internal Server Error", developer: DEV_TAG }, { status: 500 })
  }
}
