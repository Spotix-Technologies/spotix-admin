import type { Metadata } from "next"
import { OnboardClient } from "./onboard-client"

export const metadata: Metadata = {
  title: "Onboard | Spotix Admin Portal",
}

export default function OnboardPage() {
  return <OnboardClient />
}
