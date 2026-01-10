import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    const baseClasses =
      "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none focus:ring-[#6b2fa5] focus:ring-offset-background"
    
    let variantClasses = ""
    switch (variant) {
      case "outline":
        variantClasses =
          "border border-[#6b2fa5] text-[#6b2fa5] hover:bg-[#6b2fa5]/10"
        break
      case "ghost":
        variantClasses = "text-[#6b2fa5] hover:bg-[#6b2fa5]/10"
        break
      default:
        variantClasses =
          "bg-[#6b2fa5] text-white hover:bg-[#5a2889]"
    }

    let sizeClasses = ""
    switch (size) {
      case "sm":
        sizeClasses = "h-8 px-3 text-xs"
        break
      case "lg":
        sizeClasses = "h-12 px-8 text-base"
        break
      default: // md
        sizeClasses = "h-10 px-4 text-sm"
    }

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }