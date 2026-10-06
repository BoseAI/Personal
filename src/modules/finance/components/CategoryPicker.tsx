import { IconChip } from '../../../components/ui/IconChip'
import { tint } from '../../../lib/colors'
import { cn } from '../../../lib/cn'
import type { Category, CategoryNode } from '../types'

/** Griglia delle categorie principali + chip delle sottocategorie della selezionata. */
export function CategoryPicker({
  tree,
  value,
  onChange,
  all,
}: {
  tree: CategoryNode[]
  value: string | null
  onChange: (id: string) => void
  all: Category[]
}) {
  const selected = all.find((c) => c.id === value)
  const parentId = selected ? (selected.parent_id ?? selected.id) : null
  const parent = tree.find((p) => p.id === parentId)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {tree.map((c) => {
          const active = c.id === parentId
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition',
                active ? 'border-transparent' : 'border-line hover:bg-surface-2',
              )}
              style={active ? { background: tint(c.color, 0.14), borderColor: c.color } : undefined}
            >
              <IconChip icon={c.icon} color={c.color} size="sm" />
              <span className="line-clamp-2 text-center text-[11px] leading-tight text-muted">{c.name}</span>
            </button>
          )
        })}
      </div>
      {parent && parent.children.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[parent, ...parent.children].map((c) => {
            const active = c.id === value
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition',
                  active ? 'border-transparent text-fg' : 'border-line text-muted hover:bg-surface-2',
                )}
                style={active ? { background: tint(parent.color, 0.22), borderColor: parent.color } : undefined}
              >
                {c.id === parent.id ? 'Generale' : c.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** "Auto › Benzina" */
export function categoryPath(c: Category | undefined, all: Category[]): string {
  if (!c) return 'Categoria eliminata'
  const parent = c.parent_id ? all.find((p) => p.id === c.parent_id) : undefined
  return parent ? `${parent.name} › ${c.name}` : c.name
}

/** Icona/colore: la sottocategoria eredita il colore del padre. */
export function categoryVisual(c: Category | undefined, all: Category[]): { icon: string; color: string } {
  if (!c) return { icon: 'circle', color: '#8f8e88' }
  const parent = c.parent_id ? all.find((p) => p.id === c.parent_id) : undefined
  return { icon: c.icon, color: parent?.color ?? c.color }
}
