// app/admin-dashboard/dashboard-layout-client.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import {
  Home, Receipt, CalendarDays, FileText, Vote,
  ShoppingBag, Wallet, Users, UserPlus, Download,
  Settings, LogOut, Loader2, ClipboardList,
  SwitchCamera, FolderOpen, Globe, ShieldCheck, UserCheck, Landmark,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarInset, SidebarTrigger, SidebarCollapseToggle, useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { getDicebearAvatarUrl } from "@/lib/dicebear"

interface User {
  uid: string
  username: string
  fullName: string
  profilePicture: string | null
  role: string
  secondaryRoles: string[]
}

interface DashboardLayoutClientProps {
  user: User
  children: React.ReactNode
}

// `roles: undefined` means every admin type can see the item.
// Otherwise only the listed roles (checked against primary or secondary role) can.
const menuItems = [
  { id: "home",          label: "Home",          icon: Home,          href: "/admin-dashboard",                   active: true,  roles: ["admin"] },
  { id: "references",   label: "References",   icon: Receipt,       href: "/admin-dashboard/references",        active: true  },
  { id: "event-data",   label: "Event Data",   icon: CalendarDays,  href: "/admin-dashboard/event-data",        active: true,  roles: ["admin", "customer-support", "exec-assistant"] },
  { id: "upload-events",label: "Upload Events",icon: Globe,         href: "/admin-dashboard/upload-events",     active: true  },
  { id: "users",        label: "Users",        icon: Users,         href: "/admin-dashboard/users",             active: true,  roles: ["admin"] },
  { id: "verification", label: "Verification", icon: ShieldCheck,   href: "/admin-dashboard/verification",      active: true,  roles: ["admin", "customer-support", "exec-assistant"] },
  { id: "agent-verification", label: "Agent Verification", icon: UserCheck, href: "/admin-dashboard/agent-verification", active: true, roles: ["admin", "customer-support"] },
  { id: "tasks",      label: "Tasks",      icon: ClipboardList, href: "/admin-dashboard/tasks",      active: true,  roles: ["admin"] },
  { id: "reports",    label: "Reports",    icon: FileText,      href: "/admin-dashboard/reports",    active: false, roles: ["admin"] },
  { id: "votes",      label: "Votes",      icon: Vote,          href: "/admin-dashboard/votes",      active: true  },
  { id: "merch",      label: "Merch",      icon: ShoppingBag,   href: "/admin-dashboard/merch",      active: false, roles: ["admin"] },
  { id: "payouts",    label: "Payouts",    icon: Wallet,        href: "/admin-dashboard/payouts",    active: false, roles: ["admin"] },
  { id: "transfers",  label: "Transfers",  icon: Landmark,      href: "/admin-dashboard/transfers",  active: true,  roles: ["admin"] },
  { id: "onboard",    label: "Onboard",    icon: UserPlus,      href: "/admin-dashboard/onboard",    active: true,  roles: ["admin"] },
  { id: "export",     label: "Export",     icon: Download,      href: "/admin-dashboard/export",     active: false, roles: ["admin"] },
  { id: "globals",    label: "Globals",    icon: Settings,      href: "/admin-dashboard/globals",    active: true,  roles: ["admin"] },
  { id: "documents",  label: "Documents",  icon: FolderOpen,    href: "/admin-dashboard/documents",  active: true  },
] as const

const ROLE_DASHBOARD: Record<string, string> = {
  "exec-assistant":    "/exec-assistant-dashboard",
  "customer-support":  "/customer-support-dashboard",
  "marketing":         "/marketing-dashboard",
  "IT":                "/it-dashboard",
}

const ROLE_LABEL: Record<string, string> = {
  admin:              "Admin",
  "exec-assistant":   "Exec Assistant",
  "customer-support": "Customer Support",
  marketing:          "Marketing",
  IT:                 "IT",
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

/* ── Inner sidebar that can read useSidebar context ── */
function SidebarInner({ user }: { user: User }) {
  const router = useRouter()
  const pathname = usePathname()
  const { desktopCollapsed } = useSidebar()
  const [loggingOut, setLoggingOut] = useState(false)
  const [switchingRole, setSwitchingRole] = useState(false)
  const [showSwitch, setShowSwitch] = useState(false)

  const switchableRoles = user.secondaryRoles.filter((r) => r !== "admin")

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
    setShowSwitch(false)
    try {
      const res = await fetch("/api/v1/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole }),
      })
      if (res.ok) {
        const dest = ROLE_DASHBOARD[targetRole]
        if (dest) router.push(dest)
      }
    } finally {
      setSwitchingRole(false)
    }
  }

  const isCurrentPage = (href: string) => {
    if (href === "/admin-dashboard") return pathname === "/admin-dashboard"
    return pathname.startsWith(href)
  }

  const collapsed = desktopCollapsed

  // Hide sidebar items the current admin isn't allowed to open at all
  // (items with no `roles` list are visible to every admin type).
  const visibleMenuItems = menuItems.filter((item) => {
    const roles = (item as { roles?: readonly string[] }).roles
    if (!roles) return true
    return roles.includes(user.role) || user.secondaryRoles.some((r) => roles.includes(r))
  })

  return (
    <Sidebar className="border-r border-gray-200">
      {/* ── Header ── */}
      <SidebarHeader className="p-3 md:p-4">
        <div className={`flex items-center gap-2 md:gap-3 ${collapsed ? "lg:justify-center" : ""}`}>
          {/* Logo — always visible */}
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-[#6b2fa5] flex items-center justify-center flex-shrink-0 overflow-hidden">
            <Image
              src="/logo.png"
              alt="Spotix"
              width={40}
              height={40}
              className="object-contain w-full h-full"
              onError={(e) => {
                // Fallback to "S" if logo.png not yet present
                const target = e.currentTarget as HTMLImageElement
                target.style.display = "none"
                const parent = target.parentElement
                if (parent && !parent.querySelector("span")) {
                  const span = document.createElement("span")
                  span.className = "text-white font-bold text-base"
                  span.textContent = "S"
                  parent.appendChild(span)
                }
              }}
            />
          </div>
          {/* Text — hidden when desktop-collapsed */}
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 text-sm md:text-base truncate">Spotix Admin</h2>
              <p className="text-[10px] md:text-xs text-gray-500 truncate">Management Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator />

      {/* ── Nav items ── */}
      <SidebarContent className="p-1.5 md:p-2">
        <SidebarMenu>
          {visibleMenuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={() => item.active && router.push(item.href)}
                isActive={isCurrentPage(item.href)}
                tooltip={!item.active ? "Coming soon" : item.label}
                className={`w-full justify-start text-sm ${!item.active ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 ${isCurrentPage(item.href) ? "text-[#6b2fa5]" : ""}`} />
                <span className="truncate">{item.label}</span>
                {!item.active && (
                  <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex-shrink-0">
                    Soon
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Switch Role */}
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
        {/* User info — hidden when collapsed */}
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
              <p className="text-[10px] md:text-xs text-gray-500 truncate">{ROLE_LABEL[user.role] ?? "Admin"}</p>
            </div>
          </div>
        ) : (
          /* Collapsed: just the avatar centred */
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

        {/* Logout button */}
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
            <span className="ml-1.5">{loggingOut ? "Logging out..." : "Logout"}</span>
          )}
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

/* ── Root layout client ── */
export function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  return (
    <SidebarProvider>
      <SidebarInner user={user} />

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
            <p className="text-xs md:text-sm text-gray-500 truncate hidden sm:block">Welcome to Spotix Admin Portal</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 bg-gray-50 pb-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
