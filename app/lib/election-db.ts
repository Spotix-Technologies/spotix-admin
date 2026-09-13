/**
 * lib/election-db.ts
 *
 * Admin-side Supabase query helper for the elections system. Read-only —
 * elections are created/managed from spotix-booker (see
 * spotix-booker/app/lib/election-db.ts, table `elections`). This file
 * only needs to list one organizer's elections, for the Users admin
 * page's "Created Content" tab (Polls → Elections sub-tab).
 */

import { supabaseAdmin } from "./supabase-admin"

export interface ElectionSummary {
  electionId: string
  name: string
  image: string
  status: "draft" | "scheduled" | "active" | "ended"
  resultsPublished: boolean
  votingStartsAt: string | null
  votingEndsAt: string | null
  createdAt: string
}

const ELECTION_COLUMNS =
  "id, name, image, status, results_published, voting_starts_at, voting_ends_at, created_at"

/** All elections created by one user, newest first. */
export async function listElectionsByOrganizer(organizerId: string): Promise<ElectionSummary[]> {
  const { data, error } = await supabaseAdmin
    .from("elections")
    .select(ELECTION_COLUMNS)
    .eq("organizer_id", organizerId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row: any) => ({
    electionId: row.id,
    name: row.name ?? "",
    image: row.image ?? "",
    status: (row.status as ElectionSummary["status"]) ?? "draft",
    resultsPublished: row.results_published === true,
    votingStartsAt: row.voting_starts_at ?? null,
    votingEndsAt: row.voting_ends_at ?? null,
    createdAt: row.created_at ?? "",
  }))
}
