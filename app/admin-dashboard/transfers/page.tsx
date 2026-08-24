import type { Metadata } from "next"
import { TransfersClient } from "./transfers-client"

export const metadata: Metadata = {
  title: "Transfers | Spotix Admin Portal",
}

// This menu item is only ever shown to the "admin" role in the sidebar
// (see dashboard-layout-client.tsx's roles: ["admin"]), and every API
// route behind this page independently re-checks for "admin" too — so a
// customer-support/exec-assistant admin hitting this URL directly still
// gets 403s from every fetch rather than actually seeing wallet data.
export default function TransfersPage() {
  return <TransfersClient />
}
