"use client"

import type { UserSession } from "@/app/api/v1/users/[email]/sessions/route"
import { AlertCircle, Globe } from "lucide-react"

interface UserSessionsProps {
  sessions: UserSession[]
  loading: boolean
  error: string | null
}

export function UserSessionsComponent({
  sessions,
  loading,
  error,
}: UserSessionsProps) {
  const getDeviceInfo = (userAgent: string) => {
    if (!userAgent || userAgent === "Unknown") return "Unknown Device"

    // Simple device detection
    if (userAgent.includes("Mobile") || userAgent.includes("iPhone")) return "Mobile"
    if (userAgent.includes("Tablet") || userAgent.includes("iPad")) return "Tablet"
    return "Desktop"
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
        <h3 className="font-semibold text-slate-900">Active Sessions</h3>
      </div>

      {loading ? (
        <div className="p-6">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-6 text-center text-slate-600">
          <p className="text-sm">No active sessions</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {sessions.map((session) => (
            <div key={session.sessionId} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-900">
                        {getDeviceInfo(session.userAgent)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {session.ipAddress}
                        {session.country && ` • ${session.country}`}
                        {session.city && ` (${session.city})`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {session.userAgent !== "Unknown" && (
                      <p className="text-xs text-slate-500 font-mono">
                        {session.userAgent.substring(0, 60)}
                        {session.userAgent.length > 60 ? "..." : ""}
                      </p>
                    )}
                    <p>
                      Last active: {new Date(session.lastActivity).toLocaleString()}
                    </p>
                    <p>
                      Started: {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
