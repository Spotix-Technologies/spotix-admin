// Shared layout for all non-admin role dashboards
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { ClipboardList, LogOut, Loader2, SwitchCamera } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarInset, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export interface RoleUser {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
  role: string
  secondaryRoles: string[]
}

interface RoleDashboardLayoutClientProps {
  user: RoleUser
  children: React.ReactNode
  dashboardLabel: string
  basePath: string
}

const ROLE_LABEL: Record<string, string> = {
  admin:              "Admin",
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  marketing:          "Marketing",
  IT:                 "IT",
}

const ROLE_DASHBOARD: Record<string, string> = {
  admin:              "/admin-dashboard",
  "exec-assistant":   "/exec-assistant-dashboard",
  "customer-support": "/customer-support-dashboard",
  marketing:          "/marketing-dashboard",
  IT:                 "/it-dashboard",
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function RoleDashboardLayoutClient({
  user, children, dashboardLabel, basePath,
}: RoleDashboardLayoutClientProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loggingOut,    setLoggingOut]    = useState(false)
  const [switchingRole, setSwitchingRole] = useState(false)

  // All roles this user can switch to (secondary roles that have a dashboard)
  const switchableRoles = user.secondaryRoles.filter((r) => ROLE_DASHBOARD[r])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/v1/logout", { method: "POST" })
      router.push("/login")
    } catch {
      setLoggingOut(false)
    }
  }

  const handleSwitchRole = async (targetRole: string) => {
    setSwitchingRole(true)
    try {
      const res = await fetch("/api/v1/switch-role", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ targetRole }),
      })
      if (res.ok) {
        const dest = ROLE_DASHBOARD[targetRole]
        if (dest) router.push(dest)
      }
    } finally {
      setSwitchingRole(false)
    }
  }

  const tasksHref = `${basePath}/tasks`
  const isCurrentPage = (href: string) =>
    href === basePath ? pathname === basePath : pathname.startsWith(href)

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-gray-200">
        <SidebarHeader className="p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#6b2fa5] flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base md:text-lg">S</span>
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-sm md:text-base truncate">Spotix</h2>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{dashboardLabel}</p>
            </div>
          </div>
        </SidebarHeader>

        <Separator />

        <SidebarContent className="p-1.5 md:p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push(tasksHref)}
                isActive={isCurrentPage(tasksHref)}
                className="w-full justify-start text-sm cursor-pointer"
              >
                <ClipboardList className={`w-4 h-4 flex-shrink-0 ${isCurrentPage(tasksHref) ? "text-[#6b2fa5]" : ""}`} />
                <span className="truncate">Tasks</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* Switch role section */}
          {switchableRoles.length > 0 && (
            <div className="mt-4 px-1">
              <Separator className="mb-3" />
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-1">Switch to</p>
              {switchableRoles.map((role) => (
                <SidebarMenuItem key={role}>
                  <SidebarMenuButton
                    onClick={() => handleSwitchRole(role)}
                    className="w-full justify-start text-sm cursor-pointer text-gray-500"
                  >
                    <SwitchCamera className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{ROLE_LABEL[role] ?? role}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>
          )}
        </SidebarContent>

        <Separator />

        <SidebarFooter className="p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-[#6b2fa5] flex-shrink-0">
              {user.profilePicture ? (
                <Image src={user.profilePicture} alt={user.username} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <Image src="/TempUser.svg" alt="Default user" width={40} height={40} className="object-cover w-full h-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs md:text-sm text-gray-900 truncate">{user.username}</p>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            disabled={loggingOut || switchingRole}
            variant="outline"
            className="w-full border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5] hover:text-white bg-transparent text-xs md:text-sm"
            size="sm"
          >
            {loggingOut
              ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /><span>Logging out…</span></>
              : <><LogOut className="w-3 h-3 mr-1.5" /><span>Logout</span></>
            }
          </Button>
        </SidebarFooter>
      </Sidebar>

      {/* No h-screen here — SidebarProvider owns the height */}
      <SidebarInset>
        <header className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-4 flex-shrink-0">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4 md:h-6" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm md:text-lg font-semibold text-gray-900 truncate">
              {getGreeting()}, {user.username}
            </h1>
            <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">{dashboardLabel}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 bg-gray-50 pb-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
