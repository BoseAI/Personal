import { ChevronLeft, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { PageLoader } from '../../../components/ui/Spinner'
import { useCustomExercises, useDeleteSession, useSession } from '../api'
import { CardioSheet } from '../components/CardioSheet'
import { FocusCard } from '../components/FocusCard'
import { SessionIcon } from '../components/SessionIcon'
import { allExercises, estimated1RM, setsFocus } from '../exercises'
import { formatDistance, formatDuration, formatPace, formatSessionDate } from '../format'
import { SESSION_LABELS, type WorkoutSet } from '../types'

export function SessionDetailPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useSession(sessionId)
  const del = useDeleteSession()
  const { data: custom = [] } = useCustomExercises()
  const exercises = useMemo(() => allExercises(custom), [custom])
  const [editing, setEditing] = useState(false)

  const groups = useMemo(() => {
    const m = new Map<string, WorkoutSet[]>()
    for (const s of data?.sets ?? []) m.set(`${s.block_index}|${s.exercise_key}`, [...(m.get(`${s.block_index}|${s.exercise_key}`) ?? []), s])
    return [...m.values()]
  }, [data])

  if (isLoading) return <PageLoader />
  if (!data) return <Navigate to="/allenamento/attivita" replace />
  const { session, sets } = data
  const volume = sets.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0)

  async function remove() {
    if (!confirm('Eliminare questa attività?')) return
    await del.mutateAsync(session.id)
    navigate('/allenamento/attivita', { replace: true })
  }

  const stats = [
    { label: 'Durata', value: formatDuration(session.duration_sec) },
    session.kind === 'strength' ? { label: 'Volume', value: `${Math.round(volume).toLocaleString('it-IT')} kg` } : { label: 'Distanza', value: formatDistance(session) ?? '—' },
    session.kind === 'strength' ? { label: 'Serie', value: String(sets.length) } : { label: 'Passo', value: formatPace(session) ?? '—' },
    ...(session.avg_hr ? [{ label: 'FC media', value: `${session.avg_hr} bpm` }] : []),
    ...(session.rpe ? [{ label: 'Fatica', value: `${session.rpe}/10` }] : []),
  ]

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/allenamento/attivita" aria-label="Indietro" className="-ml-2 flex size-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <ChevronLeft className="size-6" />
        </Link>
        <SessionIcon kind={session.kind} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{session.name}</h1>
          <p className="num text-xs text-faint">
            {SESSION_LABELS[session.kind]} · {formatSessionDate(session.started_at)}
          </p>
        </div>
        {session.kind !== 'strength' && (
          <Button onClick={() => setEditing(true)} aria-label="Modifica">
            <Pencil className="size-4" />
          </Button>
        )}
        <Button variant="danger" onClick={remove} aria-label="Elimina">
          <Trash2 className="size-4" />
        </Button>
      </div>

      <Card className="grid grid-cols-3 gap-3 p-4">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-mono text-[10px] tracking-[0.1em] text-faint uppercase">{s.label}</div>
            <div className="num mt-0.5 font-semibold">{s.value}</div>
          </div>
        ))}
      </Card>

      {session.notes && <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">{session.notes}</p>}

      {sets.length > 0 && (
        <>
          <FocusCard rows={setsFocus(sets, exercises)} title="Muscoli allenati" empty="" />
          <section>
            <SectionTitle>Esercizi</SectionTitle>
            <div className="space-y-2">
              {groups.map((g) => {
                const best = Math.max(...g.map((s) => estimated1RM(s.weight_kg ?? 0, s.reps ?? 0)))
                return (
                  <Card key={g[0].block_index + g[0].exercise_key} className="p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{g[0].exercise_name}</span>
                      {best > 0 && <span className="num text-[11px] text-faint">1RM stimato {Math.round(best)} kg</span>}
                    </div>
                    <div className="num mt-2 flex flex-wrap gap-1.5 text-xs">
                      {g.map((s) => (
                        <span key={s.id} className="rounded-lg bg-surface-2 px-2 py-1">
                          {s.weight_kg ?? 0} kg × {s.reps ?? 0}
                        </span>
                      ))}
                    </div>
                  </Card>
                )
              })}
            </div>
          </section>
        </>
      )}

      <CardioSheet open={editing} session={session} onClose={() => setEditing(false)} />
    </div>
  )
}
