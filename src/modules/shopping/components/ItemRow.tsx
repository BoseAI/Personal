import { Check } from 'lucide-react'
import { tint } from '../../../lib/colors'
import { cn } from '../../../lib/cn'
import type { ShoppingItem } from '../types'

export function ItemRow({
  item,
  color,
  canEdit,
  onToggle,
  onOpen,
  subtitle,
}: {
  item: ShoppingItem
  color: string
  canEdit: boolean
  onToggle: () => void
  onOpen: () => void
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-1 pr-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={item.checked ? `Togli spunta a ${item.name}` : `Spunta ${item.name}`}
        disabled={!canEdit}
        onClick={onToggle}
        className="flex size-12 shrink-0 items-center justify-center"
      >
        <span
          className={cn('flex size-6 items-center justify-center rounded-full border-2 transition', !item.checked && 'border-line-strong')}
          style={item.checked ? { background: color, borderColor: color } : undefined}
        >
          {item.checked && <Check className="size-3.5 text-black" strokeWidth={3} />}
        </span>
      </button>
      <button type="button" onClick={onOpen} disabled={!canEdit} className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[15px] transition', item.checked && 'text-faint line-through')}>{item.name}</span>
          {subtitle && <span className="block truncate text-xs text-faint">{subtitle}</span>}
        </span>
        {item.quantity > 1 && (
          <span
            className={cn('num shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium', item.checked && 'opacity-50')}
            style={{ background: tint(color, 0.16), color }}
          >
            ×{item.quantity}
          </span>
        )}
      </button>
    </div>
  )
}
