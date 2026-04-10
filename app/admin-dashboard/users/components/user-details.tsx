"use client"

import { useState } from "react"
import type { UserDetails } from "@/app/api/v1/users/[email]/route"
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react"

interface UserDetailsProps {
  user: UserDetails | null
  loading: boolean
  error: string | null
  onBlockUser: (reason: string) => void
  onUnblockUser: () => void
}

export function UserDetailsComponent({
  user,
  loading,
  error,
  onBlockUser,
  onUnblockUser,
}: UserDetailsProps) {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockReason, setBlockReason] = useState("")

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error loading user</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading || !user) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
        <div className="h-32 bg-slate-200 rounded animate-pulse" />
      </div>
    )
  }

  const handleBlockClick = () => {
    if (blockReason.trim()) {
      onBlockUser(blockReason)
      setBlockReason("")
      setBlockDialogOpen(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">{user.displayName}</h2>
        <p className="text-sm text-slate-600 mt-1">{user.email}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Status */}
        <div>
          {user.blockedStatus?.isBlocked ? (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4 border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-900">User Blocked</p>
                {user.blockedStatus.reason && (
                  <p className="text-sm text-red-700 mt-1">
                    Reason: {user.blockedStatus.reason}
                  </p>
                )}
                {user.blockedStatus.blockedAt && (
                  <p className="text-xs text-red-600 mt-2">
                    Blocked on {new Date(user.blockedStatus.blockedAt).toLocaleString()}
                  </p>
                )}
                <button
                  onClick={onUnblockUser}
                  className="mt-3 text-sm font-medium text-red-700 hover:text-red-900 underline"
                >
                  Unblock User
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 border border-green-200">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Active</p>
                <p className="text-sm text-green-700 mt-1">User account is in good standing</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-2xl font-bold text-slate-900">{user.totalTickets}</p>
            <p className="text-xs text-slate-600 mt-1">Tickets Purchased</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-2xl font-bold text-emerald-600">₦{user.totalSpent.toLocaleString()}</p>
            <p className="text-xs text-slate-600 mt-1">Total Spent</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
            <p className="text-xs text-slate-600 mt-1">Member Since</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide">User ID</p>
            <p className="text-sm font-mono text-slate-900 mt-1">{user.userId}</p>
          </div>
          {user.lastLogin && (
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide">Last Login</p>
              <p className="text-sm text-slate-900 mt-1">{new Date(user.lastLogin).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!user.blockedStatus?.isBlocked && (
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={() => setBlockDialogOpen(true)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
            >
              Block User
            </button>
          </div>
        )}
      </div>

      {/* Block Dialog */}
      {blockDialogOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900">Block User</h3>
              <p className="text-sm text-slate-600 mt-2">
                Are you sure you want to block {user.email}?
              </p>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Reason for blocking (required)"
                className="w-full mt-4 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setBlockDialogOpen(false)
                    setBlockReason("")
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBlockClick}
                  disabled={!blockReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
