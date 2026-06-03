"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "rounded-xl shadow-lg border border-gray-200 bg-white text-gray-900",
          title: "text-sm font-medium",
          description: "text-xs text-gray-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
