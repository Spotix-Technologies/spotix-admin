import type { Metadata } from "next"
import LoginClient from "./login-client"

export const metadata: Metadata = {
  title: "Login | Spotix Admin Portal",
  description: "Secure login portal for Spotix administrators",
}

export default function LoginPage() {
  return <LoginClient />
}
