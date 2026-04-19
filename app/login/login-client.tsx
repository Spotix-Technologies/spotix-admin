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
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  const doLogin = async (idToken: string): Promise<{ ok: boolean; data: any }> => {
    const res = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ idToken }),
    })
    let data: any = null
    try { data = await res.json() } catch {}
    return { ok: res.ok, data }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError("")
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const user = credential.user
      if (!user) throw new Error("Authentication failed")

      let idToken = await user.getIdToken(true)
      let { ok, data } = await doLogin(idToken)

      // Retry once on expired token
      if (!ok && data?.code === "auth/id-token-expired") {
        idToken = await user.getIdToken(true)
        const retry = await doLogin(idToken)
        ok   = retry.ok
        data = retry.data
      }

      if (!ok) throw new Error(data?.error || "Login failed")

      // Redirect based on role returned from server
      const dest: string = data.redirectTo || "/unauth"
      router.push(dest)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center">
      <Image src="/login.jpg" alt="Login background" fill className="object-cover" priority />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 mb-4">
              <Image src="/logo.png" alt="Spotix Logo" width={96} height={96} className="object-cover w-full h-full" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center">Spotix Admin Portal</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="admin@spotix.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full py-3">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6 text-white/70">
          <Lock className="w-4 h-4 text-[#6b2fa5]" />
          <span className="text-sm">Developed and secured by Spotix Technologies</span>
        </div>
      </div>
    </div>
  )
}
