import type { Metadata } from "next"
import StorageClient from "@/components/storage/storage-client"

export const metadata: Metadata = {
  title: "Storage | Spotix Admin Portal",
}

// Any registered admin role can access this page (enforced by the shared
// /admin-dashboard layout guard).
export default function StoragePage() {
  return <StorageClient />
}
