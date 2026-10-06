import { Clock, TrendingDown, TrendingUp } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { Segmented } from '../../../components/ui/Segmented'
import { PageLoader } from '../../../components/ui/Spinner'
import { currentPeriod, monthName, parseISODate, periodLabel, periodRange, shiftPeriod, today, trendRange, type Period } from '../../../lib/dates'
import { formatEUR } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import { useAccount } from '../AccountContext'
import { useCategories, useCategoryTotals, useMonthlyTotals, usePendingTransactions, useTransactions } from '../api'
import { CategoryBreakdown, categoryRows } from '../components/CategoryBreakdown'
import { PeriodSwitcher } from '../components/PeriodSwitcher'
import { SpendingCalendar } from '../components/SpendingCalendar'
import { TransactionRow } from '../components/TransactionList'
import { TransactionSheet } from '../components/TransactionSheet'
import type { PacePoint } from '../components/PaceChart'
import type { Slice } from '../components/DonutChart'
import type { Category, CategoryKind, Transaction } from '../types'

// Recharts è pesante: caricato a parte solo quando serve.
const charts = () => import('../components/Charts')
const TrendChart = lazy(() => charts().then((m) => ({ default: m.TrendChart })))
const DonutChart = lazy(() => charts().then((m) => ({ default: m.DonutChart })))
const PaceChart = lazy(() => charts().then((m) => ({ default: m.PaceChart })))

const MAX_SLICES = 7

export function OverviewPage() {
  const { account } = useAccount()
  const [period, setPeriod] = useState<Period>(currentPeriod)
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Transaction | undefined>()

  const range = periodRange(period)
  const prevPeriod = shiftPeriod(period, -1)
  const prevRange = periodRange(prevPeriod)
  const trend = trendRange(period)

  const { data: categories = [], isLoading } = useCategories(account.id)
  const { data: totals = [] } = useCategoryTotals(account.id, range.from, range.to)
  const { data: prevTotals = [] } = useCategoryTotals(account.id, prevRange.from, prevRange.to)
  const { data: monthly = [] } = useMonthlyTotals(account.id, trend.from, trend.to)
  const { data: pending = [] } = usePendingTransactions(account.id)
  // Per ritmo di spesa e calendario servono i movimenti giorno per giorno (o mese per mese).
  const { data: txs = [] } = useTransactions(account.id, range.from, range.to)
  const { data: prevTxs = [] } = useTransactions(account.id, prevRange.from, prevRange.to)

  const kindOf = useMemo(() => new Map(categories.map((c) => [c.id, c.kind])), [categories])
  const sum = (rows: typeof totals, k: CategoryKind) => rows.filter((t) => kindOf.get(t.category_id) === k).reduce((s, t) => s + t.total, 0)
  const income = sum(totals, 'income')
  const expense = sum(totals, 'expense')
  const prevExpense = sum(prevTotals, 'expense')
  const net = income - expense
  const savingRate = income > 0 ? net / income : null

  const slices = useMemo(() => donutSlices(categories, totals, kind), [categories, totals, kind])
  const pace = useMemo(() => paceSeries(period, txs, prevTxs, kindOf), [period, txs, prevTxs, kindOf])
  const byDay = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of txs) if (t.status === 'confirmed' && kindOf.get(t.category_id) === 'expense') m.set(t.date, (m.get(t.date) ?? 0) + t.amount)
    return m
  }, [txs, kindOf])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <PeriodSwitcher value={period} onChange={(p) => (setPeriod(p), setSelected(null))} />

      <Hero income={income} expense={expense} net={net} savingRate={savingRate} prevExpense={prevExpense} prevLabel={periodLabel(prevPeriod)} />

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
        <SectionTitle
          action={
            <Segmented
              size="sm"
              value={kind}
              onChange={(k) => (setKind(k), setSelected(null))}
              options={[
                { value: 'expense', label: 'Uscite' },
                { value: 'income', label: 'Entrate' },
              ]}
            />
          }
        >
          Per categoria
        </SectionTitle>
        <div className="space-y-3">
          {slices.length > 0 && (
            <Card className="p-4">
              <Suspense fallback={<div className="mx-auto aspect-square max-w-64" />}>
                <DonutChart
                  slices={slices}
                  selected={selected}
                  onSelect={setSelected}
                  centerLabel={kind === 'expense' ? 'Uscite' : 'Entrate'}
                />
              </Suspense>
            </Card>
          )}
          <CategoryBreakdown categories={categories} totals={totals} kind={kind} expanded={selected} onExpand={setSelected} />
        </div>
      </section>

      <section>
        <SectionTitle>Ritmo di spesa</SectionTitle>
        <Card className="space-y-3 p-3">
          <PaceSummary pace={pace} period={period} />
          <Suspense fallback={<div className="h-56" />}>
            <PaceChart data={pace} currentLabel={periodLabel(period)} previousLabel={periodLabel(prevPeriod)} />
          </Suspense>
        </Card>
      </section>

      {period.mode === 'month' && (
        <section>
          <SectionTitle>Calendario uscite</SectionTitle>
          <Card className="p-3">
            <SpendingCalendar year={period.year} month={period.month} byDay={byDay} />
          </Card>
        </section>
      )}

      <section>
        <SectionTitle>{period.mode === 'year' ? `Entrate e uscite ${period.year}` : 'Ultimi 12 mesi'}</SectionTitle>
        <Card className="p-3">
          <Suspense fallback={<div className="h-60" />}>
            <TrendChart data={monthly} from={trend.from} to={trend.to} />
          </Suspense>
        </Card>
      </section>

      <TransactionSheet open={!!editing} transaction={editing} onClose={() => setEditing(undefined)} />
    </div>
  )
}

function Hero({
  income,
  expense,
  net,
  savingRate,
  prevExpense,
  prevLabel,
}: {
  income: number
  expense: number
  net: number
  savingRate: number | null
  prevExpense: number
  prevLabel: string
}) {
  const max = Math.max(income, expense, 1)
  const delta = prevExpense > 0 ? (expense - prevExpense) / prevExpense : null
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full opacity-20 blur-3xl"
        style={{ background: net >= 0 ? 'var(--positive)' : 'var(--negative)' }}
      />
      <div className="relative flex items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Netto</div>
          <div className={cn('num mt-1 text-3xl font-semibold', net > 0 && 'text-positive', net < 0 && 'text-negative')}>
            {net > 0 && '+'}
            {formatEUR(net)}
          </div>
        </div>
        {savingRate !== null && (
          <div className="text-right">
            <div className="num text-lg font-semibold">{Math.round(savingRate * 100)}%</div>
            <div className="text-[11px] text-faint">risparmiato</div>
          </div>
        )}
      </div>
      <div className="relative mt-4 space-y-2.5">
        <Bar label="Entrate" value={income} share={income / max} color="var(--series-income)" />
        <Bar label="Uscite" value={expense} share={expense / max} color="var(--series-expense)" />
      </div>
      {delta !== null && (
        <div className="relative mt-3 flex items-center gap-1.5 text-xs text-muted">
          {delta > 0 ? <TrendingUp className="size-3.5 text-negative" /> : <TrendingDown className="size-3.5 text-positive" />}
          Uscite {delta > 0 ? '+' : '−'}
          {Math.abs(Math.round(delta * 100))}% rispetto a {prevLabel.toLowerCase()}
        </div>
      )}
    </Card>
  )
}

function Bar({ label, value, share, color }: { label: string; value: number; share: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="num font-medium">{formatEUR(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(share * 100, value > 0 ? 2 : 0)}%`, background: color }} />
      </div>
    </div>
  )
}

function PaceSummary({ pace, period }: { pace: PacePoint[]; period: Period }) {
  const last = [...pace].reverse().find((p) => p.current !== null)
  if (!last || last.previous === null || last.current === null) return null
  const diff = last.current - last.previous
  const when = period.mode === 'month' ? `al giorno ${last.label}` : `a ${last.label.toLowerCase()}`
  return (
    <p className="px-1 text-sm text-muted">
      {when.charAt(0).toUpperCase() + when.slice(1)} hai speso{' '}
      <span className={cn('num font-semibold', diff > 0 ? 'text-negative' : 'text-positive')}>{formatEUR(Math.abs(diff))}</span>{' '}
      {diff > 0 ? 'in più' : 'in meno'} del periodo precedente.
    </p>
  )
}

/** Fette della ciambella: le categorie principali più grandi, il resto in "Altre". */
function donutSlices(categories: Category[], totals: Parameters<typeof categoryRows>[1], kind: CategoryKind): Slice[] {
  const rows = categoryRows(categories, totals, kind)
  const head = rows.slice(0, MAX_SLICES).map((r) => ({ id: r.id, name: r.name, value: r.total, color: r.color }))
  const rest = rows.slice(MAX_SLICES).reduce((s, r) => s + r.total, 0)
  return rest > 0 ? [...head, { id: '__other', name: 'Altre', value: rest, color: '#8f8e88' }] : head
}

/** Uscite cumulate giorno per giorno (mese) o mese per mese (anno), affiancate al periodo precedente. */
function paceSeries(period: Period, txs: Transaction[], prevTxs: Transaction[], kindOf: Map<string, CategoryKind>): PacePoint[] {
  const bucket = (t: Transaction) => (period.mode === 'month' ? parseISODate(t.date).getDate() : parseISODate(t.date).getMonth() + 1)
  const cumulate = (list: Transaction[], n: number) => {
    const per = new Array(n + 1).fill(0)
    for (const t of list) if (t.status === 'confirmed' && kindOf.get(t.category_id) === 'expense') per[bucket(t)] += t.amount
    for (let i = 1; i <= n; i++) per[i] += per[i - 1]
    return per
  }
  const t = parseISODate(today())
  if (period.mode === 'month') {
    const days = new Date(period.year, period.month + 1, 0).getDate()
    const prevDays = new Date(period.year, period.month, 0).getDate()
    const cur = cumulate(txs, days)
    const prev = cumulate(prevTxs, prevDays)
    const isCurrent = t.getFullYear() === period.year && t.getMonth() === period.month
    const lastDay = isCurrent ? t.getDate() : days
    return Array.from({ length: Math.max(days, prevDays) }, (_, i) => ({
      label: String(i + 1),
      current: i + 1 <= days && i + 1 <= lastDay ? cur[i + 1] : null,
      previous: i + 1 <= prevDays ? prev[i + 1] : null,
    }))
  }
  const cur = cumulate(txs, 12)
  const prev = cumulate(prevTxs, 12)
  const lastMonth = t.getFullYear() === period.year ? t.getMonth() + 1 : 12
  return Array.from({ length: 12 }, (_, i) => ({
    label: monthName(i).slice(0, 3),
    current: i + 1 <= lastMonth ? cur[i + 1] : null,
    previous: prev[i + 1],
  }))
}
