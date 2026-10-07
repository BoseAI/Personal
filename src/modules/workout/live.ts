import { useSyncExternalStore } from 'react'
import type { Exercise, Measure } from './catalog'
import { measureOf, uid } from './exercises'
import type { BlockKind, SetType, WorkoutPlan } from './types'

/** duration in secondi, distance in metri. */
export type LiveSet = { weight: number | null; reps: number | null; duration: number | null; distance: number | null; done: boolean }
export type LiveItem = {
  id: string
  exerciseKey: string
  exerciseName: string
  measure: Measure
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

/** Sessioni salvate da versioni precedenti dell'app: senza unità di misura = ripetizioni. */
function normalize(s: LiveSession): LiveSession {
  return {
    ...s,
    blocks: s.blocks.map((b) => ({
      ...b,
      items: b.items.map((it) => ({
        ...it,
        measure: it.measure ?? 'reps',
        sets: it.sets.map((x) => ({ ...x, duration: x.duration ?? null, distance: x.distance ?? null })),
      })),
    })),
  }
}

function read(): LiveSession | null {
  if (cache !== undefined) return cache
  try {
    const raw = localStorage.getItem(KEY)
    cache = raw ? normalize(JSON.parse(raw) as LiveSession) : null
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

/** Serie vuota precompilata con l'obiettivo, secondo l'unità di misura. */
function targetSet(measure: Measure, target: string, weight: number | null): LiveSet {
  const v = firstInt(target)
  return {
    weight: measure === 'reps' || measure === 'distance' ? weight : null,
    reps: measure === 'reps' ? v : null,
    duration: measure === 'time' ? v : measure === 'cardio' && v !== null ? v * 60 : null,
    distance: measure === 'distance' ? v : null,
    done: false,
  }
}

export function liveItem(
  e: Pick<Exercise, 'key' | 'name' | 'measure'>,
  sets = 3,
  target?: string,
  restSec = 90,
  weight: number | null = null,
  setType: SetType = 'normal',
): LiveItem {
  const t = target ?? { reps: '10', time: '45', distance: '40', cardio: '20' }[e.measure]
  return {
    id: uid(),
    exerciseKey: e.key,
    exerciseName: e.name,
    measure: e.measure,
    restSec,
    setType,
    targetReps: t,
    sets: Array.from({ length: sets }, () => targetSet(e.measure, t, weight)),
  }
}

export function startLiveSession(plan: Pick<WorkoutPlan, 'id' | 'name' | 'blocks'> | null, exercises: Exercise[]) {
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
        liveItem(
          { key: it.exerciseKey, name: it.exerciseName, measure: measureOf(it.exerciseKey, exercises) },
          b.kind === 'circuit' ? b.rounds : it.sets,
          it.reps,
          it.restSec,
          it.weightKg,
          it.setType,
        ),
      ),
    })),
  })
}
