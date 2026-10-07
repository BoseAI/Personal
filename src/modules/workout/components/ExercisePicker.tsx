import { Check, Plus, Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { Sheet } from '../../../components/ui/Sheet'
import { cn } from '../../../lib/cn'
import { errorMessage } from '../../../lib/supabase'
import { useCustomExercises, useSaveCustomExercise } from '../api'
import type { Exercise, ExerciseCategory, Measure } from '../catalog'
import { allExercises, customToExercise, matchScore } from '../exercises'
import { GROUP_COLORS, MUSCLE_GROUPS, MUSCLES, type Muscle } from '../muscles'
import { MEASURE_INFO } from '../measures'
import { MuscleTags } from './MuscleTags'

type CategoryFilter = 'all' | ExerciseCategory

/**
 * Scelta esercizi: filtra per muscoli (es. Dorsali + Polpacci) e li ordina per pertinenza,
 * evidenziando quelli che li allenano come muscolo principale.
 */
export function ExercisePicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (list: Exercise[]) => void }) {
  if (!open) return null
  return <PickerBody onClose={onClose} onPick={onPick} />
}

function PickerBody({ onClose, onPick }: { onClose: () => void; onPick: (list: Exercise[]) => void }) {
  const { data: custom = [] } = useCustomExercises()
  const [query, setQuery] = useState('')
  const [muscles, setMuscles] = useState<Muscle[]>([])
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [picked, setPicked] = useState<Exercise[]>([])
  const [creating, setCreating] = useState(false)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allExercises(custom)
      .filter((e) => (category === 'all' ? true : e.category === category || e.custom))
      .filter((e) => !q || e.name.toLowerCase().includes(q) || e.equipment.toLowerCase().includes(q))
      .map((e) => ({ e, score: matchScore(e, muscles) }))
      .filter((x) => !muscles.length || x.score > 0)
      .sort((a, b) => b.score - a.score || a.e.name.localeCompare(b.e.name, 'it'))
  }, [custom, query, muscles, category])

  const toggleMuscle = (m: Muscle) => setMuscles((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]))
  const togglePick = (e: Exercise) => setPicked((cur) => (cur.some((x) => x.key === e.key) ? cur.filter((x) => x.key !== e.key) : [...cur, e]))

  return (
    <Sheet
      open
      onClose={onClose}
      title="Aggiungi esercizi"
      footer={
        <Button variant="primary" className="w-full" disabled={!picked.length} onClick={() => (onPick(picked), onClose())}>
          Aggiungi {picked.length > 0 && `(${picked.length})`}
        </Button>
      }
    >
      <div className="space-y-3">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
          <Search className="size-4 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca esercizio o attrezzo"
            className="w-full bg-transparent outline-none placeholder:text-faint"
          />
        </label>

        <div className="space-y-2">
          <p className="text-xs text-muted">Cosa vuoi allenare? I suggerimenti si ordinano di conseguenza.</p>
          {MUSCLE_GROUPS.map((g) => (
            <div key={g} className="flex flex-wrap items-center gap-1.5">
              {(Object.keys(MUSCLES) as Muscle[])
                .filter((m) => MUSCLES[m].group === g)
                .map((m) => {
                  const on = muscles.includes(m)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMuscle(m)}
                      className={cn('rounded-full border px-2.5 py-1 text-xs transition', on ? 'text-fg' : 'border-line text-muted hover:bg-surface-2')}
                      style={on ? { background: `${GROUP_COLORS[g]}33`, borderColor: GROUP_COLORS[g] } : undefined}
                    >
                      {MUSCLES[m].label}
                    </button>
                  )
                })}
            </div>
          ))}
        </div>

        <Segmented
          size="sm"
          className="w-full"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'Tutti' },
            { value: 'gym', label: 'Palestra' },
            { value: 'crossfit', label: 'CrossFit' },
            { value: 'corpo libero', label: 'Corpo libero' },
          ]}
        />

        <div className="flex items-center justify-between px-1 text-xs text-faint">
          <span>{list.length} esercizi</span>
          <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1 text-muted hover:text-fg">
            <Plus className="size-3.5" /> Crea esercizio
          </button>
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {list.slice(0, 120).map(({ e, score }) => {
            const on = picked.some((x) => x.key === e.key)
            const best = muscles.length > 0 && e.primary.some((m) => muscles.includes(m))
            return (
              <button key={e.key} type="button" onClick={() => togglePick(e)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-surface-2">
                <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong')}>
                  {on && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center gap-1.5 text-sm">
                    {e.name}
                    {best && score >= 2 && <Sparkles className="size-3.5 shrink-0 text-accent" aria-label="Consigliato" />}
                  </span>
                  <MuscleTags exercise={e} />
                </span>
                <span className="shrink-0 text-right text-[11px] text-faint">
                  {e.equipment}
                  {e.measure !== 'reps' && <span className="block text-accent">{MEASURE_INFO[e.measure].label.toLowerCase()}</span>}
                </span>
              </button>
            )
          })}
          {!list.length && <p className="px-3 py-6 text-center text-sm text-faint">Nessun esercizio trovato</p>}
        </div>
      </div>
      <CustomExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(e) => setPicked((cur) => [...cur, e])}
        defaultName={query}
      />
    </Sheet>
  )
}

function CustomExerciseSheet({
  open,
  onClose,
  onCreated,
  defaultName,
}: {
  open: boolean
  onClose: () => void
  onCreated: (e: Exercise) => void
  defaultName: string
}) {
  if (!open) return null
  return <CustomExerciseForm onClose={onClose} onCreated={onCreated} defaultName={defaultName} />
}

function CustomExerciseForm({ onClose, onCreated, defaultName }: { onClose: () => void; onCreated: (e: Exercise) => void; defaultName: string }) {
  const save = useSaveCustomExercise()
  const [name, setName] = useState(defaultName)
  const [equipment, setEquipment] = useState('')
  const [primary, setPrimary] = useState<Muscle[]>([])
  const [secondary, setSecondary] = useState<Muscle[]>([])
  const [measure, setMeasure] = useState<Measure>('reps')
  const [error, setError] = useState<string | null>(null)

  const cycle = (m: Muscle) => {
    if (primary.includes(m)) {
      setPrimary(primary.filter((x) => x !== m))
      setSecondary([...secondary, m])
    } else if (secondary.includes(m)) setSecondary(secondary.filter((x) => x !== m))
    else setPrimary([...primary, m])
  }

  async function submit() {
    if (!name.trim()) return setError('Inserisci un nome.')
    if (!primary.length) return setError('Scegli almeno un muscolo principale.')
    try {
      const c = await save.mutateAsync({ name: name.trim(), equipment: equipment.trim() || null, primary_muscles: primary, secondary_muscles: secondary, measure })
      onCreated(customToExercise(c))
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Nuovo esercizio"
      footer={
        <Button variant="primary" className="w-full" loading={save.isPending} onClick={submit}>
          Crea
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Rematore al TRX" />
        </Field>
        <Field label="Attrezzo">
          <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Opzionale" />
        </Field>
        <Field label="Come si misura">
          <Segmented
            size="sm"
            className="w-full"
            value={measure}
            onChange={setMeasure}
            options={(Object.keys(MEASURE_INFO) as Measure[]).map((m) => ({ value: m, label: MEASURE_INFO[m].label }))}
          />
        </Field>
        <Field label="Muscoli" hint="Un tocco: principale · due tocchi: secondario · tre: rimuovi">
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(MUSCLES) as Muscle[]).map((m) => {
              const c = GROUP_COLORS[MUSCLES[m].group]
              const p = primary.includes(m)
              const s = secondary.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => cycle(m)}
                  className={cn('rounded-full border px-2.5 py-1 text-xs', !p && !s && 'border-line text-muted')}
                  style={p ? { background: `${c}33`, borderColor: c } : s ? { borderColor: c, borderStyle: 'dashed' } : undefined}
                >
                  {MUSCLES[m].label}
                </button>
              )
            })}
          </div>
        </Field>
        <ErrorText error={error} />
      </div>
    </Sheet>
  )
}
