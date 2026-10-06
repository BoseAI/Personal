import { Minus, Plus } from 'lucide-react'
import { cn } from '../../../lib/cn'

export function QuantityStepper({ value, onChange, size = 'md' }: { value: number; onChange: (v: number) => void; size?: 'sm' | 'md' }) {
  const btn = cn('flex items-center justify-center rounded-lg text-muted transition hover:bg-surface-3 hover:text-fg disabled:opacity-30', size === 'sm' ? 'size-7' : 'size-9')
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-surface-2 p-0.5">
      <button type="button" aria-label="Diminuisci" className={btn} disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
        <Minus className="size-4" />
      </button>
      <span className={cn('num text-center font-medium', size === 'sm' ? 'w-6 text-sm' : 'w-9')}>{value}</span>
      <button type="button" aria-label="Aumenta" className={btn} disabled={value >= 9999} onClick={() => onChange(Math.min(9999, value + 1))}>
        <Plus className="size-4" />
      </button>
    </div>
  )
}
