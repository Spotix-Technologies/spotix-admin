"use client"

import { AlertCircle } from "lucide-react"

interface UserDetailsProps {
  user: any | null
  loading: boolean
  error: string | null
}

export function UserDetailsComponent({ user, loading, error }: UserDetailsProps) {
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">{user.fullName || user.username || "Unknown"}</h2>
        <p className="text-sm text-slate-600 mt-1">{user.email}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Username</p>
            <p className="text-sm text-slate-900 mt-2">{user.username || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Phone Number</p>
            <p className="text-sm text-slate-900 mt-2">{user.phoneNumber || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Is Booker</p>
            <p className="text-sm text-slate-900 mt-2">{user.isBooker ? "Yes" : "No"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Referred By</p>
            <p className="text-sm text-slate-900 mt-2">{user.referredBy || "-"}</p>
          </div>
        </div>

        {/* Account Stats */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-4">Account Statistics</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-900">{user.totalEvents}</p>
              <p className="text-xs text-slate-600 mt-1">Total Events</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-2xl font-bold text-slate-900">{user.totalTicketsSold}</p>
              <p className="text-xs text-slate-600 mt-1">Tickets Sold</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-600">₦{(user.totalRevenue || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-600 mt-1">Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Payout Info */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-4">Payout Information</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-lg font-bold text-slate-900">₦{(user.totalPaidOut || 0).toLocaleString()}</p>
              <p className="text-xs text-slate-600 mt-1">Total Paid Out</p>
            </div>
            <div>
              <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">Referral Code Used</p>
              <p className="text-sm text-slate-900 mt-2">{user.referralCodeUsed || "-"}</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="pt-4 border-t border-slate-200">
          <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-4">Timeline</p>
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-sm text-slate-600">Member Since</p>
              <p className="text-sm font-semibold text-slate-900">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-slate-600">Last Login</p>
              <p className="text-sm font-semibold text-slate-900">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "-"}
              </p>
            </div>
            <div className="flex justify-between">
              <p className="text-sm text-slate-600">Last Updated</p>
              <p className="text-sm font-semibold text-slate-900">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Picture */}
        {user.profilePicture && (
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold mb-3">Profile Picture</p>
            <img
              src={user.profilePicture}
              alt="User profile"
              className="w-20 h-20 rounded-lg object-cover border border-slate-200"
            />
          </div>
        )}
      </div>
    </div>
  )
}
