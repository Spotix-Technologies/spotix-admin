import { useCallback, useState } from "react"
import type { OttaKey } from "../types"

export function useOttaKeys() {
  const [ottaKeys, setOttaKeys] = useState<OttaKey[]>([])
  const [generatingOtta, setGeneratingOtta] = useState(false)
  const [newOttaKey, setNewOttaKey] = useState<{ plainKey: string; expiresAt: string } | null>(null)

  const loadOttaKeys = useCallback(async () => {
    const res = await fetch("/api/v1/admin/otta/list")
    const data = await res.json()
    if (res.ok) setOttaKeys(data.keys ?? [])
  }, [])

  const generateOtta = useCallback(async (maxAmount: string, durationMinutes: string) => {
    setGeneratingOtta(true)
    try {
      const res = await fetch("/api/v1/admin/otta/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxAmount: Number(maxAmount), durationMinutes: Number(durationMinutes) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewOttaKey({ plainKey: data.plainKey, expiresAt: data.expiresAt })
      loadOttaKeys()
      return true
    } catch (e: any) {
      alert(e.message || "Failed to generate OTTA key")
      return false
    } finally {
      setGeneratingOtta(false)
    }
  }, [loadOttaKeys])

  const revokeOtta = useCallback(async (keyId: string) => {
    if (!confirm("Revoke this OTTA key? It can't be undone.")) return
    const res = await fetch("/api/v1/admin/otta/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    loadOttaKeys()
  }, [loadOttaKeys])

  return { ottaKeys, generatingOtta, newOttaKey, setNewOttaKey, loadOttaKeys, generateOtta, revokeOtta }
}
