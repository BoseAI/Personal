import { useState } from 'react'
import { formatDayHeader, toISODate, today } from '../../../lib/dates'
import { formatEUR } from '../../../lib/format'
import { cn } from '../../../lib/cn'

const WEEKDAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const STEPS = [0.14, 0.32, 0.55, 0.8, 1]

/** Mappa di calore del mese: intensità = quanto hai speso quel giorno (scala a 5 livelli). */
export function SpendingCalendar({ year, month, byDay }: { year: number; month: number; byDay: Map<string, number> }) {
  const [selected, setSelected] = useState<string | null>(null)
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const offset = (first.getDay() + 6) % 7 // lunedì = 0
  const max = Math.max(0, ...byDay.values())
  const t = today()
  const level = (v: number) => (v <= 0 || max <= 0 ? -1 : Math.min(4, Math.floor((v / max) * 5 - 1e-9)))
  const sel = selected ?? null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center font-mono text-[10px] text-faint">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const iso = toISODate(new Date(year, month, i + 1))
          const value = byDay.get(iso) ?? 0
          const l = level(value)
          const future = iso > t
          return (
            <button
              key={iso}
              type="button"
              disabled={future}
              onClick={() => setSelected(sel === iso ? null : iso)}
              aria-label={`${i + 1}: ${formatEUR(value)}`}
              className={cn(
                'num relative flex aspect-square items-center justify-center rounded-lg text-[11px] transition',
                l < 0 && 'bg-surface-2 text-faint',
                future && 'opacity-30',
                iso === t && 'ring-1 ring-fg/60',
                sel === iso && 'ring-2 ring-fg',
              )}
              style={l >= 0 ? { background: `color-mix(in srgb, var(--series-expense) ${STEPS[l] * 100}%, var(--surface-2))`, color: l >= 3 ? '#fff' : undefined } : undefined}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between gap-3 px-0.5 text-xs">
        <span className="truncate text-muted">
          {sel ? (
            <>
              {formatDayHeader(sel)}: <span className="num font-medium text-fg">{formatEUR(byDay.get(sel) ?? 0)}</span>
            </>
          ) : (
            'Tocca un giorno per il dettaglio'
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-faint">
          meno
          {STEPS.map((s) => (
            <span key={s} className="size-2.5 rounded-sm" style={{ background: `color-mix(in srgb, var(--series-expense) ${s * 100}%, var(--surface-2))` }} />
          ))}
          più
        </span>
      </div>
    </div>
  )
}
