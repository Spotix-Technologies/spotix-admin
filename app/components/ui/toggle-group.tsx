import * as React from "react"

interface ToggleGroupProps {
  type: "single" | "multiple"
  value?: string | string[]
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

const ToggleGroupContext = React.createContext<{
  value?: string | string[]
  onValueChange?: (value: string) => void
  type: "single" | "multiple"
}>({
  type: "single",
})

export const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  ({ className = "", type, value, onValueChange, children, ...props }, ref) => {
    return (
      <ToggleGroupContext.Provider value={{ value, onValueChange, type }}>
        <div
          ref={ref}
          className={`inline-flex items-center justify-center rounded-lg bg-gray-100 p-1 ${className}`}
          role="group"
          {...props}
        >
          {children}
        </div>
      </ToggleGroupContext.Provider>
    )
  }
)
ToggleGroup.displayName = "ToggleGroup"

interface ToggleGroupItemProps {
  value: string
  "aria-label"?: string
  className?: string
  children: React.ReactNode
}

export const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className = "", value, children, ...props }, ref) => {
    const context = React.useContext(ToggleGroupContext)
    
    const isSelected = context.type === "single" 
      ? context.value === value
      : Array.isArray(context.value) && context.value.includes(value)

    const handleClick = () => {
      if (context.onValueChange) {
        context.onValueChange(value)
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isSelected}
        data-state={isSelected ? "on" : "off"}
        onClick={handleClick}
        className={`
          inline-flex items-center justify-center rounded-md px-3 py-1.5
          text-sm font-medium transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b2fa5] focus-visible:ring-offset-2
          disabled:pointer-events-none disabled:opacity-50
          ${
            isSelected
              ? "bg-[#6b2fa5] text-white shadow-sm"
              : "text-gray-700 hover:bg-gray-200 hover:text-gray-900"
          }
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)
ToggleGroupItem.displayName = "ToggleGroupItem"