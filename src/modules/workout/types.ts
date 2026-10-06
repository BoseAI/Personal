export type BlockKind = 'single' | 'superset' | 'circuit'
export type SetType = 'normal' | 'drop' | 'pyramid' | 'rest_pause'
export type SessionKind = 'strength' | 'run' | 'swim' | 'other'

export type PlanItem = {
  id: string
  exerciseKey: string
  exerciseName: string
  sets: number
  reps: string
  restSec: number
  weightKg: number | null
  setType: SetType
  notes?: string
}

export type PlanBlock = {
  id: string
  kind: BlockKind
  /** Circuito: numero di giri. */
  rounds: number
  /** Recupero dopo il blocco (superserie/circuito: dopo ogni giro). */
  restSec: number
  items: PlanItem[]
}

export type WorkoutPlan = {
  id: string
  name: string
  notes: string | null
  color: string
  blocks: PlanBlock[]
  sort_order: number
  archived_at: string | null
  updated_at: string
}

export type WorkoutSession = {
  id: string
  kind: SessionKind
  plan_id: string | null
  name: string
  started_at: string
  duration_sec: number | null
  distance_m: number | null
  avg_hr: number | null
  rpe: number | null
  notes: string | null
}

export type WorkoutSet = {
  id: string
  session_id: string
  exercise_key: string
  exercise_name: string
  block_index: number
  set_index: number
  weight_kg: number | null
  reps: number | null
  duration_sec: number | null
  created_at: string
}

export type CustomExercise = {
  id: string
  name: string
  primary_muscles: string[]
  secondary_muscles: string[]
  equipment: string | null
}

export const BLOCK_LABELS: Record<BlockKind, { label: string; hint: string }> = {
  single: { label: 'Singolo', hint: 'Esercizio classico: tutte le serie, poi il successivo.' },
  superset: { label: 'Superserie', hint: 'Esercizi uno dopo l\'altro senza pausa, recupero alla fine del giro.' },
  circuit: { label: 'Circuito', hint: 'Giri completi di tutti gli esercizi, recupero tra un giro e l\'altro.' },
}

export const SET_TYPE_LABELS: Record<SetType, string> = {
  normal: 'Normale',
  drop: 'Drop set (a scalare)',
  pyramid: 'Piramidale',
  rest_pause: 'Rest-pause',
}

export const SESSION_LABELS: Record<SessionKind, string> = {
  strength: 'Palestra',
  run: 'Corsa',
  swim: 'Nuoto',
  other: 'Altro',
}
