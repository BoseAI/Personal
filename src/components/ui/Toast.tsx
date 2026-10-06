import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Toast = { id: number; message: string; action?: { label: string; onClick: () => void } }
type ShowToast = (t: Omit<Toast, 'id'>, durationMs?: number) => void

const ToastContext = createContext<ShowToast>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<ShowToast>((t, durationMs = 4000) => {
    window.clearTimeout(timer.current)
    const id = Date.now()
    setToast({ ...t, id })
    timer.current = window.setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), durationMs)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex max-w-sm items-center gap-4 rounded-2xl border border-line-strong bg-surface-3 py-2.5 pr-2.5 pl-4 text-sm shadow-2xl"
            >
              <span className="text-fg">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action!.onClick()
                    setToast(null)
                  }}
                  className="rounded-lg px-2.5 py-1 font-semibold text-accent hover:bg-surface-2"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
