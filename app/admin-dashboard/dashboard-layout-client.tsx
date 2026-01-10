"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import {
  Home,
  Archive,
  CalendarDays,
  FileText,
  Vote,
  ShoppingBag,
  Wallet,
  UserPlus,
  Download,
  LogOut,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface User {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
}

interface DashboardLayoutClientProps {
  user: User
  children: React.ReactNode
}

const menuItems = [
  { id: "home", label: "Home", icon: Home, href: "/admin-dashboard", active: true },
  { id: "archive", label: "Archive", icon: Archive, href: "/admin-dashboard/archive", active: false },
  { id: "event-data", label: "Event Data", icon: CalendarDays, href: "/admin-dashboard/event-data", active: true },
  { id: "reports", label: "Reports", icon: FileText, href: "/admin-dashboard/reports", active: false },
  { id: "votes", label: "Votes", icon: Vote, href: "/admin-dashboard/votes", active: false },
  { id: "merch", label: "Merch", icon: ShoppingBag, href: "/admin-dashboard/merch", active: false },
  { id: "payouts", label: "Payouts", icon: Wallet, href: "/admin-dashboard/payouts", active: false },
  { id: "onboard", label: "Onboard", icon: UserPlus, href: "/admin-dashboard/onboard", active: false },
  { id: "export", label: "Export", icon: Download, href: "/admin-dashboard/export", active: false },
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const router = useRouter()
  const pathname = usePathname()
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

  const handleNavigation = (href: string, isActive: boolean) => {
    if (isActive) {
      router.push(href)
    }
  }

  const isCurrentPage = (href: string) => {
    if (href === "/admin-dashboard") {
      return pathname === "/admin-dashboard"
    }
    return pathname.startsWith(href)
  }

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-gray-200">
        <SidebarHeader className="p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#6b2fa5] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base md:text-lg">S</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-sm md:text-base truncate">Spotix Admin</h2>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Management Portal</p>
            </div>
          </div>
        </SidebarHeader>
        <Separator />
        <SidebarContent className="p-1.5 md:p-2 overflow-y-auto flex-1">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => handleNavigation(item.href, item.active)}
                  isActive={isCurrentPage(item.href)}
                  className={`w-full justify-start text-sm ${
                    !item.active ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  } ${isCurrentPage(item.href) ? "bg-[#6b2fa5]/10 text-[#6b2fa5]" : ""}`}
                  tooltip={!item.active ? "Coming soon" : item.label}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isCurrentPage(item.href) ? "text-[#6b2fa5]" : ""}`} />
                  <span className="truncate">{item.label}</span>
                  {!item.active && (
                    <span className="ml-auto text-[10px] md:text-xs bg-gray-100 text-gray-500 px-1 md:px-1.5 py-0.5 rounded flex-shrink-0">
                      Soon
                    </span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <Separator />
        <SidebarFooter className="p-3 md:p-4 flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-[#6b2fa5] flex-shrink-0">
              {user.profilePicture ? (
                <Image
                  src={user.profilePicture || "/placeholder.svg"}
                  alt={user.username}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              ) : (
                <Image
                  src="/TempUser.svg"
                  alt="Default user"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs md:text-sm text-gray-900 truncate">{user.username}</p>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{user.fullName || "Admin"}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            disabled={loggingOut}
            variant="outline"
            className="w-full border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5] hover:text-white bg-transparent text-xs md:text-sm"
            size="sm"
          >
            {loggingOut ? (
              <>
                <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2 animate-spin" />
                <span className="truncate">Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-1.5 md:mr-2" />
                <span>Logout</span>
              </>
            )}
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-4 flex-shrink-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 md:h-6" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
              {getGreeting()}, {user.username}
            </h1>
            <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Welcome to Spotix Admin Portal</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 bg-gray-50">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
