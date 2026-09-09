"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ShoppingBag, Loader2, ChevronLeft, ChevronRight, Package } from "lucide-react"

interface MerchListing {
  id: string
  bookerId: string
  productName: string
  description: string
  price: number
  images: string[]
  quantity: number
  totalAmount: number
  totalSold: number
  status: "active" | "inactive"
  createdAt: string
}

const PER_PAGE = 15

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(price)
    .replace("NGN", "₦")
    .trim()
}

export function MerchAdminClient() {
  const router = useRouter()
  const [listings, setListings] = useState<MerchListing[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchListings = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/merch?page=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load merch listings")
      setListings(data.listings ?? [])
      setTotalPages(data.totalPages ?? 1)
      setTotal(data.total ?? 0)
    } catch (e: any) {
      setError(e.message || "Failed to load merch listings")
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchListings(page) }, [page, fetchListings])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Merch</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total > 0 ? `${total} listing${total === 1 ? "" : "s"} across all events` : "Merch listings across all events"}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={() => fetchListings(page)} className="mt-3 text-sm text-red-700 underline">Retry</button>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No merch listings yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => router.push(`/admin-dashboard/merch/${listing.id}`)}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:border-[#6b2fa5]/30 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="relative w-full h-40 bg-gray-100">
                {listing.images && listing.images.length > 0 ? (
                  <Image
                    src={listing.images[0] || "/placeholder.svg"}
                    alt={listing.productName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <span
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    listing.status === "active"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {listing.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-[#6b2fa5] transition-colors" title={listing.productName}>
                  {listing.productName}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">{listing.id}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-base font-bold text-[#6b2fa5]">{formatPrice(listing.price)}</span>
                  <span className="text-xs text-gray-500">{listing.totalSold} sold</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
