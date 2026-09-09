/**
 * lib/merch-db.ts
 *
 * Admin-side Supabase query helpers for the merch system. Unlike
 * spotix-booker's lib/merch-db.ts (which is booker-scoped — "my
 * listings"), everything here reads ACROSS all bookers: admin and
 * customer-support both need to see every merch item and its orders,
 * not just one booker's.
 *
 * Same `merch_listings` / `merch_orders` tables spotix-booker and
 * spotix-backend already write to (see spotix-booker/app/lib/merch-db.ts
 * and spotix-backend/v1/lib/merch/*.js). This file is read-only — admin
 * doesn't create/edit/delete listings or orders, it just views them.
 * Pagination mirrors listTransfers() in lib/transfers-db.ts (page +
 * perPage, Supabase `.range()` with an exact count).
 */

import { supabaseAdmin } from "./supabase-admin"

// ─── Listings ───────────────────────────────────────────────────────────────

export interface MerchListing {
  id: string
  bookerId: string
  productName: string
  description: string
  price: number
  images: string[]
  quantity: number
  startDate: string | null
  endDate: string | null
  totalAmount: number
  totalSold: number
  status: "active" | "inactive"
  createdAt: string
}

const LISTING_COLUMNS =
  "id, booker_id, product_name, description, price, images, quantity, start_date, end_date, total_amount, total_sold, status, created_at"

function mapListingRow(row: any): MerchListing {
  return {
    id: row.id,
    bookerId: row.booker_id,
    productName: row.product_name ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    images: row.images ?? [],
    quantity: Number(row.quantity ?? 0),
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    totalAmount: Number(row.total_amount ?? 0),
    totalSold: row.total_sold ?? 0,
    status: (row.status as "active" | "inactive") ?? "active",
    createdAt: row.created_at ?? "",
  }
}

/** Paginated, newest first, across every booker. */
export async function listAllMerchListings(
  page: number,
  perPage = 15
): Promise<{ listings: MerchListing[]; total: number }> {
  const from = (page - 1) * perPage
  const to = from + perPage - 1
  const { data, error, count } = await supabaseAdmin
    .from("merch_listings")
    .select(LISTING_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw error
  return { listings: (data ?? []).map(mapListingRow), total: count ?? 0 }
}

/** Not booker-scoped — admin/customer-support can look up any listing. */
export async function getMerchListingById(listingId: string): Promise<MerchListing | null> {
  const { data, error } = await supabaseAdmin
    .from("merch_listings")
    .select(LISTING_COLUMNS)
    .eq("id", listingId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapListingRow(data)
}

// ─── Orders ─────────────────────────────────────────────────────────────────

export interface MerchOrder {
  id: string
  listingId: string
  buyerUserId: string | null
  fullName: string
  username: string | null
  email: string
  phoneNumber: string
  address: string
  qty: number
  amountPaid: number
  status: "Processing" | "Shipped" | "Delivered"
  orderDate: string
}

const ORDER_COLUMNS =
  "id, listing_id, buyer_user_id, full_name, username, email, phone_number, address, qty, amount_paid, status, order_date"

function mapOrderRow(row: any): MerchOrder {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerUserId: row.buyer_user_id ?? null,
    fullName: row.full_name ?? "",
    username: row.username ?? null,
    email: row.email ?? "",
    phoneNumber: row.phone_number ?? "",
    address: row.address ?? "",
    qty: row.qty ?? 0,
    amountPaid: Number(row.amount_paid ?? 0),
    status: (row.status as "Processing" | "Shipped" | "Delivered") ?? "Processing",
    orderDate: row.order_date ?? "",
  }
}

/** All orders for one listing, regardless of which booker owns it. */
export async function listMerchOrdersForListing(listingId: string): Promise<MerchOrder[]> {
  const { data, error } = await supabaseAdmin
    .from("merch_orders")
    .select(ORDER_COLUMNS)
    .eq("listing_id", listingId)
    .order("order_date", { ascending: false })

  if (error) throw error
  return (data ?? []).map(mapOrderRow)
}
