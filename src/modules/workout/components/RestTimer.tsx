import { Minus, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Barra del recupero: conto alla rovescia con ±15 s; vibra (dove supportato) alla fine. */
export function RestTimer({ endsAt, total, onChange, onClose }: { endsAt: number; total: number; onChange: (endsAt: number) => void; onClose: () => void }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [])
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
  useEffect(() => {
    if (left === 0) {
      navigator.vibrate?.([200, 100, 200])
      const t = window.setTimeout(onClose, 1500)
      return () => window.clearTimeout(t)
    }
  }, [left, onClose])

  const share = total > 0 ? left / total : 0
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-4 pb-2">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-line-strong bg-surface-3 shadow-2xl">
        <div className="h-1 bg-surface-2">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${share * 100}%` }} />
        </div>
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="text-xs text-muted">{left ? 'Recupero' : 'Via!'}</span>
          <span className="num flex-1 text-2xl font-semibold">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
          <button type="button" aria-label="Meno 15 secondi" onClick={() => onChange(endsAt - 15000)} className="flex size-9 items-center justify-center rounded-xl bg-surface-2">
            <Minus className="size-4" />
          </button>
          <button type="button" aria-label="Più 15 secondi" onClick={() => onChange(endsAt + 15000)} className="flex size-9 items-center justify-center rounded-xl bg-surface-2">
            <Plus className="size-4" />
          </button>
          <button type="button" aria-label="Salta recupero" onClick={onClose} className="flex size-9 items-center justify-center rounded-xl bg-surface-2">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
