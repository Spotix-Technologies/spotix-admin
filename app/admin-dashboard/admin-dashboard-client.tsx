// app/admin-dashboard/admin-dashboard-client.tsx

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface User {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
}

interface AdminDashboardClientProps {
  user: User
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function AdminDashboardClient({ user }: AdminDashboardClientProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/v1/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#6b2fa5]">
              {user.profilePicture ? (
                <Image
                  src={user.profilePicture || "/placeholder.svg"}
                  alt={user.username}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Image
                  src="/TempUser.svg"
                  alt="Default user"
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {getGreeting()}, {user.username}
              </h1>
              <p className="text-sm text-gray-500">Welcome to Spotix Admin Portal</p>
            </div>
          </div>

          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5] hover:text-white bg-transparent"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Dashboard Overview</h2>
          <p className="text-gray-600">
            Welcome to the Spotix Admin Portal. Your admin controls and management tools will be displayed here.
          </p>
        </div>
      </main>
    </div>
  )
}
