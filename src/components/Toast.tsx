import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../lib/i18n'

interface ToastData {
  text: string
  actionLabel?: string
  onAction?: () => void
}

const Ctx = createContext<((t: ToastData) => void) | null>(null)

/** Dark bar at the bottom: confirmations, errors, and the 5-second Undo. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastData | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((t: ToastData) => {
    window.clearTimeout(timer.current)
    setToast(t)
    timer.current = window.setTimeout(() => setToast(null), t.onAction ? 5000 : 3000)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[104px] z-50 mx-auto w-full max-w-[480px] px-4">
        {toast && (
          <div role="status" className="pointer-events-auto flex items-center gap-3 rounded-[14px] bg-ink py-1.5 pl-4 pr-1.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            <span className="min-w-0 flex-1 py-2.5 text-[15px]">{toast.text}</span>
            {toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.()
                  setToast(null)
                }}
                className="h-11 rounded-[10px] px-3.5 text-[15px] font-bold text-[#F5C451]"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const show = useContext(Ctx)
  const { t } = useI18n()
  if (!show) throw new Error('useToast outside ToastProvider')
  return {
    show,
    error: (e: unknown) => {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine
      console.error(e)
      show({ text: offline ? t('offline') : t('errorGeneric') })
    },
  }
}
