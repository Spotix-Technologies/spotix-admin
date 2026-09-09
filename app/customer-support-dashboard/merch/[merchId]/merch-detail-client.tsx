"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Loader2, Package, DollarSign, ShoppingBag, Boxes } from "lucide-react"

interface MerchListing {
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

interface MerchOrder {
  id: string
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

const STATUS_STYLE: Record<MerchOrder["status"], string> = {
  Processing: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Shipped: "bg-blue-100 text-blue-800 border-blue-300",
  Delivered: "bg-green-100 text-green-800 border-green-300",
}

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(date: string): string {
  if (!date) return "N/A"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export function MerchDetailClient({ merchId, backHref }: { merchId: string; backHref: string }) {
  const router = useRouter()
  const [listing, setListing] = useState<MerchListing | null>(null)
  const [orders, setOrders] = useState<MerchOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/merch/${merchId}/orders`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load merch item")
      setListing(data.listing ?? null)
      setOrders(data.orders ?? [])
    } catch (e: any) {
      setError(e.message || "Failed to load merch item")
    } finally {
      setLoading(false)
    }
  }, [merchId])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push(backHref)}
        className="inline-flex items-center gap-2 text-[#6b2fa5] hover:text-[#5a2690] text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Merch
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-[#6b2fa5] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchData} className="mt-3 text-sm text-red-700 underline">Retry</button>
        </div>
      ) : !listing ? (
        <div className="text-center py-20 text-gray-400 text-sm">Merch item not found.</div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-6 flex-wrap">
              {listing.images && listing.images.length > 0 ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                  <Image src={listing.images[0] || "/placeholder.svg"} alt={listing.productName} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{listing.productName}</h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      listing.status === "active"
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {listing.status === "active" ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-600 mt-2 text-sm">{listing.description}</p>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-3 text-xs text-gray-500">
                  <span><strong className="text-gray-700">ID:</strong> <span className="font-mono">{listing.id}</span></span>
                  <span><strong className="text-gray-700">Booker ID:</strong> <span className="font-mono">{listing.bookerId}</span></span>
                  <span><strong className="text-gray-700">Qty left:</strong> {listing.quantity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(listing.totalAmount)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Units Sold</p>
                <p className="text-xl font-bold text-gray-900">{listing.totalSold}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
              <div className="w-11 h-11 bg-[#6b2fa5]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Boxes className="w-5 h-5 text-[#6b2fa5]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Orders</p>
                <p className="text-xl font-bold text-gray-900">{orders.length}</p>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Orders</h2>
            </div>

            {orders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No orders yet</p>
                <p className="text-gray-500 text-sm mt-1">Orders will appear here once customers make a purchase.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Order ID</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Contact</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Address</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Qty</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-mono text-gray-900">{order.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-900">{order.fullName}</p>
                          {order.username && <p className="text-xs text-gray-500">@{order.username}</p>}
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-gray-900">{order.email}</p>
                          <p className="text-xs text-gray-500">{order.phoneNumber}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-gray-900 max-w-[220px] truncate">{order.address}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-900">{order.qty}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(order.amountPaid)}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm text-gray-600">{formatDate(order.orderDate)}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-lg border ${STATUS_STYLE[order.status]}`}>
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
