// app/components/ui/sidebar.tsx
"use client"

import * as React from "react"
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react"

interface SidebarContextValue {
  open: boolean              // mobile panel open
  setOpen: (open: boolean) => void
  desktopCollapsed: boolean  // desktop icon-only mode
  setDesktopCollapsed: (v: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
  desktopCollapsed: false,
  setDesktopCollapsed: () => {},
})

export function useSidebar() {
  return React.useContext(SidebarContext)
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SidebarProvider({ children, defaultOpen = true }: SidebarProviderProps) {
  const [open, setOpen] = React.useState(defaultOpen)
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(false)

  return (
    <SidebarContext.Provider value={{ open, setOpen, desktopCollapsed, setDesktopCollapsed }}>
      <div className="flex h-[100dvh] w-full overflow-hidden">
        {open && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

interface SidebarProps {
  children: React.ReactNode
  className?: string
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => {
    const { open, desktopCollapsed } = useSidebar()
    return (
      <aside
        ref={ref}
        className={[
          "bg-white transition-all duration-300 ease-in-out",
          // Mobile: slide in/out
          "fixed left-0 top-0 h-[100dvh] z-40",
          open ? "w-64" : "w-0 overflow-hidden",
          // Desktop: always visible, full or icon-only
          "lg:relative lg:flex-shrink-0",
          desktopCollapsed ? "lg:w-14 lg:overflow-visible lg:w-14" : "lg:w-64",
          className,
        ].join(" ")}
      >
        <div className="flex flex-col h-full overflow-hidden">{children}</div>
      </aside>
    )
  }
)
Sidebar.displayName = "Sidebar"

export const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`flex-shrink-0 ${className}`}>{children}</div>
  )
)
SidebarHeader.displayName = "SidebarHeader"

export const SidebarContent = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`flex-1 overflow-y-auto min-h-0 ${className}`}>{children}</div>
  )
)
SidebarContent.displayName = "SidebarContent"

export const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`flex-shrink-0 ${className}`}>{children}</div>
  )
)
SidebarFooter.displayName = "SidebarFooter"

export const SidebarMenu = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    <nav ref={ref} className={`space-y-1 ${className}`}>{children}</nav>
  )
)
SidebarMenu.displayName = "SidebarMenu"

export const SidebarMenuItem = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={className}>{children}</div>
  )
)
SidebarMenuItem.displayName = "SidebarMenuItem"

interface SidebarMenuButtonProps {
  children: React.ReactNode
  onClick?: () => void
  isActive?: boolean
  className?: string
  tooltip?: string
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ children, onClick, isActive, className = "", tooltip }, ref) => {
    const { desktopCollapsed } = useSidebar()
    return (
      <button
        ref={ref}
        onClick={onClick}
        title={tooltip ?? (desktopCollapsed ? undefined : undefined)}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 w-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b2fa5] ${
          isActive ? "bg-[#6b2fa5]/10 text-[#6b2fa5]" : "text-gray-700"
        } ${desktopCollapsed ? "lg:justify-center lg:px-2" : ""} ${className}`}
      >
        {React.Children.map(children, (child, i) => {
          // First child (icon) always visible; subsequent children (text/badges) hidden when collapsed
          if (i === 0) return child
          return (
            <span key={i} className={desktopCollapsed ? "lg:hidden" : ""}>
              {child}
            </span>
          )
        })}
      </button>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

export const SidebarInset = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    <div ref={ref} className={`flex flex-col flex-1 min-w-0 overflow-hidden ${className}`}>
      {children}
    </div>
  )
)
SidebarInset.displayName = "SidebarInset"

interface SidebarTriggerProps {
  className?: string
}

/** Mobile-only trigger (hamburger) */
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className = "" }, ref) => {
    const { open, setOpen } = useSidebar()
    return (
      <button
        ref={ref}
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b2fa5] lg:hidden ${className}`}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>
    )
  }
)
SidebarTrigger.displayName = "SidebarTrigger"

/** Desktop-only collapse toggle (panel icon) */
export const SidebarCollapseToggle = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ className = "" }, ref) => {
    const { desktopCollapsed, setDesktopCollapsed } = useSidebar()
    return (
      <button
        ref={ref}
        onClick={() => setDesktopCollapsed(!desktopCollapsed)}
        className={`hidden lg:inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b2fa5] ${className}`}
        aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {desktopCollapsed
          ? <PanelLeftOpen className="h-5 w-5" />
          : <PanelLeftClose className="h-5 w-5" />
        }
      </button>
    )
  }
)
SidebarCollapseToggle.displayName = "SidebarCollapseToggle"

export const Separator = React.forwardRef<HTMLDivElement, { className?: string; orientation?: "horizontal" | "vertical" }>(
  ({ className = "", orientation = "horizontal" }, ref) => (
    <div
      ref={ref}
      className={orientation === "vertical" ? `w-px bg-gray-200 self-stretch ${className}` : `h-px bg-gray-200 ${className}`}
    />
  )
)
Separator.displayName = "Separator"
