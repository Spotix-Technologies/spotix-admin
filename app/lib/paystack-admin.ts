/**
 * app/lib/paystack-admin.ts
 *
 * Wallet balance / transfer helpers for the admin Transfers feature —
 * now proxied entirely through spotix-backend rather than calling
 * Paystack directly. spotix-admin holds NO Paystack secret key for this
 * feature; every call here hits spotix-backend's internal-only
 * `/v1/admin/*` routes (see spotix-backend/v1/admin-transfer.js), using
 * the same `x-internal-secret: CRON_SECRET` convention spotix-booker's
 * payout pipeline already uses for its own service-to-service calls
 * (see spotix-booker/app/api/payout/process route → spotix-backend
 * /v1/payout/process).
 *
 * Env vars required (new to spotix-admin):
 *   BACKEND_URL     — same value spotix-booker's NEXT_PUBLIC_BACKEND_URL
 *                      points at (e.g. https://spotix-backend.onrender.com)
 *   CRON_SECRET      — same shared secret spotix-backend checks against
 *                      process.env.CRON_SECRET
 */

const BACKEND_URL = process.env.BACKEND_URL

export class PaystackError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

async function backendFetch(path: string, init?: RequestInit) {
  if (!BACKEND_URL) throw new PaystackError("BACKEND_URL is not configured", 500)
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    // Every call here proxies live wallet/transfer state (balance, Paystack's
    // own transfer history, fee quotes). Next.js's fetch Data Cache defaults
    // to `force-cache` and persists across requests independent of whether
    // the calling route handler itself is dynamic — without this, the FIRST
    // response ever fetched gets served back forever (a frozen snapshot),
    // and neither pagination nor the manual refresh button in the Transfers
    // UI can bust it. `no-store` forces every call to hit spotix-backend
    // (which in turn hits Paystack directly) fresh, every time.
    cache: "no-store",
    headers: {
      "x-internal-secret": process.env.CRON_SECRET ?? "",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) {
    throw new PaystackError(data.error || `spotix-backend request failed (${res.status})`, res.status)
  }
  return data
}

export interface PaystackBalance {
  currency: string
  balance: number
}

export async function getWalletBalance(): Promise<PaystackBalance[]> {
  const data = await backendFetch("/v1/admin/wallet-balance")
  return data.balances ?? []
}

export async function listBanks(): Promise<{ name: string; code: string }[]> {
  const data = await backendFetch("/v1/admin/banks")
  return data.banks ?? []
}

export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }> {
  const data = await backendFetch("/v1/admin/resolve-account", {
    method: "POST",
    body: JSON.stringify({ accountNumber, bankCode }),
  })
  return { accountName: data.accountName }
}

/**
 * Quotes the fee for a transfer of this amount. Backed by
 * spotix-backend's /v1/admin/transfer-fee — that's now the single
 * source of truth for the fee schedule, not a local calculation here.
 */
export async function quoteTransferFee(amount: number): Promise<{ fee: number; amountAfterFee: number }> {
  const data = await backendFetch(`/v1/admin/transfer-fee?amount=${amount}`)
  return { fee: data.fee, amountAfterFee: data.amountAfterFee }
}

export interface ExternalTransfer {
  reference: string
  amount: number
  status: string
  createdAt: string | null
  beneficiaryName: string | null
  bankName: string | null
  accountNumber: string | null
}

/**
 * Withdrawals initiated directly on Paystack's own dashboard (not
 * through this admin panel) — backend filters these down from
 * Paystack's full /transfer history by reference prefix.
 */
export async function listExternalTransfers(page: number, perPage = 20): Promise<{ transfers: ExternalTransfer[] }> {
  const data = await backendFetch(`/v1/admin/paystack-transfers?page=${page}&perPage=${perPage}`)
  return { transfers: data.transfers ?? [] }
}

export async function initiateBackendTransfer(params: {
  reference: string
  amount: number // already amount-after-fee for Transfers; the full disbursed amount for Disbursements/Payments
  reason: string
  bankCode: string
  accountNumber: string
  accountName: string
  recipientCode?: string | null
  /** Optional — only ever passed by the Disbursements/Payments withdrawal flow, so the recipient's email travels with the Paystack recipient record. */
  recipientEmail?: string
}): Promise<{ recipientCode: string; transferCode: string; status: string }> {
  const data = await backendFetch("/v1/admin/initiate-transfer", {
    method: "POST",
    body: JSON.stringify(params),
  })
  return { recipientCode: data.recipientCode, transferCode: data.transferCode, status: data.status }
}
