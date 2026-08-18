/**
 * lib/supabase-admin.ts
 *
 * Service-role Supabase client — same project spotix-booker and
 * spotix-backend already talk to for the `payouts` table (see
 * /supabase/payout-schema.sql and /supabase/payout-schema-admin.sql).
 *
 * This is the ONLY place in spotix-admin that touches Supabase directly.
 * Every route that reads or writes payout data goes through here, using
 * the service-role key — never expose this client or key to the browser.
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) env var is required")
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY env var is required")
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
