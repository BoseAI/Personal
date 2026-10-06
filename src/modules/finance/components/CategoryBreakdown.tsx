import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '../../../components/ui/Card'
import { IconChip } from '../../../components/ui/IconChip'
import { formatEUR } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import { buildTree } from '../api'
import type { Category, CategoryKind } from '../types'

export type Totals = { category_id: string; total: number; count: number }[]

export type CategoryRow = Category & { total: number; children: (Category & { total: number })[] }

/** Totali per categoria principale (con sottocategorie), ordinati per importo. */
export function categoryRows(categories: Category[], totals: Totals, kind: CategoryKind): CategoryRow[] {
  const totalOf = new Map(totals.map((t) => [t.category_id, t.total]))
  return buildTree(categories, kind, true)
    .map((p) => {
      const own = totalOf.get(p.id) ?? 0
      const children = p.children
        .map((c) => ({ ...c, total: totalOf.get(c.id) ?? 0 }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total)
      if (own > 0 && children.length) children.push({ ...p, name: 'Generale', total: own })
      return { ...p, total: own + children.reduce((s, c) => s + (c.id === p.id ? 0 : c.total), 0), children }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
}

/** Ripartizione per categoria con barre di quota e drill-down sulle sottocategorie. */
export function CategoryBreakdown({
  categories,
  totals,
  kind,
  expanded: controlled,
  onExpand,
}: {
  categories: Category[]
  totals: Totals
  kind: CategoryKind
  expanded?: string | null
  onExpand?: (id: string | null) => void
}) {
  const [local, setLocal] = useState<string | null>(null)
  const expanded = controlled !== undefined ? controlled : local
  const setExpanded = onExpand ?? setLocal
  const rows = categoryRows(categories, totals, kind)

  const grand = rows.reduce((s, r) => s + r.total, 0)
  if (!rows.length) return <EmptyState title={kind === 'expense' ? 'Nessuna uscita nel periodo' : 'Nessuna entrata nel periodo'} />

  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {rows.map((r) => {
        const open = expanded === r.id
        const share = grand ? r.total / grand : 0
        return (
          <div key={r.id}>
            <button
              type="button"
              onClick={() => setExpanded(open ? null : r.id)}
              disabled={!r.children.length}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition enabled:hover:bg-surface-2"
            >
              <IconChip icon={r.icon} color={r.color} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm">{r.name}</span>
                  <span className="num text-sm font-medium">{formatEUR(r.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: r.color }} />
                  </div>
                  <span className="num w-10 text-right text-[11px] text-faint">{Math.round(share * 100)}%</span>
                </div>
              </div>
              <ChevronRight className={cn('size-4 text-faint transition', open && 'rotate-90', !r.children.length && 'invisible')} />
            </button>
            {open && (
              <div className="bg-surface-2/50 pb-1">
                {r.children.map((c) => (
                  <div key={c.id + c.name} className="flex items-center gap-3 py-2 pr-10 pl-6">
                    <IconChip icon={c.icon} color={r.color} size="sm" />
                    <span className="flex-1 truncate text-sm text-muted">{c.name}</span>
                    <span className="num text-xs text-faint">{Math.round((c.total / r.total) * 100)}%</span>
                    <span className="num w-24 text-right text-sm">{formatEUR(c.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
