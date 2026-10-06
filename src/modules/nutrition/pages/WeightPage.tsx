import { Scale, Trash2 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { Card, EmptyState, SectionTitle } from '../../../components/ui/Card'
import { ErrorText, Field, Input } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { formatShortDate, parseISODate, today } from '../../../lib/dates'
import { cn } from '../../../lib/cn'
import { errorMessage } from '../../../lib/supabase'
import { useDeleteWeight, useNutritionProfile, useSaveWeight, useWeights } from '../api'
import type { BodyWeight } from '../types'

const WeightChart = lazy(() => import('../components/NutritionCharts').then((m) => ({ default: m.WeightChart })))
const short = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

/** Media mobile su 7 giorni di calendario: smussa le oscillazioni quotidiane. */
function trend(list: BodyWeight[]) {
  return list.map((w) => {
    const t = parseISODate(w.date).getTime()
    const win = list.filter((x) => {
      const d = (t - parseISODate(x.date).getTime()) / 86400000
      return d >= 0 && d < 7
    })
    return { label: short.format(parseISODate(w.date)), weight: w.weight_kg, trend: win.reduce((s, x) => s + x.weight_kg, 0) / win.length, date: w.date }
  })
}

export function WeightPage() {
  const { data: weights = [] } = useWeights()
  const { data: profile } = useNutritionProfile()
  const save = useSaveWeight()
  const del = useDeleteWeight()
  const [now] = useState(() => Date.now())
  const [range, setRange] = useState<'30' | '90' | '365' | 'all'>('90')
  const [date, setDate] = useState(today)
  const [kg, setKg] = useState('')
  const [fat, setFat] = useState('')
  const [error, setError] = useState<string | null>(null)

  const points = useMemo(() => trend(weights), [weights])
  const visible = useMemo(() => {
    if (range === 'all') return points
    const from = now - Number(range) * 86400000
    return points.filter((p) => parseISODate(p.date).getTime() >= from)
  }, [points, range, now])

  const last = points[points.length - 1]
  const delta = (days: number) => {
    if (!last) return null
    const t = parseISODate(last.date).getTime() - days * 86400000
    const ref = [...points].reverse().find((p) => parseISODate(p.date).getTime() <= t)
    return ref ? last.trend - ref.trend : null
  }
  const goal = profile?.target_weight_kg ?? null

  async function submit(e: FormEvent) {
    e.preventDefault()
    const w = Number(kg.replace(',', '.'))
    if (!w || w < 20 || w > 400) return setError('Inserisci un peso valido.')
    try {
      await save.mutateAsync({ date, weight_kg: Math.round(w * 100) / 100, body_fat: fat ? Number(fat.replace(',', '.')) : null, note: null })
      setKg('')
      setFat('')
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
          <Field label="Data">
            <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Peso kg">
            <Input inputMode="decimal" className="num" value={kg} onChange={(e) => setKg(e.target.value)} placeholder={last ? last.weight?.toFixed(1) : '75,0'} />
          </Field>
          <Field label="Grasso %">
            <Input inputMode="decimal" className="num" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="opz." />
          </Field>
        </div>
        <ErrorText error={error} />
        <Button type="submit" variant="primary" className="w-full" loading={save.isPending}>
          <Scale className="size-4" /> Registra pesata
        </Button>
      </form>

      {points.length === 0 ? (
        <EmptyState icon={<Scale className="size-6" />} title="Nessuna pesata">
          Pesati sempre nelle stesse condizioni (es. la mattina a digiuno) per un trend affidabile.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Tendenza" value={`${last.trend.toFixed(1)} kg`} />
            <Stat label="7 giorni" value={fmtDelta(delta(7))} tone={delta(7)} />
            <Stat label="30 giorni" value={fmtDelta(delta(30))} tone={delta(30)} />
          </div>
          {goal && (
            <p className="px-1 text-sm text-muted">
              Obiettivo <span className="num font-medium text-fg">{goal} kg</span>: mancano{' '}
              <span className="num font-semibold text-fg">{Math.abs(last.trend - goal).toFixed(1)} kg</span>
            </p>
          )}
          <Card className="space-y-3 p-3">
            <Segmented
              size="sm"
              className="w-full"
              value={range}
              onChange={setRange}
              options={[
                { value: '30', label: '30 g' },
                { value: '90', label: '3 mesi' },
                { value: '365', label: '1 anno' },
                { value: 'all', label: 'Tutto' },
              ]}
            />
            <Suspense fallback={<div className="h-56" />}>
              <WeightChart data={visible} goal={goal} />
            </Suspense>
            <p className="px-1 text-[11px] text-faint">Punti: pesate · linea: media degli ultimi 7 giorni.</p>
          </Card>
          <section>
            <SectionTitle>Pesate</SectionTitle>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {[...weights].reverse().slice(0, 60).map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="flex-1 text-sm">{formatShortDate(w.date)}</span>
                  {w.body_fat !== null && <span className="num text-xs text-faint">{w.body_fat}% grasso</span>}
                  <span className="num w-20 text-right text-sm font-medium">{w.weight_kg.toFixed(1)} kg</span>
                  <IconButton label="Elimina pesata" onClick={() => confirm('Eliminare questa pesata?') && del.mutate(w.id)} className="size-8">
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

const fmtDelta = (d: number | null) => (d === null ? '—' : `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(d).toFixed(1)} kg`)

function Stat({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  return (
    <Card className="px-3 py-3">
      <div className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{label}</div>
      <div className={cn('num mt-1 font-semibold', tone !== undefined && tone !== null && tone !== 0 && 'text-muted')}>{value}</div>
    </Card>
  )
}
