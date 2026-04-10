"use client"

import type { UserTicket } from "@/app/api/v1/users/[email]/tickets/route"
import { AlertCircle } from "lucide-react"

interface UserTicketsProps {
  tickets: UserTicket[]
  loading: boolean
  error: string | null
}

export function UserTicketsComponent({
  tickets,
  loading,
  error,
}: UserTicketsProps) {
  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      active: { bg: "bg-green-100", text: "text-green-700" },
      used: { bg: "bg-blue-100", text: "text-blue-700" },
      cancelled: { bg: "bg-red-100", text: "text-red-700" },
    }

    const style = styles[status] || styles.active

    return (
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${style.bg} ${style.text}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">Tickets</h3>
      </div>

      {loading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-6 text-center text-slate-600">
          <p className="text-sm">No tickets purchased yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Event</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Price</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Purchased</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.ticketId}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                    {ticket.eventName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {ticket.ticketTier}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {ticket.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-600">
                    ₦{ticket.price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(ticket.purchasedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {getStatusBadge(ticket.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
