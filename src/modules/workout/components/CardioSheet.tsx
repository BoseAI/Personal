import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input, Textarea } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { Sheet } from '../../../components/ui/Sheet'
import { errorMessage } from '../../../lib/supabase'
import { useDeleteSession, useSaveSession } from '../api'
import { formatPace } from '../format'
import { SESSION_LABELS, type SessionKind, type WorkoutSession } from '../types'
import { parseDecimal } from './BlockEditor'

type Props = { open: boolean; onClose: () => void; kind?: Exclude<SessionKind, 'strength'>; session?: WorkoutSession }

export function CardioSheet(props: Props) {
  return props.open ? <CardioForm {...props} /> : null
}

function localDateTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function CardioForm({ onClose, kind: initialKind = 'run', session }: Props) {
  const navigate = useNavigate()
  const save = useSaveSession()
  const del = useDeleteSession()
  const [kind, setKind] = useState<Exclude<SessionKind, 'strength'>>((session?.kind as Exclude<SessionKind, 'strength'>) ?? initialKind)
  const [when, setWhen] = useState(localDateTime(session?.started_at))
  const dur = session?.duration_sec ?? 0
  const [h, setH] = useState(session ? String(Math.floor(dur / 3600)) : '')
  const [m, setM] = useState(session ? String(Math.floor((dur % 3600) / 60)) : '')
  const [s, setS] = useState(session ? String(dur % 60) : '')
  const [distance, setDistance] = useState(
    session?.distance_m ? (session.kind === 'swim' ? String(session.distance_m) : String(session.distance_m / 1000).replace('.', ',')) : '',
  )
  const [hr, setHr] = useState(session?.avg_hr ? String(session.avg_hr) : '')
  const [rpe, setRpe] = useState(session?.rpe ? String(session.rpe) : '')
  const [name, setName] = useState(session?.name ?? '')
  const [notes, setNotes] = useState(session?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const seconds = (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0)
  const dist = parseDecimal(distance)
  const distanceM = dist === null ? null : kind === 'swim' ? dist : dist * 1000
  const pace = formatPace({ kind, distance_m: distanceM, duration_sec: seconds })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!seconds) return setError('Inserisci la durata.')
    try {
      const saved = await save.mutateAsync({
        session: {
          id: session?.id,
          kind,
          plan_id: null,
          name: name.trim() || SESSION_LABELS[kind],
          started_at: new Date(when).toISOString(),
          duration_sec: seconds,
          distance_m: distanceM,
          avg_hr: hr ? Math.min(250, Math.max(30, Number(hr))) : null,
          rpe: rpe ? Math.min(10, Math.max(1, Number(rpe))) : null,
          notes: notes.trim() || null,
        },
      })
      onClose()
      if (!session) navigate(`/allenamento/attivita/${saved.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    if (!session || !confirm('Eliminare questa attività?')) return
    await del.mutateAsync(session.id)
    onClose()
    navigate('/allenamento/attivita')
  }

  const small = 'num h-11 w-full rounded-xl border border-line bg-surface-2 text-center outline-none focus:border-line-strong'

  return (
    <Sheet
      open
      onClose={onClose}
      title={session ? 'Modifica attività' : 'Registra attività'}
      footer={
        <div className="flex gap-2">
          {session && (
            <Button variant="danger" onClick={remove} aria-label="Elimina">
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button type="submit" form="cardio-form" variant="primary" className="flex-1" loading={save.isPending}>
            Salva
          </Button>
        </div>
      }
    >
      <form id="cardio-form" onSubmit={submit} className="space-y-4">
        <Segmented
          className="w-full"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'run', label: 'Corsa' },
            { value: 'swim', label: 'Nuoto' },
            { value: 'other', label: 'Altro' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quando">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </Field>
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={SESSION_LABELS[kind]} />
          </Field>
        </div>
        <Field label="Durata (ore · min · sec)">
          <div className="grid grid-cols-3 gap-2">
            <input inputMode="numeric" className={small} placeholder="h" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            <input inputMode="numeric" className={small} placeholder="min" value={m} onChange={(e) => setM(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            <input inputMode="numeric" className={small} placeholder="sec" value={s} onChange={(e) => setS(e.target.value.replace(/\D/g, '').slice(0, 2))} />
          </div>
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field label={kind === 'swim' ? 'Distanza m' : 'Distanza km'}>
            <input inputMode="decimal" className={small} value={distance} onChange={(e) => setDistance(e.target.value)} placeholder="—" />
          </Field>
          <Field label="FC media">
            <input inputMode="numeric" className={small} value={hr} onChange={(e) => setHr(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="bpm" />
          </Field>
          <Field label="Fatica 1-10">
            <input inputMode="numeric" className={small} value={rpe} onChange={(e) => setRpe(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="RPE" />
          </Field>
        </div>
        {pace && <p className="num text-sm text-muted">Passo medio: <span className="font-semibold text-fg">{pace}</span></p>}
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note (opzionale)" />
        <ErrorText error={error} />
      </form>
    </Sheet>
  )
}
