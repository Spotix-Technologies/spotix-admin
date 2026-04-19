// app/components/ui/sidebar.tsx

import * as React from "react"
import { Menu } from "lucide-react"

interface SidebarContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextValue>({
  open: true,
  setOpen: () => {},
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

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
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
    const { open } = useSidebar()
    return (
      <aside
        ref={ref}
        className={`bg-white transition-all duration-300 ease-in-out fixed left-0 top-0 h-[100dvh] z-40 ${open ? "w-64" : "w-0 overflow-hidden"} lg:relative lg:w-64 lg:flex-shrink-0 ${className}`}
      >
        <div className="flex flex-col h-full">{children}</div>
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
  ({ children, onClick, isActive, className = "", tooltip }, ref) => (
    <button
      ref={ref}
      onClick={onClick}
      title={tooltip}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 w-full hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b2fa5] ${isActive ? "bg-[#6b2fa5]/10 text-[#6b2fa5]" : "text-gray-700"} ${className}`}
    >
      {children}
    </button>
  )
)
SidebarMenuButton.displayName = "SidebarMenuButton"

export const SidebarInset = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className = "" }, ref) => (
    // No h-[100dvh] here — SidebarProvider owns it. flex-1 fills remaining space.
    <div ref={ref} className={`flex flex-col flex-1 min-w-0 overflow-hidden ${className}`}>
      {children}
    </div>
  )
)
SidebarInset.displayName = "SidebarInset"

interface SidebarTriggerProps {
  className?: string
}

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
