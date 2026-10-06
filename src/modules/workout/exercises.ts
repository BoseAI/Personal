import { CATALOG, type Exercise } from './catalog'
import { GROUP_COLORS, MUSCLE_GROUPS, MUSCLES, type Muscle, type MuscleGroup } from './muscles'
import type { CustomExercise, PlanBlock } from './types'

export function customToExercise(c: CustomExercise): Exercise {
  return {
    key: `custom:${c.id}`,
    name: c.name,
    primary: c.primary_muscles.filter((m): m is Muscle => m in MUSCLES),
    secondary: c.secondary_muscles.filter((m): m is Muscle => m in MUSCLES),
    equipment: c.equipment ?? 'Personalizzato',
    category: 'gym',
    custom: true,
  }
}

export function allExercises(custom: CustomExercise[]): Exercise[] {
  return [...custom.map(customToExercise), ...CATALOG]
}

export function findExercise(key: string, list: Exercise[]): Exercise | undefined {
  return list.find((e) => e.key === key)
}

/** Punteggio di pertinenza rispetto ai muscoli cercati: primario 2, secondario 1. */
export function matchScore(e: Exercise, wanted: Muscle[]): number {
  if (!wanted.length) return 0
  return wanted.reduce((s, m) => s + (e.primary.includes(m) ? 2 : e.secondary.includes(m) ? 1 : 0), 0)
}

export type FocusRow = { group: MuscleGroup; share: number; color: string; muscles: { muscle: Muscle; share: number }[] }

/**
 * Su cosa si concentra la scheda: ogni serie vale 1 per i muscoli primari
 * e 0,5 per i secondari; il risultato è la quota per gruppo muscolare.
 */
export function planFocus(blocks: PlanBlock[], list: Exercise[]): FocusRow[] {
  const perMuscle = new Map<Muscle, number>()
  for (const b of blocks) {
    for (const it of b.items) {
      const ex = findExercise(it.exerciseKey, list)
      if (!ex) continue
      const sets = b.kind === 'circuit' ? b.rounds : it.sets
      for (const m of ex.primary) perMuscle.set(m, (perMuscle.get(m) ?? 0) + sets)
      for (const m of ex.secondary) perMuscle.set(m, (perMuscle.get(m) ?? 0) + sets * 0.5)
    }
  }
  const total = [...perMuscle.values()].reduce((s, v) => s + v, 0)
  if (!total) return []
  return MUSCLE_GROUPS.map((group) => {
    const muscles = [...perMuscle]
      .filter(([m]) => MUSCLES[m].group === group)
      .map(([muscle, v]) => ({ muscle, share: v / total }))
      .sort((a, b) => b.share - a.share)
    return { group, color: GROUP_COLORS[group], share: muscles.reduce((s, m) => s + m.share, 0), muscles }
  })
    .filter((r) => r.share > 0)
    .sort((a, b) => b.share - a.share)
}

/** Stima del massimale (formula di Epley). */
export function estimated1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  return reps === 1 ? weight : weight * (1 + reps / 30)
}

export function uid(): string {
  return crypto.randomUUID()
}

/** Come planFocus, ma sulle serie realmente eseguite (riepilogo settimanale). */
export function setsFocus(sets: { exercise_key: string }[], list: Exercise[]): FocusRow[] {
  const perKey = new Map<string, number>()
  for (const s of sets) perKey.set(s.exercise_key, (perKey.get(s.exercise_key) ?? 0) + 1)
  const blocks: PlanBlock[] = [...perKey].map(([key, n]) => ({
    id: key,
    kind: 'single',
    rounds: 1,
    restSec: 0,
    items: [{ id: key, exerciseKey: key, exerciseName: key, sets: n, reps: '', restSec: 0, weightKg: null, setType: 'normal' }],
  }))
  return planFocus(blocks, list)
}
