import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextValue {
  toast: {
    success: (message: string, duration?: number) => void
    error: (message: string, duration?: number) => void
    info: (message: string, duration?: number) => void
    warning: (message: string, duration?: number) => void
  }
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = crypto.randomUUID()
    const newToast: Toast = { id, message, type, duration }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duration)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: useCallback((msg: string, dur?: number) => addToast(msg, 'success', dur), [addToast]),
    error: useCallback((msg: string, dur?: number) => addToast(msg, 'error', dur), [addToast]),
    info: useCallback((msg: string, dur?: number) => addToast(msg, 'info', dur), [addToast]),
    warning: useCallback((msg: string, dur?: number) => addToast(msg, 'warning', dur), [addToast]),
  }

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  }

  const bgStyles = {
    success: 'bg-emerald-600 text-white shadow-emerald-500/20 border-emerald-500',
    error: 'bg-red-600 text-white shadow-red-500/20 border-red-500',
    info: 'bg-indigo-600 text-white shadow-indigo-500/20 border-indigo-500',
    warning: 'bg-amber-600 text-white shadow-amber-500/20 border-amber-500',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold backdrop-blur-md animate-fade-in-up transition-all ${bgStyles[t.type]}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-sm shrink-0">{icons[t.type]}</span>
              <span className="truncate leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-white/80 hover:text-white text-xs font-bold p-1 shrink-0"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue['toast'] {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx.toast
}
