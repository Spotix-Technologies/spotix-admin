/**
 * app/lib/admin-storage-db.ts
 *
 * All spotix-admin reads/writes against the Supabase `admin_storage`
 * table — see /supabase/admin-storage-schema.sql. One row per image an
 * admin uploads via the Storage menu item (app/api/v1/storage/upload),
 * so they can fetch their own upload history later instead of it only
 * living in that browser session.
 */

import { supabaseAdmin } from "@/lib/supabase-admin"

export interface AdminStorageRow {
  id: string
  url: string
  uid: string
  uploaded_by_name: string
  file_name: string | null
  file_size: number | null
  storage_key: string | null
  created_at: string
}

export async function recordStorageUpload(row: Omit<AdminStorageRow, "id" | "created_at">): Promise<AdminStorageRow> {
  const { data, error } = await supabaseAdmin.from("admin_storage").insert(row).select().single()
  if (error) throw new Error(error.message)
  return data as AdminStorageRow
}

export async function listStorageUploadsFor(uid: string): Promise<AdminStorageRow[]> {
  const { data, error } = await supabaseAdmin
    .from("admin_storage")
    .select("*")
    .eq("uid", uid)
    .order("created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminStorageRow[]
}
