
import * as React from "react"
import { cn } from "../lib/utils"

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        {
          "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-md hover:shadow-lg": variant === "primary",
          "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "secondary",
          "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-md hover:shadow-lg": variant === "success",
          "bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-lg": variant === "danger",
          "bg-blue-100 text-blue-700 hover:bg-blue-200": variant === "info",
          "h-10 px-4 py-2": size === "default",
          "h-9 px-3 text-xs": size === "sm",
          "h-11 px-8 text-base": size === "lg",
        },
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button }
