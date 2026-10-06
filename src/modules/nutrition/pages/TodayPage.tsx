import { ChevronLeft, ChevronRight, Flame, Plus, Target } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconButton } from '../../../components/ui/Button'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { formatDayHeader, parseISODate, toISODate, today } from '../../../lib/dates'
import { SessionRow } from '../../workout/components/SessionRow'
import { useAddWater, useDaySessions, useFoodLogs, useFoodLogsRange, useNutritionProfile, useWater, useWeights, weightOn } from '../api'
import { EnergyCard, EvaluationCard, WaterCard } from '../components/DayCards'
import { FoodSheet } from '../components/FoodSheet'
import { baseTargets, dailyTargets, evaluateDay } from '../targets'
import { MEALS, type FoodLog, type Meal } from '../types'

const KcalWeekChart = lazy(() => import('../components/NutritionCharts').then((m) => ({ default: m.KcalWeekChart })))

const shift = (iso: string, days: number) => {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

export function TodayPage() {
  const [date, setDate] = useState(today)
  const [sheet, setSheet] = useState<{ meal: Meal; log?: FoodLog } | null>(null)
  const { data: profile } = useNutritionProfile()
  const { data: weights } = useWeights()
  const { data: logs = [] } = useFoodLogs(date)
  const { data: water = [] } = useWater(date)
  const { data: sessions = [] } = useDaySessions(date)
  const addWater = useAddWater()

  const isToday = date === today()
  const weight = weightOn(weights, date)
  const targets = dailyTargets(profile, weight, sessions, parseISODate(date))
  const totals = useMemo(
    () => ({
      kcal: logs.reduce((s, l) => s + l.kcal, 0),
      protein: logs.reduce((s, l) => s + l.protein, 0),
      carbs: logs.reduce((s, l) => s + l.carbs, 0),
      fat: logs.reduce((s, l) => s + l.fat, 0),
      water: water.reduce((s, w) => s + w.ml, 0),
    }),
    [logs, water],
  )
  const evaluation = evaluateDay(targets, totals, sessions.length > 0, isToday)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <IconButton label="Giorno precedente" onClick={() => setDate(shift(date, -1))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <span className="text-sm font-medium">{formatDayHeader(date)}</span>
        <IconButton label="Giorno successivo" disabled={isToday} onClick={() => setDate(shift(date, 1))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      {!targets.complete && (
        <Link to="/alimentazione/obiettivi" className="flex items-center gap-3 rounded-2xl border border-[#f472b6]/40 bg-[#f472b6]/10 px-3 py-2.5 text-sm">
          <Target className="size-5 text-[#f472b6]" />
          <span className="flex-1">Completa i tuoi dati per obiettivi su misura</span>
          <span className="text-[#f472b6]">Imposta →</span>
        </Link>
      )}

      <EvaluationCard evaluation={evaluation} partial={isToday} />
      <EnergyCard targets={targets} totals={totals} />
      <WaterCard ml={totals.water} target={targets.water} busy={addWater.isPending} onAdd={(ml) => addWater.mutate({ date, ml })} />

      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m.key)
        const kcal = items.reduce((s, l) => s + l.kcal, 0)
        return (
          <section key={m.key}>
            <SectionTitle
              action={
                <button type="button" onClick={() => setSheet({ meal: m.key })} className="flex items-center gap-1 text-xs text-muted hover:text-fg">
                  <Plus className="size-3.5" /> Aggiungi
                </button>
              }
            >
              {m.label} {kcal > 0 && <span className="num normal-case">· {Math.round(kcal)} kcal</span>}
            </SectionTitle>
            {items.length > 0 ? (
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {items.map((l) => (
                  <button key={l.id} type="button" onClick={() => setSheet({ meal: m.key, log: l })} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{l.food_name}</span>
                      <span className="num block text-[11px] text-faint">
                        {Math.round(l.grams)} g · P {Math.round(l.protein)} · C {Math.round(l.carbs)} · G {Math.round(l.fat)}
                      </span>
                    </span>
                    <span className="num text-sm text-muted">{Math.round(l.kcal)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setSheet({ meal: m.key })} className="w-full rounded-2xl border border-dashed border-line py-3 text-sm text-faint hover:text-muted">
                Aggiungi {m.label.toLowerCase()}
              </button>
            )}
          </section>
        )
      })}

      {sessions.length > 0 && (
        <section>
          <SectionTitle>
            <span className="flex items-center gap-1.5">
              <Flame className="size-3 text-[#fb923c]" /> Allenamenti · {targets.burned} kcal stimate
            </span>
          </SectionTitle>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {sessions.map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        </section>
      )}

      <WeekKcal date={date} target={baseTargets(profile, weight).kcal} />

      <FoodSheet open={!!sheet} date={date} meal={sheet?.meal ?? 'snack'} log={sheet?.log} onClose={() => setSheet(null)} />
    </div>
  )
}

function WeekKcal({ date, target }: { date: string; target: number }) {
  const from = shift(date, -6)
  const { data: logs = [] } = useFoodLogsRange(from, date)
  const fmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short' })
  const data = Array.from({ length: 7 }, (_, i) => {
    const d = shift(from, i)
    return { label: fmt.format(parseISODate(d)), kcal: logs.filter((l) => l.date === d).reduce((s, l) => s + l.kcal, 0), target }
  })
  if (!logs.length) return null
  const avg = data.reduce((s, x) => s + x.kcal, 0) / data.filter((x) => x.kcal > 0).length
  return (
    <section>
      <SectionTitle>Ultimi 7 giorni · media {Math.round(avg)} kcal</SectionTitle>
      <Card className="p-3">
        <Suspense fallback={<div className="h-40" />}>
          <KcalWeekChart data={data} target={target} />
        </Suspense>
      </Card>
    </section>
  )
}
