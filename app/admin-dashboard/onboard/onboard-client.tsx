"use client"

import { useState, useEffect, useCallback } from "react"
import {
  UserPlus, Trash2, Shield, ShieldCheck, Loader2,
  X, Search, ChevronDown, Check,
} from "lucide-react"
import Image from "next/image"

type AdminRole = "admin" | "exec-assistant" | "customer-support" | "marketing" | "IT"

const ROLE_LABELS: Record<AdminRole, string> = {
  admin:              "Admin",
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  marketing:          "Marketing",
  IT:                 "IT",
}

const ROLE_COLORS: Record<AdminRole, string> = {
  admin:              "bg-purple-100 text-purple-700 border-purple-200",
  "exec-assistant":   "bg-blue-100 text-blue-700 border-blue-200",
  "customer-support": "bg-green-100 text-green-700 border-green-200",
  marketing:          "bg-orange-100 text-orange-700 border-orange-200",
  IT:                 "bg-slate-100 text-slate-700 border-slate-200",
}

const ALL_ROLES: AdminRole[] = ["admin", "exec-assistant", "customer-support", "marketing", "IT"]

interface AdminMember {
  uid: string
  email: string
  username: string
  fullName: string
  profilePicture: string | null
  role: AdminRole
  secondaryRoles: AdminRole[]
  isSuperAdmin: boolean
  onboardedAt: string | null
  onboardedBy: string | null
}

interface LookupUser {
  uid: string
  email: string
  username: string
}

function RoleBadge({ role }: { role: AdminRole }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

export function OnboardClient() {
  const [admins, setAdmins] = useState<AdminMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalEmail, setModalEmail] = useState("")
  const [lookingUp, setLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupUser | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<AdminRole>("admin")
  const [selectedSecondary, setSelectedSecondary] = useState<AdminRole[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Remove confirm
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/onboard")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setAdmins(data.admins)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const handleLookup = async () => {
    if (!modalEmail.trim()) return
    setLookingUp(true)
    setLookupResult(null)
    setLookupError(null)
    try {
      const res = await fetch(`/api/v1/users/${encodeURIComponent(modalEmail.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "User not found")
      // The users endpoint returns user details; we need uid
      // It doesn't return uid directly — we'll check the onboard POST for that
      setLookupResult({ uid: "", email: modalEmail.trim(), username: data.username })
    } catch (e: any) {
      setLookupError(e.message)
    } finally {
      setLookingUp(false)
    }
  }

  const handleOnboard = async () => {
    if (!lookupResult) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/v1/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:          modalEmail.trim(),
          role:           selectedRole,
          secondaryRoles: selectedSecondary,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to onboard")
      setShowModal(false)
      resetModal()
      await fetchAdmins()
    } catch (e: any) {
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (uid: string) => {
    setRemoving(true)
    try {
      const res = await fetch("/api/v1/onboard", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove")
      setConfirmRemove(null)
      await fetchAdmins()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setRemoving(false)
    }
  }

  const resetModal = () => {
    setModalEmail("")
    setLookupResult(null)
    setLookupError(null)
    setSelectedRole("admin")
    setSelectedSecondary([])
    setSubmitError(null)
  }

  const toggleSecondary = (role: AdminRole) => {
    if (role === selectedRole) return
    setSelectedSecondary((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Onboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage admin members and their roles</p>
        </div>
        <button
          onClick={() => { setShowModal(true); resetModal() }}
          className="flex items-center gap-2 px-4 py-2 bg-[#6b2fa5] text-white rounded-lg text-sm font-medium hover:bg-[#5a2690] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Onboard Admin
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchAdmins} className="mt-3 text-sm text-red-700 underline">Retry</button>
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No admins onboarded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.uid}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#6b2fa5]/30 flex-shrink-0">
                {admin.profilePicture ? (
                  <Image src={admin.profilePicture} alt={admin.username} width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-[#6b2fa5]/10 flex items-center justify-center">
                    <span className="text-[#6b2fa5] font-bold text-sm">{(admin.username || admin.email)[0]?.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm truncate">{admin.username || admin.fullName || admin.email}</p>
                  {admin.isSuperAdmin && (
                    <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Super Admin
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <RoleBadge role={admin.role} />
                  {admin.secondaryRoles.map((r) => (
                    <RoleBadge key={r} role={r} />
                  ))}
                </div>
              </div>

              {/* Remove */}
              {!admin.isSuperAdmin && (
                <button
                  onClick={() => setConfirmRemove(admin.uid)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Remove admin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Onboard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Onboard Admin</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Email lookup */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">User Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={modalEmail}
                    onChange={(e) => { setModalEmail(e.target.value); setLookupResult(null); setLookupError(null) }}
                    placeholder="user@example.com"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6b2fa5]/30"
                  />
                  <button
                    onClick={handleLookup}
                    disabled={lookingUp || !modalEmail.trim()}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex items-center gap-1"
                  >
                    {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Lookup
                  </button>
                </div>
                {lookupError && <p className="mt-1.5 text-xs text-red-500">{lookupError}</p>}
                {lookupResult && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    Found: <span className="font-medium">{lookupResult.username || modalEmail}</span>
                  </div>
                )}
              </div>

              {/* Primary role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map((role) => (
                    <button
                      key={role}
                      onClick={() => { setSelectedRole(role); setSelectedSecondary((p) => p.filter((r) => r !== role)) }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${selectedRole === role ? "border-[#6b2fa5] bg-[#6b2fa5]/10 text-[#6b2fa5]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Secondary Roles <span className="font-normal text-gray-400">(optional)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.filter((r) => r !== selectedRole).map((role) => (
                    <button
                      key={role}
                      onClick={() => toggleSecondary(role)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors text-left flex items-center gap-2 ${selectedSecondary.includes(role) ? "border-[#6b2fa5] bg-[#6b2fa5]/5 text-[#6b2fa5]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selectedSecondary.includes(role) ? "bg-[#6b2fa5] border-[#6b2fa5]" : "border-gray-300"}`}>
                        {selectedSecondary.includes(role) && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {ROLE_LABELS[role]}
                    </button>
                  ))}
                </div>
              </div>

              {submitError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-200">{submitError}</p>}

              <button
                onClick={handleOnboard}
                disabled={submitting || !lookupResult}
                className="w-full py-2.5 bg-[#6b2fa5] text-white rounded-lg font-medium text-sm hover:bg-[#5a2690] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Onboarding...</> : "Onboard Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove confirm dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Remove Admin</h3>
            <p className="text-sm text-gray-600 mb-6">This admin will lose all dashboard access. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemove(confirmRemove)}
                disabled={removing}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
