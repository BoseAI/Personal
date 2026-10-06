import { Clock } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { Segmented } from '../../../components/ui/Segmented'
import { PageLoader } from '../../../components/ui/Spinner'
import { currentPeriod, periodRange, trendRange, type Period } from '../../../lib/dates'
import { formatEUR } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import { useAccount } from '../AccountContext'
import { useCategories, useCategoryTotals, useMonthlyTotals, usePendingTransactions } from '../api'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { PeriodSwitcher } from '../components/PeriodSwitcher'
import { TransactionRow } from '../components/TransactionList'
import { TransactionSheet } from '../components/TransactionSheet'
import type { CategoryKind, Transaction } from '../types'

// Recharts è pesante: caricato a parte solo quando serve.
const TrendChart = lazy(() => import('../components/TrendChart').then((m) => ({ default: m.TrendChart })))

export function OverviewPage() {
  const { account } = useAccount()
  const [period, setPeriod] = useState<Period>(currentPeriod)
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [editing, setEditing] = useState<Transaction | undefined>()

  const range = periodRange(period)
  const trend = trendRange(period)
  const { data: categories = [], isLoading } = useCategories(account.id)
  const { data: totals = [] } = useCategoryTotals(account.id, range.from, range.to)
  const { data: monthly = [] } = useMonthlyTotals(account.id, trend.from, trend.to)
  const { data: pending = [] } = usePendingTransactions(account.id)

  const kindOf = new Map(categories.map((c) => [c.id, c.kind]))
  const income = totals.filter((t) => kindOf.get(t.category_id) === 'income').reduce((s, t) => s + t.total, 0)
  const expense = totals.filter((t) => kindOf.get(t.category_id) === 'expense').reduce((s, t) => s + t.total, 0)
  const net = income - expense
  const savingRate = income > 0 ? net / income : null

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <PeriodSwitcher value={period} onChange={setPeriod} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Entrate" value={formatEUR(income)} />
        <Stat label="Uscite" value={formatEUR(expense)} />
        <Stat
          label="Netto"
          value={formatEUR(net)}
          tone={net < 0 ? 'negative' : net > 0 ? 'positive' : undefined}
          sub={savingRate !== null ? `${Math.round(savingRate * 100)}% risparmio` : undefined}
        />
      </div>

      {pending.length > 0 && (
        <section>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Clock className="size-3 text-warning" /> Da confermare · {pending.length}
            </span>
          </SectionTitle>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {pending.map((t) => (
              <TransactionRow key={t.id} tx={t} categories={categories} showDate onClick={() => setEditing(t)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>{period.mode === 'year' ? `Andamento ${period.year}` : 'Ultimi 12 mesi'}</SectionTitle>
        <Card className="p-3">
          <Suspense fallback={<div className="h-60" />}>
            <TrendChart data={monthly} from={trend.from} to={trend.to} />
          </Suspense>
        </Card>
      </section>

      <section>
        <SectionTitle
          action={
            <Segmented
              size="sm"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'expense', label: 'Uscite' },
                { value: 'income', label: 'Entrate' },
              ]}
            />
          }
        >
          Per categoria
        </SectionTitle>
        <CategoryBreakdown categories={categories} totals={totals} kind={kind} />
      </section>

      <TransactionSheet open={!!editing} transaction={editing} onClose={() => setEditing(undefined)} />
    </div>
  )
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'positive' | 'negative' }) {
  return (
    <Card className="px-3 py-3">
      <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{label}</div>
      <div className={cn('num mt-1 truncate text-[15px] font-semibold', tone === 'positive' && 'text-positive', tone === 'negative' && 'text-negative')}>
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[10px] text-faint">{sub}</div>}
    </Card>
  )
}
