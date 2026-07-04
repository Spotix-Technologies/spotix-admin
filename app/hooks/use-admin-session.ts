"use client"

import { useState, useEffect } from "react"

export type AdminRole = "admin" | "exec-assistant" | "customer-support" | "marketing" | "IT" | ""

export interface AdminSession {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
  isAdmin: boolean
  role: AdminRole
  secondaryRoles: AdminRole[]
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/verify-session", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.uid) {
          setSession({
            uid: data.uid,
            username: data.username || data.fullName || "Admin",
            fullName: data.fullName || "",
            profilePicture: data.profilePicture || null,
            isAdmin: data.isAdmin ?? false,
            role: data.role || "",
            secondaryRoles: data.secondaryRoles || [],
          })
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { session, loading }
}
