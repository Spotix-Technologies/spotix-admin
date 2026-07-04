"use client"

import { useState } from "react"
import {
  Search, Loader2, AlertCircle, CheckCircle, Flag, ShieldAlert,
  ShieldCheck, Trash2, RotateCcw, Trophy, Users, Wallet, Calendar,
  ImageIcon, ExternalLink,
} from "lucide-react"

interface Contestant {
  contestantId?: string
  name: string
  image?: string
  votes: number
}

interface PollData {
  pollType: "single" | "group"
  pollName: string
  pollImage: string
  pollDescription: string
  pollStartDate?: string
  pollStartTime?: string
  pollEndDate?: string
  pollEndTime?: string
  pollAmount: number
  pollCount: number
  pollPrice?: number
  contestants: Contestant[]
  categories: any[]
  status: string
  suspended: boolean
  flagged: boolean
  creatorId: string
  organizerId: string
  createdAt: string
  deletedAt?: string
  deletedBy?: string
}

interface Stats {
  totalVotes: number
  leaderboard: { name: string; votes: number; image?: string }[]
}

type Action = "flag" | "unflag" | "suspend" | "unsuspend" | "delete" | "restore"

export function VotesClient() {
  const [pollId, setPollId] = useState("")
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<Action | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [poll, setPoll] = useState<PollData | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null)

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const handleLookup = async () => {
    if (!pollId.trim()) return
    setLoading(true); setError(null); setPoll(null); setStats(null); setConfirmDelete(false)
    try {
      const res = await fetch(`/api/v1/admin-polls?pollId=${encodeURIComponent(pollId.trim())}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPoll(json.poll)
      setStats(json.stats)
      setDeleted(json.deleted)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poll not found")
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: Action) => {
    if (!poll) return
    setActing(action)
    try {
      const res = await fetch("/api/v1/admin-polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: pollId.trim(), action }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      showToast(json.message || "Done", "success")
      setConfirmDelete(false)
      await handleLookup()
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Action failed", "error")
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 pb-12 space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium ${toast.type === "success" ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Voting Control</h1>
        <p className="text-gray-500 mt-1 text-sm">Look up any poll by ID to review, flag, suspend, or delete it</p>
      </div>

      {/* Lookup */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-2">
        <input
          type="text"
          value={pollId}
          onChange={(e) => setPollId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
          placeholder="Enter poll ID"
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30 focus:border-[#6b2fa5] font-mono"
        />
        <button
          onClick={handleLookup}
          disabled={!pollId.trim() || loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#6b2fa5] text-white font-semibold text-sm rounded-xl hover:bg-[#5a2589] disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Look up
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 flex items-center gap-2 px-1">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}

      {poll && stats && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="relative h-40 bg-slate-100">
            {poll.pollImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={poll.pollImage} alt={poll.pollName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <ImageIcon className="w-10 h-10" />
              </div>
            )}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {deleted && <Badge color="gray">Deleted</Badge>}
              {poll.flagged && <Badge color="amber">Flagged</Badge>}
              {poll.suspended && <Badge color="red">Suspended</Badge>}
              {!deleted && !poll.suspended && <Badge color="emerald">{poll.status}</Badge>}
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{poll.pollName}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{poll.pollDescription}</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatCard icon={<Users className="w-4 h-4" />} label="Votes cast" value={poll.pollCount ?? stats.totalVotes} />
              <StatCard icon={<Wallet className="w-4 h-4" />} label="Revenue" value={`₦${Number(poll.pollAmount ?? 0).toLocaleString("en-NG")}`} />
              <StatCard icon={<Trophy className="w-4 h-4" />} label="Type" value={poll.pollType === "group" ? "Group" : "Single"} />
            </div>

            {(poll.pollStartDate || poll.pollEndDate) && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                {poll.pollStartDate} {poll.pollStartTime} — {poll.pollEndDate} {poll.pollEndTime}
              </div>
            )}

            {/* Leaderboard */}
            {stats.leaderboard.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5" /> Leaderboard
                </p>
                <div className="space-y-1.5">
                  {stats.leaderboard.slice(0, 10).map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50">
                      <span className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        {c.name}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{c.votes.toLocaleString("en-NG")} votes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {deleted && poll.deletedBy && (
              <p className="text-xs text-gray-400">Deleted by {poll.deletedBy} on {new Date(poll.deletedAt || "").toLocaleString("en-NG")}</p>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {deleted ? (
                <ActionButton
                  onClick={() => handleAction("restore")}
                  loading={acting === "restore"}
                  icon={<RotateCcw className="w-4 h-4" />}
                  label="Restore poll"
                  variant="primary"
                />
              ) : (
                <>
                  <ActionButton
                    onClick={() => handleAction(poll.flagged ? "unflag" : "flag")}
                    loading={acting === "flag" || acting === "unflag"}
                    icon={<Flag className="w-4 h-4" />}
                    label={poll.flagged ? "Unflag" : "Flag"}
                    variant={poll.flagged ? "default" : "warning"}
                  />
                  <ActionButton
                    onClick={() => handleAction(poll.suspended ? "unsuspend" : "suspend")}
                    loading={acting === "suspend" || acting === "unsuspend"}
                    icon={poll.suspended ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                    label={poll.suspended ? "Unsuspend" : "Suspend"}
                    variant={poll.suspended ? "default" : "warning"}
                  />
                  {!confirmDelete ? (
                    <ActionButton
                      onClick={() => setConfirmDelete(true)}
                      icon={<Trash2 className="w-4 h-4" />}
                      label="Delete"
                      variant="danger"
                    />
                  ) : (
                    <>
                      <ActionButton
                        onClick={() => handleAction("delete")}
                        loading={acting === "delete"}
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Confirm delete"
                        variant="danger-solid"
                      />
                      <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                        Cancel
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            <p className="text-[11px] text-gray-400">
              Deleting a poll is a soft delete — its data is archived and can be restored at any time.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function Badge({ children, color }: { children: React.ReactNode; color: "gray" | "amber" | "red" | "emerald" }) {
  const styles: Record<string, string> = {
    gray: "bg-gray-800/80 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-red-600 text-white",
    emerald: "bg-emerald-600 text-white",
  }
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${styles[color]}`}>{children}</span>
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="flex items-center justify-center text-[#6b2fa5] mb-1">{icon}</div>
      <p className="text-sm font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}

function ActionButton({
  onClick, loading, icon, label, variant,
}: {
  onClick: () => void
  loading?: boolean
  icon: React.ReactNode
  label: string
  variant: "primary" | "default" | "warning" | "danger" | "danger-solid"
}) {
  const styles: Record<string, string> = {
    primary: "bg-[#6b2fa5] text-white hover:bg-[#5a2589]",
    default: "border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    warning: "border-2 border-amber-300 text-amber-700 hover:bg-amber-50",
    danger: "border-2 border-red-200 text-red-600 hover:bg-red-50",
    "danger-solid": "bg-red-600 text-white hover:bg-red-700",
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}
