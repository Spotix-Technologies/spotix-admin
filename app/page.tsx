import { redirect } from "next/navigation"
import { requireAnyAdmin, ROLE_REDIRECT } from "@/lib/require-admin-page"

// This is the PWA's start_url (see manifest.ts), so it's what runs on every
// app-icon launch. requireAnyAdmin() redirects to /login if there's no
// session cookie or it fails verification, and to /unauth if the session is
// valid but the account has no admin role. Otherwise we land here with a
// verified user and send them straight to their role's dashboard instead of
// bouncing through the login screen.
export default async function Home() {
  const user = await requireAnyAdmin()
  redirect(ROLE_REDIRECT[user.role] || "/unauth")
}
