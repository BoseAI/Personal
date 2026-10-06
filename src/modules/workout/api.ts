import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, unwrap } from '../../lib/supabase'
import type { CustomExercise, WorkoutPlan, WorkoutSession, WorkoutSet } from './types'

const qk = {
  all: ['workout'] as const,
  plans: ['workout', 'plans'] as const,
  custom: ['workout', 'custom'] as const,
  sessions: (from: string, to: string) => ['workout', 'sessions', from, to] as const,
  session: (id: string) => ['workout', 'session', id] as const,
  history: (key: string) => ['workout', 'history', key] as const,
  lastSets: (keys: string[]) => ['workout', 'lastSets', keys] as const,
  trainedKeys: ['workout', 'trainedKeys'] as const,
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

// -----------------------------------------------------------------------------
// Esercizi personalizzati
// -----------------------------------------------------------------------------
export function useCustomExercises() {
  return useQuery({
    queryKey: qk.custom,
    queryFn: async () => unwrap(await supabase.from('custom_exercises').select('*').order('name')) as CustomExercise[],
  })
}

export function useSaveCustomExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: Omit<CustomExercise, 'id'>) =>
      unwrap(await supabase.from('custom_exercises').insert(v).select('*').single()) as CustomExercise,
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.custom }),
  })
}

// -----------------------------------------------------------------------------
// Schede
// -----------------------------------------------------------------------------
export function usePlans() {
  return useQuery({
    queryKey: qk.plans,
    queryFn: async () =>
      unwrap(
        await supabase.from('workout_plans').select('*').is('archived_at', null).order('sort_order').order('created_at'),
      ) as WorkoutPlan[],
  })
}

export function useSavePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<WorkoutPlan> & { id?: string }) => {
      if (id) return unwrap(await supabase.from('workout_plans').update(values).eq('id', id).select('*').single()) as WorkoutPlan
      return unwrap(await supabase.from('workout_plans').insert(values).select('*').single()) as WorkoutPlan
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plans }),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('workout_plans').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.plans }),
  })
}

// -----------------------------------------------------------------------------
// Sessioni
// -----------------------------------------------------------------------------
const normSession = (s: WorkoutSession): WorkoutSession => ({ ...s, distance_m: num(s.distance_m) })
const normSet = (s: WorkoutSet): WorkoutSet => ({ ...s, weight_kg: num(s.weight_kg) })

/** Sessioni nell'intervallo [from, to) (timestamp ISO). */
export function useSessions(from: string, to: string) {
  return useQuery({
    queryKey: qk.sessions(from, to),
    queryFn: async () =>
      (
        unwrap(
          await supabase.from('workout_sessions').select('*').gte('started_at', from).lt('started_at', to).order('started_at', { ascending: false }),
        ) as WorkoutSession[]
      ).map(normSession),
  })
}

/** Serie delle sessioni indicate (per il riepilogo muscolare e il volume). */
export function useSetsForSessions(ids: string[]) {
  return useQuery({
    queryKey: ['workout', 'setsFor', ids],
    enabled: ids.length > 0,
    queryFn: async () => (unwrap(await supabase.from('workout_sets').select('*').in('session_id', ids)) as WorkoutSet[]).map(normSet),
  })
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: qk.session(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const [session, sets] = await Promise.all([
        supabase.from('workout_sessions').select('*').eq('id', id!).single().then(unwrap),
        supabase.from('workout_sets').select('*').eq('session_id', id!).order('block_index').order('set_index').then(unwrap),
      ])
      return { session: normSession(session as WorkoutSession), sets: (sets as WorkoutSet[]).map(normSet) }
    },
  })
}

export type SessionInput = Omit<WorkoutSession, 'id'> & { id?: string }
export type SetInput = Pick<WorkoutSet, 'exercise_key' | 'exercise_name' | 'block_index' | 'set_index' | 'weight_kg' | 'reps' | 'duration_sec'>

export function useSaveSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ session, sets }: { session: SessionInput; sets?: SetInput[] }) => {
      const { id, ...values } = session
      const saved = id
        ? (unwrap(await supabase.from('workout_sessions').update(values).eq('id', id).select('*').single()) as WorkoutSession)
        : (unwrap(await supabase.from('workout_sessions').insert(values).select('*').single()) as WorkoutSession)
      if (sets) {
        if (id) unwrap(await supabase.from('workout_sets').delete().eq('session_id', saved.id))
        if (sets.length) unwrap(await supabase.from('workout_sets').insert(sets.map((s) => ({ ...s, session_id: saved.id }))))
      }
      return saved
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('workout_sessions').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

// -----------------------------------------------------------------------------
// Storico per esercizio (precompilazione carichi e progressi)
// -----------------------------------------------------------------------------
/** Per ogni esercizio, le serie dell'ultima sessione in cui è stato fatto. */
export function useLastSets(keys: string[]) {
  const sorted = [...new Set(keys)].sort()
  return useQuery({
    queryKey: qk.lastSets(sorted),
    enabled: sorted.length > 0,
    queryFn: async () => {
      const rows = (
        unwrap(
          await supabase.from('workout_sets').select('*').in('exercise_key', sorted).order('created_at', { ascending: false }).limit(1000),
        ) as WorkoutSet[]
      ).map(normSet)
      const out = new Map<string, WorkoutSet[]>()
      for (const key of sorted) {
        const latest = rows.find((r) => r.exercise_key === key)
        if (latest) out.set(key, rows.filter((r) => r.session_id === latest.session_id && r.exercise_key === key).sort((a, b) => a.set_index - b.set_index))
      }
      return out
    },
  })
}

export function useExerciseHistory(key: string | null) {
  return useQuery({
    queryKey: qk.history(key ?? ''),
    enabled: !!key,
    queryFn: async () => {
      const sets = (
        unwrap(await supabase.from('workout_sets').select('*').eq('exercise_key', key!).order('created_at')) as WorkoutSet[]
      ).map(normSet)
      const ids = [...new Set(sets.map((s) => s.session_id))]
      const sessions = ids.length
        ? (unwrap(await supabase.from('workout_sessions').select('id, started_at, name').in('id', ids)) as Pick<WorkoutSession, 'id' | 'started_at' | 'name'>[])
        : []
      return { sets, sessions }
    },
  })
}

/** Esercizi già allenati almeno una volta (per la pagina Progressi). */
export function useTrainedExercises() {
  return useQuery({
    queryKey: qk.trainedKeys,
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('workout_sets').select('exercise_key, exercise_name, created_at').order('created_at', { ascending: false }).limit(5000),
      ) as Pick<WorkoutSet, 'exercise_key' | 'exercise_name' | 'created_at'>[]
      const seen = new Map<string, { key: string; name: string; last: string; count: number }>()
      for (const r of rows) {
        const cur = seen.get(r.exercise_key)
        if (cur) cur.count++
        else seen.set(r.exercise_key, { key: r.exercise_key, name: r.exercise_name, last: r.created_at, count: 1 })
      }
      return [...seen.values()]
    },
  })
}
