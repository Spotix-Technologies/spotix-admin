"use client"

import { AlertCircle } from "lucide-react"

interface UserTicketsProps {
  tickets: any[]
  loading: boolean
  error: string | null
}

export function UserTicketsComponent({ tickets, loading, error }: UserTicketsProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error loading tickets</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="h-32 bg-slate-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-slate-600">No tickets found</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Event</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Type</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Price</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Purchase Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Reference</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Total Amount</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Fee</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {tickets.map((ticket, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-900 font-medium">{ticket.eventName || "-"}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{ticket.ticketType || "-"}</td>
                <td className="px-6 py-4 text-sm font-semibold text-emerald-600">₦{(ticket.ticketPrice || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {ticket.purchaseDate ? new Date(ticket.purchaseDate).toLocaleDateString() : "-"}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-mono text-xs">{ticket.ticketReference || "-"}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">₦{(ticket.totalAmount || 0).toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-slate-600">₦{(ticket.transactionFee || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          Showing {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"} (most recent 5)
        </p>
      </div>
    </div>
  )
}
