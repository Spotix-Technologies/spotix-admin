// components/ui/input.tsx
import * as React from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`
          flex h-11 w-full rounded-xl border px-4 py-2 text-sm transition-colors
          bg-white/10 border-white/20 text-white placeholder:text-white/50
          focus:outline-none focus:ring-2 focus:ring-[#6b2fa5] focus:border-[#6b2fa5]
          disabled:cursor-not-allowed disabled:opacity-50
          ${className}
        `}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
