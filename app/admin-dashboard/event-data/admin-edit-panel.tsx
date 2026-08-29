"use client"

import { useState } from "react"
import { CheckCircle2, AlertCircle } from "lucide-react"
import EditEventSection from "./admin-edit/edit-event-section"
import DiscountsSection from "./admin-edit/discounts-section"
import type { DiscountEditUpdates } from "./admin-edit/discount-edit-dialog"
import type { DiscountData, DiscountDraft, EventLike } from "./admin-edit/types"

type Props = {
  event: EventLike
  discounts?: DiscountData[]
  onUpdate: (event: EventLike, discounts?: DiscountData[]) => void
}

export default function AdminEditPanel({ event, discounts = [], onUpdate }: Props) {
  const [form, setForm] = useState<EventLike>(event)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  const request = async (action: string, payload: Record<string, unknown>, withReason = true) => {
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/v1/event-data", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, action, ...(withReason ? { reason } : {}), ...payload }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Request failed")

      if (action === "editEvent") {
        const next = { ...form, ...payload } as EventLike
        setForm(next)
        onUpdate(next, discounts)
      } else if (action === "deleteDiscount") {
        onUpdate(event, discounts.filter((item) => item.id !== payload.discountId))
      } else if (json.discount) {
        onUpdate(event, [...discounts.filter((item) => item.id !== json.discount.id), json.discount])
      }

      setMessage({ text: "Saved successfully", error: false })
      if (withReason) setReason("")
      return true
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Request failed", error: true })
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveEvent = () =>
    request("editEvent", {
      eventName: form.eventName,
      eventDescription: form.eventDescription,
      eventDate: form.eventDate,
      eventEndDate: form.eventEndDate,
      eventStart: form.eventStart,
      eventEnd: form.eventEnd,
      eventVenue: form.eventVenue,
      eventType: form.eventType,
      isFree: form.isFree,
      ticketPrices: form.ticketPrices,
    })

  const createDiscount = (draft: DiscountDraft) =>
    request(
      "addDiscount",
      {
        code: draft.code,
        type: draft.type,
        value: Number(draft.value),
        maxUses: Number(draft.maxUses) || 1,
        expiryDate: draft.expiryDate ? new Date(draft.expiryDate).toISOString() : null,
        applicableTickets: draft.applicableTickets.length ? draft.applicableTickets : null,
      },
      false,
    )

  const toggleDiscount = (discount: DiscountData) =>
    request("toggleDiscount", { discountId: discount.id }, false)

  const deleteDiscount = (discount: DiscountData) =>
    request("deleteDiscount", { discountId: discount.id }, false)

  const editDiscount = (discountId: string, updates: DiscountEditUpdates) =>
    request("editDiscount", { discountId, ...updates }, false)

  // Ticket prices as { policy, numeric price } for discount-value validation
  const ticketPricesNumeric = form.ticketPrices.map((t) => ({ policy: t.policy, price: Number(t.price) || 0 }))
  const ticketPolicies = form.ticketPrices.map((t) => t.policy).filter(Boolean)

  return (
    <div className="space-y-8">
      {message && (
        <div
          className={`flex items-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold ${
            message.error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"
          }`}
        >
          {message.error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {message.text}
        </div>
      )}

      <EditEventSection form={form} setForm={setForm} reason={reason} setReason={setReason} saving={saving} onSave={saveEvent} />

      <section>
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900">Discounts</h3>
          <p className="text-sm text-slate-500">
            Create, edit, toggle, or remove discount codes for this event. Discount changes don&apos;t require an audit reason.
          </p>
        </div>
        <DiscountsSection
          discounts={discounts}
          ticketPolicies={ticketPolicies}
          ticketPrices={ticketPricesNumeric}
          saving={saving}
          onCreate={createDiscount}
          onToggle={toggleDiscount}
          onDelete={deleteDiscount}
          onEdit={editDiscount}
        />
      </section>
    </div>
  )
}
