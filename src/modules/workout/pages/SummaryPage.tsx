import { ChevronLeft, ChevronRight, Footprints, Play, Waves } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, IconButton } from '../../../components/ui/Button'
import { Card, EmptyState, SectionTitle } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { useCustomExercises, useSessions, useSetsForSessions } from '../api'
import { CardioSheet } from '../components/CardioSheet'
import { FocusCard } from '../components/FocusCard'
import { SESSION_COLORS } from '../components/SessionIcon'
import { SessionRow } from '../components/SessionRow'
import { StartSheet } from '../components/StartSheet'
import { allExercises, setsFocus } from '../exercises'
import { addDays, formatDuration, weekLabel, weekStart } from '../format'
import type { SessionKind } from '../types'

const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']

export function SummaryPage() {
  const [now] = useState(() => new Date())
  const [start, setStart] = useState(() => weekStart(now))
  const [starting, setStarting] = useState(false)
  const [cardio, setCardio] = useState<Exclude<SessionKind, 'strength'> | null>(null)
  const end = addDays(start, 7)
  const { data: sessions = [] } = useSessions(start.toISOString(), end.toISOString())
  const strengthIds = sessions.filter((s) => s.kind === 'strength').map((s) => s.id)
  const { data: sets = [] } = useSetsForSessions(strengthIds)
  const { data: custom = [] } = useCustomExercises()
  const exercises = useMemo(() => allExercises(custom), [custom])
  const focus = useMemo(() => setsFocus(sets, exercises), [sets, exercises])

  const totalTime = sessions.reduce((s, x) => s + (x.duration_sec ?? 0), 0)
  const volume = sets.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0)
  const runKm = sessions.filter((s) => s.kind === 'run').reduce((s, x) => s + (x.distance_m ?? 0), 0) / 1000
  const swimM = sessions.filter((s) => s.kind === 'swim').reduce((s, x) => s + (x.distance_m ?? 0), 0)
  const isCurrent = weekStart(now).getTime() === start.getTime()

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-2">
        <Button variant="primary" size="lg" onClick={() => setStarting(true)}>
          <Play className="size-4" /> Allenati
        </Button>
        <Button size="lg" onClick={() => setCardio('run')}>
          <Footprints className="size-4" /> Corsa
        </Button>
        <Button size="lg" onClick={() => setCardio('swim')}>
          <Waves className="size-4" /> Nuoto
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <IconButton label="Settimana precedente" onClick={() => setStart(addDays(start, -7))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <span className="text-sm font-medium">{isCurrent ? 'Questa settimana' : weekLabel(start)}</span>
        <IconButton label="Settimana successiva" disabled={isCurrent} onClick={() => setStart(addDays(start, 7))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((d, i) => {
            const day = addDays(start, i)
            const kinds = sessions.filter((s) => new Date(s.started_at).toDateString() === day.toDateString()).map((s) => s.kind)
            const today = day.toDateString() === now.toDateString()
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={cn('font-mono text-[10px]', today ? 'text-fg' : 'text-faint')}>{d}</span>
                <div className={cn('flex h-10 w-full flex-col items-center justify-center gap-1 rounded-xl', kinds.length ? 'bg-surface-2' : 'border border-dashed border-line', today && 'ring-1 ring-fg/40')}>
                  {kinds.slice(0, 3).map((k, j) => (
                    <span key={j} className="h-1.5 w-5 rounded-full" style={{ background: SESSION_COLORS[k] }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-line pt-3">
          <Stat label="Sessioni" value={String(sessions.length)} />
          <Stat label="Tempo" value={totalTime ? formatDuration(totalTime) : '—'} />
          <Stat label="Volume" value={volume ? `${Math.round(volume).toLocaleString('it-IT')} kg` : '—'} />
          <Stat label="Corsa" value={runKm ? `${runKm.toLocaleString('it-IT', { maximumFractionDigits: 1 })} km` : '—'} color={SESSION_COLORS.run} />
          <Stat label="Nuoto" value={swimM ? `${Math.round(swimM).toLocaleString('it-IT')} m` : '—'} color={SESSION_COLORS.swim} />
          <Stat label="Palestra" value={String(strengthIds.length)} color={SESSION_COLORS.strength} />
        </div>
      </Card>

      {sets.length > 0 && <FocusCard rows={focus} title="Muscoli allenati in settimana" empty="" />}

      <section>
        <SectionTitle>Attività della settimana</SectionTitle>
        {sessions.length ? (
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {sessions.map((s) => (
              <SessionRow key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nessuna attività questa settimana">Inizia un allenamento o registra una corsa.</EmptyState>
        )}
      </section>

      <StartSheet open={starting} onClose={() => setStarting(false)} />
      <CardioSheet open={cardio !== null} kind={cardio ?? 'run'} onClose={() => setCardio(null)} />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-mono text-[10px] tracking-[0.1em] text-faint uppercase">
        {color && <span className="size-1.5 rounded-full" style={{ background: color }} />}
        {label}
      </div>
      <div className="num mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  )
}
