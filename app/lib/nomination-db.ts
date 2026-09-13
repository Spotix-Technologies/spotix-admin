/**
 * lib/nomination-db.ts
 *
 * Admin-side Supabase query helper for the open-nomination system.
 * Read-only — nomination polls are created/edited from spotix-booker
 * (see spotix-booker/app/lib/nomination-db.ts and
 * /supabase/schema.sql, table `nomination_polls`). This file only
 * needs to list one creator's polls, for the Users admin page's
 * "Created Content" tab (Polls → Nominations sub-tab).
 */

import { supabaseAdmin } from "./supabase-admin"

export interface NominationPollSummary {
  pollId: string
  pollName: string
  pollImage: string
  status: "active" | "closed"
  categoryCount: number
  createdAt: string
}

const NOMINATION_COLUMNS = "id, poll_name, poll_image, categories, status, created_at"

/** All nomination polls created by one user, newest first. */
export async function listNominationPollsByCreator(
  creatorId: string
): Promise<NominationPollSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("nomination_polls")
    .select(NOMINATION_COLUMNS)
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    pollId: row.id,
    pollName: row.poll_name ?? "",
    pollImage: row.poll_image ?? "",
    status: (row.status as "active" | "closed") ?? "active",
    categoryCount: Array.isArray(row.categories) ? row.categories.length : 0,
    createdAt: row.created_at ?? "",
  }))
}
