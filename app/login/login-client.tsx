"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase-client"
import { Lock, Loader2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginClient() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (loading) return
    setError("")
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

      const user = userCredential.user
      if (!user) {
        throw new Error("Authentication failed")
      }

      // 🔒 ALWAYS force refresh when exchanging with backend
      let idToken = await user.getIdToken(true)

      const response = await fetch("/api/v1/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 🔥 REQUIRED for session cookies
        body: JSON.stringify({ idToken }),
      })

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      // If token expired, retry once with fresh token
      if (!response.ok && data?.code === "auth/id-token-expired") {
        console.log("Token expired, retrying with fresh token...")
        
        // Force another token refresh
        idToken = await user.getIdToken(true)
        
        const retryResponse = await fetch("/api/v1/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ idToken }),
        })

        data = await retryResponse.json()
        
        if (!retryResponse.ok) {
          throw new Error(data?.error || "Login failed after retry")
        }
      } else if (!response.ok) {
        throw new Error(data?.error || "Login failed")
      }

      // ✅ Session cookie is now set
      if (data.isAdmin) {
        router.push("/admin-dashboard")
      } else {
        router.push("/unauth")
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      <Image
        src="/login.jpg"
        alt="Login background"
        fill
        className="object-cover"
        priority
      />

      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 mb-4">
              <Image
                src="/logo.png"
                alt="Spotix Logo"
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
            <h1 className="text-2xl font-bold text-white text-center">
              Spotix Admin Portal
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@spotix.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button type="submit" disabled={loading} className="w-full py-3">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-white/70">
          <Lock className="w-4 h-4 text-[#6b2fa5]" />
          <span className="text-sm">
            Developed and secured by Spotix Technologies
          </span>
        </div>
      </div>
    </div>
  )
}