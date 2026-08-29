"use client"

import { Calendar, Clock, MapPin, Tag, FileText, Ticket, DollarSign, Users, Plus, X, ShieldAlert } from "lucide-react"
import type { EventLike, TicketTier } from "./types"

interface EditEventSectionProps {
  form: EventLike
  setForm: (updater: (current: EventLike) => EventLike) => void
  reason: string
  setReason: (value: string) => void
  saving: boolean
  onSave: () => void
}

const EVENT_TYPES = ["Music", "Sports", "Arts", "Technology", "Business", "Education", "Other"]

export default function EditEventSection({ form, setForm, reason, setReason, saving, onSave }: EditEventSectionProps) {
  const updateTicket = (index: number, key: keyof TicketTier, value: string) =>
    setForm((current) => ({
      ...current,
      ticketPrices: current.ticketPrices.map((ticket, i) => (i === index ? { ...ticket, [key]: value } : ticket)),
    }))

  const addTicket = () =>
    setForm((current) => ({
      ...current,
      ticketPrices: [...current.ticketPrices, { policy: "", price: "", description: "", availableTickets: "" }],
    }))

  const removeTicket = (index: number) =>
    setForm((current) => ({ ...current, ticketPrices: current.ticketPrices.filter((_, i) => i !== index) }))

  return (
    <div className="space-y-6">
      {/* Event Bio-Data */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-[#6b2fa5] to-[#8b4fc5] rounded-lg">
            <FileText size={20} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Event Bio-Data</h3>
        </div>

        <div className="space-y-5">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Tag size={16} className="text-[#6b2fa5]" />
              Event Name
            </label>
            <input
              type="text"
              value={form.eventName}
              onChange={(e) => setForm((current) => ({ ...current, eventName: e.target.value }))}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <FileText size={16} className="text-[#6b2fa5]" />
              Event Description
            </label>
            <textarea
              value={form.eventDescription}
              onChange={(e) => setForm((current) => ({ ...current, eventDescription: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200 resize-none"
              placeholder="Describe the event..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={16} className="text-[#6b2fa5]" />
                Event Date
              </label>
              <input
                type="date"
                value={form.eventDate}
                onChange={(e) => setForm((current) => ({ ...current, eventDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <MapPin size={16} className="text-[#6b2fa5]" />
                Event Venue
              </label>
              <input
                type="text"
                value={form.eventVenue}
                onChange={(e) => setForm((current) => ({ ...current, eventVenue: e.target.value }))}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={16} className="text-[#6b2fa5]" />
                End Date
              </label>
              <input
                type="date"
                value={form.eventEndDate}
                onChange={(e) => setForm((current) => ({ ...current, eventEndDate: e.target.value }))}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Clock size={16} className="text-[#6b2fa5]" />
                Start Time
              </label>
              <input
                type="time"
                value={form.eventStart}
                onChange={(e) => setForm((current) => ({ ...current, eventStart: e.target.value }))}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Clock size={16} className="text-[#6b2fa5]" />
                End Time
              </label>
              <input
                type="time"
                value={form.eventEnd}
                onChange={(e) => setForm((current) => ({ ...current, eventEnd: e.target.value }))}
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
              <Tag size={16} className="text-[#6b2fa5]" />
              Event Category
            </label>
            <select
              value={form.eventType}
              onChange={(e) => setForm((current) => ({ ...current, eventType: e.target.value }))}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
            >
              <option value="">Select a category</option>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Pricing */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-gradient-to-br from-[#6b2fa5] to-[#8b4fc5] rounded-lg">
            <Ticket size={20} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Ticket Pricing</h3>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <input
            type="checkbox"
            checked={!form.isFree}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                isFree: !e.target.checked,
                ticketPrices: e.target.checked && current.ticketPrices.length === 0
                  ? [{ policy: "", price: "", description: "", availableTickets: "" }]
                  : current.ticketPrices,
              }))
            }
            className="w-5 h-5 rounded border-2 border-slate-300 text-[#6b2fa5] focus:ring-2 focus:ring-[#6b2fa5]/20 cursor-pointer"
          />
          <label className="text-sm font-semibold text-slate-700 cursor-pointer select-none">Enable Paid Ticketing</label>
        </div>

        {form.isFree ? (
          <div className="p-5 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm"><Ticket size={20} className="text-green-600" /></div>
              <div>
                <p className="text-sm font-bold text-green-800">FREE EVENT</p>
                <p className="text-xs text-green-700">Attendees can get tickets without payment</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {form.ticketPrices.map((ticket, index) => (
              <div key={index} className="p-5 border-2 border-slate-200 rounded-xl bg-gradient-to-br from-white to-slate-50 hover:shadow-md transition-all duration-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#6b2fa5] to-[#8b4fc5] rounded-lg flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <h4 className="font-bold text-slate-900">Ticket Type {index + 1}</h4>
                    {typeof ticket.ticketsSold === "number" && (
                      <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">
                        {ticket.ticketsSold} sold
                      </span>
                    )}
                  </div>
                  {form.ticketPrices.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicket(index)}
                      className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all duration-200 hover:scale-110 active:scale-95"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <Ticket size={16} className="text-[#6b2fa5]" />
                      Ticket Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Early Bird, VIP, General Admission"
                      value={ticket.policy}
                      onChange={(e) => updateTicket(index, "policy", e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                      <DollarSign size={16} className="text-[#6b2fa5]" />
                      Price (₦)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0 for free ticket"
                      value={ticket.price}
                      onChange={(e) => updateTicket(index, "price", e.target.value)}
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <Users size={16} className="text-[#6b2fa5]" />
                    Available Tickets
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Enter number of tickets available"
                    value={String(ticket.availableTickets ?? ticket.availability ?? "")}
                    onChange={(e) => updateTicket(index, "availableTickets", e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                    <FileText size={16} className="text-[#6b2fa5]" />
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what this ticket includes"
                    value={ticket.description ?? ""}
                    onChange={(e) => updateTicket(index, "description", e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addTicket}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-700 font-semibold hover:border-[#6b2fa5] hover:bg-[#6b2fa5]/5 hover:text-[#6b2fa5] transition-all duration-200"
            >
              <Plus size={20} />
              Add Another Ticket Type
            </button>
          </div>
        )}
      </div>

      {/* Audit reason + Save */}
      <div className="bg-white rounded-xl border-2 border-slate-200 p-6 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
          <ShieldAlert size={16} className="text-[#6b2fa5]" />
          Reason for change <span className="font-normal text-slate-400">(required — logged to this event's edit history)</span>
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this being changed?"
          className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6b2fa5] focus:ring-4 focus:ring-[#6b2fa5]/10 transition-all duration-200"
        />
        <button
          type="button"
          disabled={saving || !reason.trim() || !form.eventName.trim()}
          onClick={onSave}
          className="mt-4 w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-[#6b2fa5] to-[#8b4fc5] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-[#6b2fa5]/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
        >
          💾 Save Event Changes
        </button>
      </div>
    </div>
  )
}
