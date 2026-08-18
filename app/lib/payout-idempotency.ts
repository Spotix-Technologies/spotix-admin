/**
 * lib/payout-idempotency.ts
 *
 * Same table (`payout_idempotency_keys`) and same guarantee as
 * spotix-booker's app/lib/payout-idempotency.ts — duplicated here rather
 * than shared across repos, but must stay behaviourally identical: the
 * first request to atomically claim a given key wins, everything else
 * (including a genuinely concurrent request) gets rejected.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

const PG_UNIQUE_VIOLATION = "23505"

export class DuplicateRequestError extends Error {
  constructor(message = "This request has already been submitted.") {
    super(message)
    this.name = "DuplicateRequestError"
  }
}

export async function claimIdempotencyKey(key: string, userId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("payout_idempotency_keys").insert({ idempotency_key: key, user_id: userId })
  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) throw new DuplicateRequestError()
    throw new Error("Could not verify request uniqueness. Please try again.")
  }
}

export function isPayoutUniqueViolation(err: any): boolean {
  return err?.code === PG_UNIQUE_VIOLATION
}
