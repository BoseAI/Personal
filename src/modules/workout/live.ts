import { useSyncExternalStore } from 'react'
import type { Exercise } from './catalog'
import { uid } from './exercises'
import type { BlockKind, SetType, WorkoutPlan } from './types'

export type LiveSet = { weight: number | null; reps: number | null; done: boolean }
export type LiveItem = {
  id: string
  exerciseKey: string
  exerciseName: string
  restSec: number
  setType: SetType
  targetReps: string
  sets: LiveSet[]
  /** Carichi già precompilati con l'ultima sessione. */
  prefilled?: boolean
}
export type LiveBlock = { id: string; kind: BlockKind; restSec: number; items: LiveItem[] }
export type LiveSession = {
  id: string
  planId: string | null
  name: string
  startedAt: string
  blocks: LiveBlock[]
}

// Allenamento in corso salvato sul telefono: sopravvive a chiusure e ricariche dell'app.
const KEY = 'boseia.workout.live'
const listeners = new Set<() => void>()
let cache: LiveSession | null | undefined

function read(): LiveSession | null {
  if (cache !== undefined) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? (JSON.parse(raw) as LiveSession) : null
  } catch {
    cache = null
  }
  return cache
}

export function setLiveSession(next: LiveSession | null) {
  cache = next
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage non disponibile: resta in memoria */
  }
  listeners.forEach((l) => l())
}

export function updateLiveSession(fn: (s: LiveSession) => LiveSession) {
  const cur = read()
  if (cur) setLiveSession(fn(cur))
}

export function useLiveSession(): LiveSession | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    read,
    () => null,
  )
}

export function firstInt(reps: string): number | null {
  const m = reps.match(/\d+/)
  return m ? Number(m[0]) : null
}

export function liveItem(e: Pick<Exercise, 'key' | 'name'>, sets = 3, reps = '10', restSec = 90, weight: number | null = null, setType: SetType = 'normal'): LiveItem {
  return {
    id: uid(),
    exerciseKey: e.key,
    exerciseName: e.name,
    restSec,
    setType,
    targetReps: reps,
    sets: Array.from({ length: sets }, () => ({ weight, reps: firstInt(reps), done: false })),
  }
}

export function startLiveSession(plan: Pick<WorkoutPlan, 'id' | 'name' | 'blocks'> | null) {
  setLiveSession({
    id: uid(),
    planId: plan?.id ?? null,
    name: plan?.name ?? 'Allenamento libero',
    startedAt: new Date().toISOString(),
    blocks: (plan?.blocks ?? []).map((b) => ({
      id: uid(),
      kind: b.kind,
      restSec: b.restSec,
      items: b.items.map((it) =>
        liveItem({ key: it.exerciseKey, name: it.exerciseName }, b.kind === 'circuit' ? b.rounds : it.sets, it.reps, it.restSec, it.weightKg, it.setType),
      ),
    })),
  })
}
