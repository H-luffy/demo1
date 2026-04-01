
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../lib/utils"

const Toast = ({ message, type = "info", onClose }) => {
  const typeStyles = {
    success: "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-200",
    error: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-200",
    info: "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200",
    warning: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg shadow-yellow-200",
  }

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-5 py-3.5 shadow-xl backdrop-blur-sm",
        typeStyles[type]
      )}
    >
      <span className="text-sm font-semibold">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 rounded-full p-1 hover:bg-white/20 transition-all duration-200 hover:scale-110"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export { Toast }
