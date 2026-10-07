import { ChevronLeft, Play, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/Card'
import { ErrorText, Input, Textarea } from '../../../components/ui/Field'
import { PageLoader } from '../../../components/ui/Spinner'
import { useToast } from '../../../components/ui/Toast'
import { errorMessage } from '../../../lib/supabase'
import { useCustomExercises, useDeletePlan, usePlans, useSavePlan } from '../api'
import type { Exercise } from '../catalog'
import { BlockEditor } from '../components/BlockEditor'
import { ExercisePicker } from '../components/ExercisePicker'
import { FocusCard } from '../components/FocusCard'
import { allExercises, planFocus, uid } from '../exercises'
import { startLiveSession } from '../live'
import { MEASURE_INFO } from '../measures'
import type { PlanBlock, PlanItem, WorkoutPlan } from '../types'

export function PlanEditorPage() {
  const { planId } = useParams()
  const { data: plans, isLoading } = usePlans()
  if (isLoading) return <PageLoader />
  const plan = plans?.find((p) => p.id === planId)
  if (!plan) return <Navigate to="/allenamento/schede" replace />
  return <Editor key={plan.id + plan.updated_at} plan={plan} />
}

function newItem(e: Exercise): PlanItem {
  return {
    id: uid(),
    exerciseKey: e.key,
    exerciseName: e.name,
    sets: e.measure === 'cardio' ? 1 : 3,
    reps: MEASURE_INFO[e.measure].defaultTarget,
    restSec: e.measure === 'cardio' ? 0 : 90,
    weightKg: null,
    setType: 'normal',
  }
}

function Editor({ plan }: { plan: WorkoutPlan }) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSavePlan()
  const del = useDeletePlan()
  const { data: custom = [] } = useCustomExercises()
  const exercises = useMemo(() => allExercises(custom), [custom])

  const [name, setName] = useState(plan.name)
  const [notes, setNotes] = useState(plan.notes ?? '')
  const [blocks, setBlocks] = useState<PlanBlock[]>(plan.blocks)
  const [dirty, setDirty] = useState(false)
  const [picker, setPicker] = useState<{ blockId: string | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const focus = useMemo(() => planFocus(blocks, exercises), [blocks, exercises])
  const update = (next: PlanBlock[]) => (setBlocks(next), setDirty(true))

  function addExercises(list: Exercise[]) {
    if (picker?.blockId) {
      update(blocks.map((b) => (b.id === picker.blockId ? { ...b, items: [...b.items, ...list.map(newItem)] } : b)))
    } else {
      update([...blocks, ...list.map((e) => ({ id: uid(), kind: 'single' as const, rounds: 3, restSec: 90, items: [newItem(e)] }))])
    }
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...blocks]
    ;[next[i], next[i + dir]] = [next[i + dir], next[i]]
    update(next)
  }

  function linkNext(i: number) {
    const a = blocks[i]
    const b = blocks[i + 1]
    const merged: PlanBlock = { ...a, kind: 'superset', restSec: Math.max(a.restSec, ...a.items.map((x) => x.restSec)), items: [...a.items, ...b.items] }
    update([...blocks.slice(0, i), merged, ...blocks.slice(i + 2)])
  }

  function split(i: number) {
    const b = blocks[i]
    const singles = b.items.map((it) => ({ id: uid(), kind: 'single' as const, rounds: 3, restSec: b.restSec, items: [{ ...it, sets: b.kind === 'circuit' ? b.rounds : it.sets }] }))
    update([...blocks.slice(0, i), ...singles, ...blocks.slice(i + 1)])
  }

  async function persist() {
    if (!name.trim()) return setError('Dai un nome alla scheda.')
    try {
      await save.mutateAsync({ id: plan.id, name: name.trim(), notes: notes.trim() || null, blocks })
      setDirty(false)
      setError(null)
      toast({ message: 'Scheda salvata' }, 2000)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function start() {
    if (dirty) await persist()
    startLiveSession({ ...plan, name: name.trim() || plan.name, blocks }, exercises)
    navigate('/allenamento/live')
  }

  async function remove() {
    if (!confirm(`Eliminare la scheda "${plan.name}"? Gli allenamenti già registrati restano.`)) return
    try {
      await del.mutateAsync(plan.id)
      navigate('/allenamento/schede')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4 pt-4 pb-24">
      <div className="flex items-center gap-2">
        <Link to="/allenamento/schede" aria-label="Indietro" className="-ml-2 flex size-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <ChevronLeft className="size-6" />
        </Link>
        <Input value={name} onChange={(e) => (setName(e.target.value), setDirty(true))} className="h-10 flex-1 font-semibold" />
        <Button variant="danger" onClick={remove} aria-label="Elimina scheda">
          <Trash2 className="size-4" />
        </Button>
      </div>

      <FocusCard rows={focus} title="Cosa allena questa scheda" empty="Aggiungi esercizi: qui vedrai su quali muscoli si concentra la scheda." />

      {blocks.length === 0 ? (
        <EmptyState title="Scheda vuota">Aggiungi gli esercizi dal catalogo, filtrando per muscolo.</EmptyState>
      ) : (
        <div className="space-y-3">
          {blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              index={i}
              count={blocks.length}
              exercises={exercises}
              onChange={(nb) => update(blocks.map((x) => (x.id === b.id ? nb : x)))}
              onRemove={() => update(blocks.filter((x) => x.id !== b.id))}
              onMove={(d) => move(i, d)}
              onLinkNext={() => linkNext(i)}
              onSplit={() => split(i)}
              onAddExercise={() => setPicker({ blockId: b.id })}
            />
          ))}
        </div>
      )}

      <Button className="w-full" onClick={() => setPicker({ blockId: null })}>
        <Plus className="size-4" /> Aggiungi esercizi
      </Button>

      <Textarea value={notes} onChange={(e) => (setNotes(e.target.value), setDirty(true))} placeholder="Note sulla scheda (opzionale)" />
      <ErrorText error={error} />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl gap-2 px-4 py-2.5">
          <Button className="flex-1" variant={dirty ? 'primary' : 'secondary'} disabled={!dirty} loading={save.isPending} onClick={persist}>
            {dirty ? 'Salva modifiche' : 'Salvata'}
          </Button>
          <Button className="flex-1" variant={dirty ? 'secondary' : 'primary'} disabled={!blocks.length} onClick={start}>
            <Play className="size-4" /> Inizia
          </Button>
        </div>
      </div>

      <ExercisePicker open={picker !== null} onClose={() => setPicker(null)} onPick={addExercises} />
    </div>
  )
}
