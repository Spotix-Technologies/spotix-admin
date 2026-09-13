/**
 * app/lib/election-settings.ts
 *
 * Admin-side read/write for the elections feature's PER-ELECTION
 * platform-fee overrides — three nullable columns directly on
 * `elections` (see /supabase/election-per-election-fees-schema.sql):
 * platform_fee_percent, platform_fee_flat, paystack_fee_payer. Null on
 * any of them means "not customized — use the platform default",
 * which spotix-vote's lib/election/fees.ts resolves the same way this
 * file does (7% + ₦100, "voter" bears Paystack's fee) — keep the two
 * in sync if either changes, since this file's job is purely admin
 * CONFIGURATION, while spotix-vote's is the one that actually charges
 * candidates.
 *
 * Superseded the old global `election_platform_settings` singleton —
 * every read/write here is scoped to one electionId.
 *
 * Only a full "admin" may WRITE (see
 * app/api/v1/admin-elections/[electionId]/settings/route.ts);
 * customer-support gets read-only access via its own separate route
 * (app/api/v1/support-elections/[electionId]/settings/route.ts) — same
 * pattern as admin-polls/limits vs support-polls/limits (see
 * app/lib/poll-limits.ts).
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

export type ElectionPaystackFeePayer = "voter" | "organizer" | "none"

export const DEFAULT_PLATFORM_FEE_PERCENT = 7
export const DEFAULT_PLATFORM_FEE_FLAT = 100
export const DEFAULT_PAYSTACK_FEE_PAYER: ElectionPaystackFeePayer = "voter"

export interface ElectionFeeSettings {
  electionId: string
  electionName: string
  /** Effective value in use right now — the override if set, otherwise the platform default. */
  platformFeePercent: number
  platformFeeFlat: number
  paystackFeePayer: ElectionPaystackFeePayer
  /** True if ANY of the three fields above is a per-election override rather than the platform default. */
  isCustomized: boolean
  updatedAt: string | null
  updatedBy: string | null
}

function resolve<T>(raw: T | null | undefined, fallback: T): { value: T; customized: boolean } {
  return raw === null || raw === undefined ? { value: fallback, customized: false } : { value: raw, customized: true }
}

export async function getElectionFeeSettings(electionId: string): Promise<ElectionFeeSettings> {
  const { data, error } = await supabaseAdmin
    .from("elections")
    .select("id, name, platform_fee_percent, platform_fee_flat, paystack_fee_payer, platform_fee_updated_at, platform_fee_updated_by")
    .eq("id", electionId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Election not found")

  const percent = resolve(data.platform_fee_percent === null ? null : Number(data.platform_fee_percent), DEFAULT_PLATFORM_FEE_PERCENT)
  const flat = resolve(data.platform_fee_flat === null ? null : Number(data.platform_fee_flat), DEFAULT_PLATFORM_FEE_FLAT)
  const payer = resolve(data.paystack_fee_payer as ElectionPaystackFeePayer | null, DEFAULT_PAYSTACK_FEE_PAYER)

  return {
    electionId: data.id,
    electionName: data.name ?? "",
    platformFeePercent: percent.value,
    platformFeeFlat: flat.value,
    paystackFeePayer: payer.value,
    isCustomized: percent.customized || flat.customized || payer.customized,
    updatedAt: data.platform_fee_updated_at ?? null,
    updatedBy: data.platform_fee_updated_by ?? null,
  }
}

export interface ElectionFeeSettingsInput {
  platformFeePercent?: number
  platformFeeFlat?: number
  paystackFeePayer?: ElectionPaystackFeePayer
  /** When true, clears all three overrides back to the platform default — takes priority over the fields above if both are somehow sent. */
  resetToDefault?: boolean
}

/** Updates (or clears) one election's fee overrides. Only the fields present in `input` are touched; the rest of that election's overrides are left as they were. */
export async function setElectionFeeSettings(
  electionId: string,
  input: ElectionFeeSettingsInput,
  updatedByUid: string
): Promise<ElectionFeeSettings> {
  const patch: Record<string, any> = {
    platform_fee_updated_at: new Date().toISOString(),
    platform_fee_updated_by: updatedByUid,
  }

  if (input.resetToDefault) {
    patch.platform_fee_percent = null
    patch.platform_fee_flat = null
    patch.paystack_fee_payer = null
  } else {
    if (input.platformFeePercent !== undefined) {
      if (!Number.isFinite(input.platformFeePercent) || input.platformFeePercent < 0) {
        throw new Error("platformFeePercent must be a non-negative number")
      }
      patch.platform_fee_percent = input.platformFeePercent
    }
    if (input.platformFeeFlat !== undefined) {
      if (!Number.isFinite(input.platformFeeFlat) || input.platformFeeFlat < 0) {
        throw new Error("platformFeeFlat must be a non-negative number")
      }
      patch.platform_fee_flat = input.platformFeeFlat
    }
    if (input.paystackFeePayer !== undefined) {
      if (!["voter", "organizer", "none"].includes(input.paystackFeePayer)) {
        throw new Error('paystackFeePayer must be "voter", "organizer", or "none"')
      }
      patch.paystack_fee_payer = input.paystackFeePayer
    }
  }

  const { error } = await supabaseAdmin.from("elections").update(patch).eq("id", electionId)
  if (error) throw new Error(error.message)

  return getElectionFeeSettings(electionId)
}

// ── Elections list (for the Election Management page) ──────────────────────

export interface ElectionListItem {
  id: string
  name: string
  status: string
  organizerId: string
  resultsPublished: boolean
  votingStartsAt: string | null
  votingEndsAt: string | null
  allowVoterPrefill: boolean
  createdAt: string | null
  platformFeePercent: number
  platformFeeFlat: number
  paystackFeePayer: ElectionPaystackFeePayer
  isFeeCustomized: boolean
}

export async function listElectionsForAdmin(limit = 100): Promise<ElectionListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("elections")
    .select(
      "id, name, status, organizer_id, results_published, voting_starts_at, voting_ends_at, allow_voter_prefill, created_at, platform_fee_percent, platform_fee_flat, paystack_fee_payer"
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const percent = resolve(row.platform_fee_percent === null ? null : Number(row.platform_fee_percent), DEFAULT_PLATFORM_FEE_PERCENT)
    const flat = resolve(row.platform_fee_flat === null ? null : Number(row.platform_fee_flat), DEFAULT_PLATFORM_FEE_FLAT)
    const payer = resolve(row.paystack_fee_payer as ElectionPaystackFeePayer | null, DEFAULT_PAYSTACK_FEE_PAYER)

    return {
      id: row.id,
      name: row.name ?? "",
      status: row.status ?? "draft",
      organizerId: row.organizer_id ?? "",
      resultsPublished: row.results_published ?? false,
      votingStartsAt: row.voting_starts_at ?? null,
      votingEndsAt: row.voting_ends_at ?? null,
      allowVoterPrefill: row.allow_voter_prefill ?? false,
      createdAt: row.created_at ?? null,
      platformFeePercent: percent.value,
      platformFeeFlat: flat.value,
      paystackFeePayer: payer.value,
      isFeeCustomized: percent.customized || flat.customized || payer.customized,
    }
  })
}
