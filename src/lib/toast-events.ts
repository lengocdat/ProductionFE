type ToastVariant = 'default' | 'success' | 'error' | 'warning'

interface ToastEvent {
  title: string
  description?: string
  variant?: ToastVariant
}

type ToastListener = (event: ToastEvent) => void

// Simple event emitter for toast notifications from outside React tree (e.g., axios interceptors)
class ToastEventBus {
  private listeners: ToastListener[] = []

  subscribe(listener: ToastListener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener)
    }
  }

  emit(event: ToastEvent) {
    this.listeners.forEach((listener) => listener(event))
  }
}

export const toastEvents = new ToastEventBus()
