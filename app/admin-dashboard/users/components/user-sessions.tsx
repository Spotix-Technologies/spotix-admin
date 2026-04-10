"use client"

import { AlertCircle, Smartphone } from "lucide-react"

interface UserSessionsProps {
  sessions: any[]
  loading: boolean
  error: string | null
}

export function UserSessionsComponent({ sessions, loading, error }: UserSessionsProps) {
  const getPlatformIcon = (platform: string) => {
    if (!platform) return "📱"
    if (platform.toLowerCase().includes("ios")) return "🍎"
    if (platform.toLowerCase().includes("android")) return "🤖"
    if (platform.toLowerCase().includes("web")) return "🌐"
    return "📱"
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error loading sessions</p>
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

  if (!sessions || sessions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-slate-600">No active sessions</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Device</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Platform</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Model</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">App Version</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Last Used</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wide">Expires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sessions.map((session, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                  <div className="flex items-center gap-2">
                    <span>{getPlatformIcon(session.platform)}</span>
                    {session.deviceId || "Unknown"}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{session.platform || "-"}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{session.model || "-"}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{session.appVersion || "-"}</td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : "-"}
                </td>
                <td className="px-6 py-4 text-sm">
                  {session.expiresAt ? (
                    <span className={isExpired(session.expiresAt) ? "text-red-600 font-semibold" : "text-slate-600"}>
                      {new Date(session.expiresAt).toLocaleDateString()}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <p className="text-sm text-slate-600">
          Showing {sessions.length} {sessions.length === 1 ? "session" : "sessions"} (active only)
        </p>
      </div>
    </div>
  )
}
