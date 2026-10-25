import { useState, useCallback } from 'react'
import type { ToastMessage } from '../types/astronomy'

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((title: string, description?: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const newToast: ToastMessage = {
      id,
      title,
      description,
      type,
      timestamp: new Date().toLocaleTimeString(),
    }
    
    setToasts((prev) => [...prev, newToast])

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return {
    toasts,
    addToast,
    removeToast,
  }
}
