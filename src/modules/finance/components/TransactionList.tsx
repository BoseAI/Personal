import { Clock, Link2, Repeat } from 'lucide-react'
import { IconChip } from '../../../components/ui/IconChip'
import { formatDayHeader, formatShortDate } from '../../../lib/dates'
import { formatEUR, formatSigned } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import type { Category, Profile, Transaction } from '../types'
import { categoryPath, categoryVisual } from './CategoryPicker'

export function TransactionRow({
  tx,
  categories,
  author,
  onClick,
  showDate,
}: {
  tx: Transaction
  categories: Category[]
  author?: string
  onClick: () => void
  showDate?: boolean
}) {
  const cat = categories.find((c) => c.id === tx.category_id)
  const visual = categoryVisual(cat, categories)
  const kind = cat?.kind ?? 'expense'
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-2">
      <IconChip icon={visual.icon} color={visual.color} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{tx.description || categoryPath(cat, categories)}</div>
        <div className="flex items-center gap-1.5 truncate text-xs text-faint">
          {tx.status === 'pending' && <Clock className="size-3 text-warning" aria-label="Da confermare" />}
          {tx.recurring_id && <Repeat className="size-3" aria-label="Ricorrente" />}
          {tx.transfer_source_id && <Link2 className="size-3" aria-label="Versamento" />}
          <span className="truncate">
            {tx.description ? categoryPath(cat, categories) : null}
            {showDate && `${tx.description ? ' · ' : ''}${formatShortDate(tx.date)}`}
            {author && ` · ${author}`}
          </span>
        </div>
      </div>
      <span className={cn('num text-sm font-medium', kind === 'income' ? 'text-positive' : 'text-fg', tx.status === 'pending' && 'opacity-50')}>
        {formatSigned(tx.amount, kind)}
      </span>
    </button>
  )
}

export function TransactionList({
  transactions,
  categories,
  profiles,
  onSelect,
}: {
  transactions: Transaction[]
  categories: Category[]
  profiles?: Profile[]
  onSelect: (tx: Transaction) => void
}) {
  const days = new Map<string, Transaction[]>()
  for (const t of transactions) days.set(t.date, [...(days.get(t.date) ?? []), t])
  const kindOf = (t: Transaction) => categories.find((c) => c.id === t.category_id)?.kind

  return (
    <div className="space-y-4">
      {[...days].map(([day, txs]) => {
        const net = txs
          .filter((t) => t.status === 'confirmed')
          .reduce((s, t) => s + (kindOf(t) === 'income' ? t.amount : -t.amount), 0)
        return (
          <section key={day}>
            <div className="mb-1.5 flex items-center justify-between px-1 text-xs">
              <span className="font-medium text-muted">{formatDayHeader(day)}</span>
              <span className="num text-faint">{formatEUR(net)}</span>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {txs.map((t) => (
                <TransactionRow
                  key={t.id}
                  tx={t}
                  categories={categories}
                  author={profiles && profiles.length > 1 ? profiles.find((p) => p.id === t.created_by)?.display_name : undefined}
                  onClick={() => onSelect(t)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
