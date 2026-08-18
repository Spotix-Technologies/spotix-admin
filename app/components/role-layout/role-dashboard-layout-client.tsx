// Shared layout for all non-admin role dashboards
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { ClipboardList, LogOut, Loader2, SwitchCamera, FolderOpen, Receipt, Globe, Vote, ShieldCheck, CalendarDays, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarInset, SidebarTrigger, SidebarCollapseToggle, useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getDicebearAvatarUrl } from "@/lib/dicebear"

export interface RoleUser {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
  role: string
  secondaryRoles: string[]
}

interface ExtraNavItem {
  label: string
  href: string
  iconName: "FolderOpen" | "Receipt" | "Globe" | string
}

interface RoleDashboardLayoutClientProps {
  user: RoleUser
  children: React.ReactNode
  dashboardLabel: string
  basePath: string
  extraNavItems?: ExtraNavItem[]
}

const ICON_MAP: Record<string, React.ElementType> = {
  FolderOpen,
  Receipt,
  Globe,
  Vote,
  ShieldCheck,
  CalendarDays,
  UserCheck,
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

/* ── Inner sidebar that reads useSidebar context ── */
function SidebarInner({
  user, dashboardLabel, basePath, extraNavItems = [],
}: {
  user: RoleUser
  dashboardLabel: string
  basePath: string
  extraNavItems: ExtraNavItem[]
}) {
  const router   = useRouter()
  const pathname = usePathname()
  const { desktopCollapsed } = useSidebar()
  const [loggingOut,    setLoggingOut]    = useState(false)
  const [switchingRole, setSwitchingRole] = useState(false)

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

  const collapsed = desktopCollapsed

  return (
    <Sidebar className="border-r border-gray-200">
      {/* ── Header ── */}
      <SidebarHeader className="p-3 md:p-4">
        <div className={`flex items-center gap-2 md:gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#6b2fa5] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base md:text-lg">S</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-sm md:text-base truncate">Spotix</h2>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{dashboardLabel}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent className="p-1.5 md:p-2">
        <SidebarMenu>
          {/* Tasks (always present) */}
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

          {/* Extra nav items */}
          {extraNavItems.map((item) => {
            const Icon = ICON_MAP[item.iconName] ?? FolderOpen
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  onClick={() => router.push(item.href)}
                  isActive={isCurrentPage(item.href)}
                  className="w-full justify-start text-sm cursor-pointer"
                  tooltip={item.label}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isCurrentPage(item.href) ? "text-[#6b2fa5]" : ""}`} />
                  <span className="truncate">{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* Switch role section */}
        {switchableRoles.length > 0 && (
          <div className="mt-4 px-1">
            <Separator className="mb-3" />
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2 mb-1">Switch to</p>
            )}
            {switchableRoles.map((role) => (
              <SidebarMenuItem key={role}>
                <SidebarMenuButton
                  onClick={() => handleSwitchRole(role)}
                  tooltip={ROLE_LABEL[role] ?? role}
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

      {/* ── Footer ── */}
      <SidebarFooter className="p-3 md:p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-[#6b2fa5] flex-shrink-0">
              {user.profilePicture ? (
                <Image src={user.profilePicture} alt={user.username} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <Image src={getDicebearAvatarUrl(user.uid, 40)} alt={user.username} width={40} height={40} className="object-cover w-full h-full" unoptimized />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-xs md:text-sm text-gray-900 truncate">{user.username}</p>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex justify-center mb-2">
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#6b2fa5]">
              {user.profilePicture ? (
                <Image src={user.profilePicture} alt={user.username} width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                <Image src={getDicebearAvatarUrl(user.uid, 32)} alt={user.username} width={32} height={32} className="object-cover w-full h-full" unoptimized />
              )}
            </div>
          </div>
        )}
        <Button
          onClick={handleLogout}
          disabled={loggingOut || switchingRole}
          variant="outline"
          className={`w-full border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5] hover:text-white bg-transparent text-xs md:text-sm ${collapsed ? "lg:px-2" : ""}`}
          size="sm"
          title="Logout"
        >
          {loggingOut ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <LogOut className="w-3 h-3" />
          )}
          {!collapsed && (
            <span className="ml-1.5">{loggingOut ? "Logging out…" : "Logout"}</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

/* ── Root layout client ── */
export function RoleDashboardLayoutClient({
  user, children, dashboardLabel, basePath, extraNavItems = [],
}: RoleDashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <SidebarInner
        user={user}
        dashboardLabel={dashboardLabel}
        basePath={basePath}
        extraNavItems={extraNavItems}
      />

      <SidebarInset>
        <header className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Mobile hamburger */}
          <SidebarTrigger className="-ml-1" />
          {/* Desktop collapse toggle */}
          <SidebarCollapseToggle className="-ml-1" />
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
