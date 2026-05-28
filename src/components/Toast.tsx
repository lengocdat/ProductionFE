import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { toastEvents } from '@/lib/toast-events'

type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface ToastItem {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (opts: { title: string; description?: string; variant?: ToastVariant }) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

const variantStyles: Record<ToastVariant, string> = {
  default: 'border-border bg-card text-foreground',
  success: 'border-green-500/30 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  error: 'border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
  warning: 'border-yellow-500/30 bg-yellow-50 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback(({ title, description, variant = 'default' }: { title: string; description?: string; variant?: ToastVariant }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, title, description, variant }])
  }, [])

  // Subscribe to toast events from outside React (e.g., axios interceptors)
  useEffect(() => {
    const unsubscribe = toastEvents.subscribe(({ title, description, variant }) => {
      toast({ title, description, variant })
    })
    return unsubscribe
  }, [toast])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={`rounded-lg border p-4 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-full ${variantStyles[t.variant]}`}
            onOpenChange={(open) => {
              if (!open) removeToast(t.id)
            }}
          >
            <ToastPrimitive.Title className="text-sm font-semibold">
              {t.title}
            </ToastPrimitive.Title>
            {t.description && (
              <ToastPrimitive.Description className="mt-1 text-xs opacity-80">
                {t.description}
              </ToastPrimitive.Description>
            )}
            <ToastPrimitive.Close
              className="absolute right-2 top-2 rounded-md p-1 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="Đóng"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex max-w-[380px] flex-col gap-2" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  )
}
