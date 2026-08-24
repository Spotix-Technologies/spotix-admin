import { useCallback, useEffect, useState } from "react"
import type { AccountResolution, Bank } from "../types"

function dedupeByCode(raw: Bank[]): Bank[] {
  const seen = new Set<string>()
  return raw.filter((b) => {
    if (seen.has(b.code)) return false
    seen.add(b.code)
    return true
  })
}

export function useCreateTransfer(onCreated: () => void) {
  const [showCreate, setShowCreate] = useState(false)

  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState("")
  const [bankQuery, setBankQuery] = useState("")
  const [showBankOptions, setShowBankOptions] = useState(false)

  const [accountNumber, setAccountNumber] = useState("")
  const [reason, setReason] = useState("")
  const [amount, setAmount] = useState("")
  const [ottaAtRequest, setOttaAtRequest] = useState("")

  // Account resolution (name lookup + beneficiary history)
  const [resolution, setResolution] = useState<AccountResolution | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createMessage, setCreateMessage] = useState<string | null>(null)

  const open = useCallback(async () => {
    setShowCreate(true)
    setCreateError(null)
    setCreateMessage(null)
    if (banks.length === 0) {
      try {
        const res = await fetch("/api/v1/admin/transfer/banks")
        const data = await res.json()
        if (res.ok) setBanks(dedupeByCode(data.banks ?? []))
      } catch {}
    }
  }, [banks.length])

  const close = useCallback(() => setShowCreate(false), [])

  function reset() {
    setBankCode(""); setBankQuery(""); setAccountNumber(""); setReason(""); setAmount(""); setOttaAtRequest("")
    setResolution(null); setResolveError(null)
  }

  // Resolve the beneficiary (name + prior-transfer total) as soon as a
  // 10-digit account number and a bank are both present. Debounced so it
  // doesn't fire on every keystroke while the last digit is being typed.
  useEffect(() => {
    setResolution(null)
    setResolveError(null)
    if (accountNumber.length !== 10 || !bankCode) return

    let cancelled = false
    setResolving(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/admin/transfer/resolve-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountNumber, bankCode }),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(data.error || "Could not resolve this account")
        setResolution({ accountName: data.accountName, totalSent: data.totalSent, transferCount: data.transferCount })
      } catch (e: any) {
        if (!cancelled) setResolveError(e.message || "Could not resolve this account")
      } finally {
        if (!cancelled) setResolving(false)
      }
    }, 500)

    return () => { cancelled = true; clearTimeout(t) }
  }, [accountNumber, bankCode])

  const submitTransfer = useCallback(async () => {
    setCreating(true)
    setCreateError(null)
    setCreateMessage(null)
    try {
      const selectedBank = banks.find((b) => b.code === bankCode)
      const res = await fetch("/api/v1/admin/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode,
          bankName: selectedBank?.name ?? "",
          accountNumber,
          reason,
          amount: Number(amount),
          ottaKey: ottaAtRequest.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create transfer")
      setCreateMessage(data.message)
      reset()
      onCreated()
      setTimeout(() => { setShowCreate(false); setCreateMessage(null) }, 2500)
    } catch (e: any) {
      setCreateError(e.message || "Failed to create transfer")
    } finally {
      setCreating(false)
    }
  }, [banks, bankCode, accountNumber, reason, amount, ottaAtRequest, onCreated])

  return {
    showCreate, open, close,
    banks, bankCode, setBankCode, bankQuery, setBankQuery, showBankOptions, setShowBankOptions,
    accountNumber, setAccountNumber, reason, setReason, amount, setAmount,
    ottaAtRequest, setOttaAtRequest,
    resolution, resolving, resolveError,
    creating, createError, createMessage,
    submitTransfer,
  }
}
