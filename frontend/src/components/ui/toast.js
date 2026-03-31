
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../lib/utils"

const Toast = ({ message, type = "info", onClose }) => {
  const typeStyles = {
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
    info: "bg-blue-500 text-white",
    warning: "bg-yellow-500 text-white",
  }

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg",
        typeStyles[type]
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 rounded-full p-1 hover:bg-white/20 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export { Toast }
