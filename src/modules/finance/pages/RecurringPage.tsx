import { Clock, Plus, Repeat } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, EmptyState, SectionTitle } from '../../../components/ui/Card'
import { IconChip } from '../../../components/ui/IconChip'
import { PageLoader } from '../../../components/ui/Spinner'
import { formatShortDate } from '../../../lib/dates'
import { formatEUR, formatSigned } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import { useAccount } from '../AccountContext'
import { useCategories, useRecurring } from '../api'
import { categoryPath, categoryVisual } from '../components/CategoryPicker'
import { RecurringSheet } from '../components/RecurringSheet'
import { FREQUENCY_LABELS, type Category, type Recurring } from '../types'

/** Costo equivalente mensile di una ricorrenza. */
function monthlyEquivalent(r: Recurring): number {
  const perYear = { weekly: 52, monthly: 12, yearly: 1 }[r.frequency] / r.interval_count
  return (r.amount * perYear) / 12
}

export function RecurringPage() {
  const { account, canEdit } = useAccount()
  const { data: categories = [] } = useCategories(account.id)
  const { data: recurring = [], isLoading } = useRecurring(account.id)
  const [editing, setEditing] = useState<Recurring | undefined>()
  const [creating, setCreating] = useState(false)

  const kindOf = (r: Recurring) => categories.find((c) => c.id === r.category_id)?.kind ?? 'expense'
  const active = recurring.filter((r) => r.active)
  const inactive = recurring.filter((r) => !r.active)
  const monthlyOut = active.filter((r) => kindOf(r) === 'expense').reduce((s, r) => s + monthlyEquivalent(r), 0)
  const monthlyIn = active.filter((r) => kindOf(r) === 'income').reduce((s, r) => s + monthlyEquivalent(r), 0)

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2">
        <Card className="px-3 py-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Uscite fisse / mese</div>
          <div className="num mt-1 text-lg font-semibold">{formatEUR(monthlyOut)}</div>
        </Card>
        <Card className="px-3 py-3">
          <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Entrate fisse / mese</div>
          <div className="num mt-1 text-lg font-semibold">{formatEUR(monthlyIn)}</div>
        </Card>
      </div>

      <section>
        <SectionTitle
          action={
            canEdit && (
              <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> Nuova
              </Button>
            )
          }
        >
          Attive · {active.length}
        </SectionTitle>
        {active.length ? (
          <RecurringList items={active} categories={categories} onSelect={setEditing} kindOf={kindOf} />
        ) : (
          <EmptyState icon={<Repeat className="size-6" />} title="Nessuna spesa ricorrente">
            Aggiungi abbonamenti, affitto, stipendio…
          </EmptyState>
        )}
      </section>

      {inactive.length > 0 && (
        <section>
          <SectionTitle>Terminate o in pausa</SectionTitle>
          <div className="opacity-60">
            <RecurringList items={inactive} categories={categories} onSelect={setEditing} kindOf={kindOf} />
          </div>
        </section>
      )}

      <RecurringSheet open={creating || !!editing} recurring={editing} onClose={() => (setCreating(false), setEditing(undefined))} />
    </div>
  )
}

function RecurringList({
  items,
  categories,
  onSelect,
  kindOf,
}: {
  items: Recurring[]
  categories: Category[]
  onSelect: (r: Recurring) => void
  kindOf: (r: Recurring) => 'income' | 'expense'
}) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
      {items.map((r) => {
        const cat = categories.find((c) => c.id === r.category_id)
        const visual = categoryVisual(cat, categories)
        const unit = FREQUENCY_LABELS[r.frequency]
        const every = r.interval_count === 1 ? `ogni ${unit.one}` : `ogni ${r.interval_count} ${unit.many}`
        return (
          <button key={r.id} type="button" onClick={() => onSelect(r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface-2">
            <IconChip icon={visual.icon} color={visual.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{r.description || categoryPath(cat, categories)}</div>
              <div className="flex items-center gap-1.5 truncate text-xs text-faint">
                {!r.auto_confirm && <Clock className="size-3" aria-label="Da confermare" />}
                <span className="truncate">
                  {every}
                  {r.active && ` · prossimo ${formatShortDate(r.next_date)}`}
                </span>
              </div>
            </div>
            <span className={cn('num text-sm font-medium', kindOf(r) === 'income' && 'text-positive')}>{formatSigned(r.amount, kindOf(r))}</span>
          </button>
        )
      })}
    </div>
  )
}
