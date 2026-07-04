import type { Metadata } from "next"
import { OnboardClient } from "./onboard-client"
import { requireFullAdmin } from "@/lib/require-admin-page"

export const metadata: Metadata = {
  title: "Onboard | Spotix Admin Portal",
}

export default async function OnboardPage() {
  await requireFullAdmin()
  return <OnboardClient />
}
