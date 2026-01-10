import * as React from "react"

interface SeparatorProps {
  orientation?: "horizontal" | "vertical"
  className?: string
  decorative?: boolean
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = "horizontal", className = "", decorative = true }, ref) => {
    return (
      <div
        ref={ref}
        role={decorative ? "none" : "separator"}
        aria-orientation={orientation}
        className={`
          shrink-0 bg-gray-200
          ${orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]"}
          ${className}
        `}
      />
    )
  }
)
Separator.displayName = "Separator"