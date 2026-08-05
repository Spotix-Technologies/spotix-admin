"use client"

import { useEffect, useState } from "react"
import QRCode from "react-qr-code"
import { Loader2, AlertCircle, Ticket, Download, ChevronDown, ChevronUp, UserCircle2 } from "lucide-react"

interface PassTicket {
  ticketId: string
  ticketType: string
  price: number
  status: string
}

interface AgentPasses {
  agentId: string
  agentName: string
  agentProfile: string | null
  mode: "pregenerated" | "unrestricted" | "unset"
  tickets: PassTicket[]
}

interface Props {
  eventId: string
  eventName: string
}

const STATUS_STYLES: Record<string, string> = {
  available: "bg-slate-100 text-slate-600",
  reserved: "bg-amber-100 text-amber-700",
  sold: "bg-emerald-100 text-emerald-700",
}

export default function PassesTab({ eventId, eventName }: Props) {
  const [agents, setAgents] = useState<AgentPasses[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    fetch(`/api/v1/event-data/passes?eventId=${eventId}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return
        if (!json.success) throw new Error(json.error)
        setAgents(json.agents)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Failed to load passes"))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [eventId])

  const handleDownload = async (agent: AgentPasses) => {
    setDownloading(agent.agentId)
    try {
      const { default: jsPDF } = await import("jspdf")
      const QRCodeLib = await import("qrcode")

      const doc = new jsPDF({ unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 40
      const cardWidth = (pageWidth - margin * 3) / 2
      const cardHeight = 220
      let x = margin
      let y = margin

      doc.setFontSize(16)
      doc.text(`${eventName} — Physical Passes`, margin, y)
      doc.setFontSize(11)
      doc.text(`Agent: ${agent.agentName} (${agent.agentId})`, margin, y + 18)
      y += 45

      for (let i = 0; i < agent.tickets.length; i++) {
        const ticket = agent.tickets[i]
        const qrDataUrl = await QRCodeLib.toDataURL(ticket.ticketId, { margin: 1, width: 160 })

        if (y + cardHeight > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          y = margin
        }

        doc.setDrawColor(220)
        doc.roundedRect(x, y, cardWidth, cardHeight, 8, 8)
        doc.addImage(qrDataUrl, "PNG", x + cardWidth / 2 - 60, y + 15, 120, 120)
        doc.setFontSize(9)
        doc.text(ticket.ticketType || "General", x + cardWidth / 2, y + 150, { align: "center" })
        doc.setFontSize(8)
        doc.text(ticket.ticketId, x + cardWidth / 2, y + 165, { align: "center", maxWidth: cardWidth - 20 })
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(ticket.status.toUpperCase(), x + cardWidth / 2, y + 180, { align: "center" })
        doc.setTextColor(0)

        if (i % 2 === 0) {
          x += cardWidth + margin
        } else {
          x = margin
          y += cardHeight + 20
        }
      }

      doc.save(`${eventName.replace(/[^a-z0-9]/gi, "_")}_${agent.agentName.replace(/[^a-z0-9]/gi, "_")}_passes.pdf`)
    } catch (e) {
      console.error("PDF generation failed:", e)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading passes...
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 flex items-center gap-2 px-1">
        <AlertCircle className="w-4 h-4" /> {error}
      </p>
    )
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
        <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No agents have been accepted for this event yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {agents.map((agent) => (
        <div key={agent.agentId} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                {agent.agentProfile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.agentProfile} alt={agent.agentName} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{agent.agentName || "Unnamed agent"}</p>
                <p className="text-xs text-gray-400 font-mono">{agent.agentId}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {agent.mode === "unrestricted" && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  Unrestricted — no pool
                </span>
              )}
              {agent.mode === "unset" && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  Not configured
                </span>
              )}
              {agent.mode === "pregenerated" && (
                <>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#6b2fa5]/10 text-[#6b2fa5]">
                    {agent.tickets.length} pass{agent.tickets.length === 1 ? "" : "es"}
                  </span>
                  <button
                    onClick={() => handleDownload(agent)}
                    disabled={downloading === agent.agentId || agent.tickets.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6b2fa5] text-white text-xs font-semibold hover:bg-[#5a2589] disabled:opacity-50 transition-colors"
                  >
                    {downloading === agent.agentId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    PDF
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === agent.agentId ? null : agent.agentId)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"
                  >
                    {expanded === agent.agentId ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </>
              )}
            </div>
          </div>

          {agent.mode === "pregenerated" && expanded === agent.agentId && (
            <div className="border-t border-slate-100 p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50">
              {agent.tickets.map((ticket) => (
                <div key={ticket.ticketId} className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col items-center gap-2">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-100">
                    <QRCode value={ticket.ticketId} size={90} level="M" fgColor="#6b2fa5" bgColor="#ffffff" />
                  </div>
                  <p className="text-[10px] font-mono text-slate-600 text-center break-all">{ticket.ticketId}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[ticket.status] || "bg-slate-100 text-slate-600"}`}>
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
