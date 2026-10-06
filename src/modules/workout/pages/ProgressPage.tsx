import { Search, TrendingUp } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Card, EmptyState, SectionTitle } from '../../../components/ui/Card'
import { Segmented } from '../../../components/ui/Segmented'
import { cn } from '../../../lib/cn'
import { useExerciseHistory, useSessions, useTrainedExercises } from '../api'
import { SESSION_COLORS } from '../components/SessionIcon'
import { estimated1RM } from '../exercises'
import { addDays, weekStart } from '../format'

const charts = () => import('../components/WorkoutCharts')
const ProgressLine = lazy(() => charts().then((m) => ({ default: m.ProgressLine })))
const WeeklyBars = lazy(() => charts().then((m) => ({ default: m.WeeklyBars })))

const shortDate = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

export function ProgressPage() {
  const [tab, setTab] = useState<'strength' | 'cardio'>('strength')
  return (
    <div className="space-y-4">
      <Segmented
        className="w-full"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'strength', label: 'Forza' },
          { value: 'cardio', label: 'Corsa e nuoto' },
        ]}
      />
      {tab === 'strength' ? <StrengthProgress /> : <CardioProgress />}
    </div>
  )
}

function StrengthProgress() {
  const { data: trained = [] } = useTrainedExercises()
  const [key, setKey] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const selected = key ?? trained[0]?.key ?? null
  const { data } = useExerciseHistory(selected)

  const points = useMemo(() => {
    if (!data) return []
    return data.sessions
      .map((s) => {
        const sets = data.sets.filter((x) => x.session_id === s.id)
        const best = Math.max(...sets.map((x) => estimated1RM(x.weight_kg ?? 0, x.reps ?? 0)))
        const top = sets.reduce((a, b) => ((b.weight_kg ?? 0) > (a.weight_kg ?? 0) ? b : a), sets[0])
        return { date: s.started_at, label: shortDate.format(new Date(s.started_at)), value: Math.round(best * 10) / 10, sub: `Miglior serie ${top?.weight_kg ?? 0} kg × ${top?.reps ?? 0}` }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [data])

  if (!trained.length) return <EmptyState icon={<TrendingUp className="size-6" />} title="Ancora nessun dato">Completa un allenamento per vedere i progressi.</EmptyState>

  const first = points[0]?.value ?? 0
  const lastP = points[points.length - 1]?.value ?? 0
  const filtered = trained.filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <div className="space-y-4">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
        <Search className="size-4 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca esercizio" className="w-full bg-transparent outline-none placeholder:text-faint" />
      </label>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {filtered.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setKey(t.key)}
            className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs transition', t.key === selected ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted')}
          >
            {t.name}
          </button>
        ))}
      </div>
      {points.length > 0 && (
        <Card className="space-y-3 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">Massimale stimato (1RM)</p>
              <p className="num text-2xl font-semibold">{lastP} kg</p>
            </div>
            {points.length > 1 && (
              <span className={cn('num text-sm font-medium', lastP >= first ? 'text-positive' : 'text-negative')}>
                {lastP >= first ? '+' : ''}
                {Math.round((lastP - first) * 10) / 10} kg
              </span>
            )}
          </div>
          <Suspense fallback={<div className="h-52" />}>
            <ProgressLine data={points} unit="kg" color="#fb923c" />
          </Suspense>
          <p className="text-[11px] text-faint">Stima con la formula di Epley sulla serie migliore di ogni allenamento.</p>
        </Card>
      )}
    </div>
  )
}

function CardioProgress() {
  const [start] = useState(() => addDays(weekStart(new Date()), -7 * 11))
  const [end] = useState(() => addDays(weekStart(new Date()), 7))
  const { data: sessions = [] } = useSessions(start.toISOString(), end.toISOString())
  const weeks = Array.from({ length: 12 }, (_, i) => addDays(start, i * 7))
  const series = (kind: 'run' | 'swim', div: number) =>
    weeks.map((w) => ({
      label: shortDate.format(w),
      value:
        sessions
          .filter((s) => s.kind === kind && weekStart(new Date(s.started_at)).getTime() === w.getTime())
          .reduce((t, s) => t + (s.distance_m ?? 0), 0) / div,
    }))

  return (
    <div className="space-y-4">
      <section>
        <SectionTitle>Corsa · km a settimana</SectionTitle>
        <Card className="p-3">
          <Suspense fallback={<div className="h-44" />}>
            <WeeklyBars data={series('run', 1000)} unit="km" color={SESSION_COLORS.run} />
          </Suspense>
        </Card>
      </section>
      <section>
        <SectionTitle>Nuoto · metri a settimana</SectionTitle>
        <Card className="p-3">
          <Suspense fallback={<div className="h-44" />}>
            <WeeklyBars data={series('swim', 1)} unit="m" color={SESSION_COLORS.swim} />
          </Suspense>
        </Card>
      </section>
    </div>
  )
}
