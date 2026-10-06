import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUserId } from '../../auth/AuthProvider'
import { supabase, unwrap } from '../../lib/supabase'
import type { WorkoutSession } from '../workout/types'
import { FOOD_CATALOG } from './catalog'
import type { BodyWeight, FoodItem, FoodLog, NutritionProfile, StoredFood, WaterLog } from './types'

const qk = {
  all: ['nutrition'] as const,
  profile: ['nutrition', 'profile'] as const,
  weights: ['nutrition', 'weights'] as const,
  foods: ['nutrition', 'foods'] as const,
  logs: (date: string) => ['nutrition', 'logs', date] as const,
  logsRange: (from: string, to: string) => ['nutrition', 'logsRange', from, to] as const,
  water: (date: string) => ['nutrition', 'water', date] as const,
  recent: ['nutrition', 'recent'] as const,
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v))

// -----------------------------------------------------------------------------
// Profilo e obiettivi
// -----------------------------------------------------------------------------
export function useNutritionProfile() {
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const row = unwrap(await supabase.from('nutrition_profiles').select('*').maybeSingle()) as NutritionProfile | null
      return row ? { ...row, height_cm: n(row.height_cm), target_weight_kg: n(row.target_weight_kg) } : null
    },
  })
}

export function useSaveNutritionProfile() {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: async (values: Partial<NutritionProfile>) =>
      unwrap(await supabase.from('nutrition_profiles').upsert({ ...values, user_id: uid, updated_at: new Date().toISOString() })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  })
}

// -----------------------------------------------------------------------------
// Peso
// -----------------------------------------------------------------------------
export function useWeights() {
  return useQuery({
    queryKey: qk.weights,
    queryFn: async () =>
      (unwrap(await supabase.from('body_weights').select('*').order('date')) as BodyWeight[]).map((w) => ({
        ...w,
        weight_kg: Number(w.weight_kg),
        body_fat: n(w.body_fat),
      })),
  })
}

/** Ultimo peso registrato fino alla data indicata. */
export function weightOn(weights: BodyWeight[] | undefined, date: string): number | null {
  const list = (weights ?? []).filter((w) => w.date <= date)
  return list.length ? list[list.length - 1].weight_kg : (weights?.[0]?.weight_kg ?? null)
}

export function useSaveWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { date: string; weight_kg: number; body_fat: number | null; note: string | null }) =>
      unwrap(await supabase.from('body_weights').upsert(v, { onConflict: 'user_id,date' })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.weights }),
  })
}

export function useDeleteWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('body_weights').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.weights }),
  })
}

// -----------------------------------------------------------------------------
// Cibi
// -----------------------------------------------------------------------------
export function storedToItem(f: StoredFood): FoodItem {
  return {
    key: f.source === 'off' && f.barcode ? `off:${f.barcode}` : `food:${f.id}`,
    name: f.name,
    brand: f.brand,
    barcode: f.barcode,
    kcal: Number(f.kcal),
    protein: Number(f.protein),
    carbs: Number(f.carbs),
    fat: Number(f.fat),
    fiber: n(f.fiber),
    portionG: n(f.portion_g),
    portionName: f.portion_name,
    source: f.source,
  }
}

export const catalogItems: FoodItem[] = FOOD_CATALOG.map((c) => ({ ...c, source: 'catalog' as const }))

export function useStoredFoods() {
  return useQuery({
    queryKey: qk.foods,
    queryFn: async () => (unwrap(await supabase.from('foods').select('*').order('name')) as StoredFood[]).map(storedToItem),
  })
}

/** Salva un cibo personale, o un prodotto Open Food Facts per ritrovarlo anche offline. */
export function useSaveFood() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (f: FoodItem) => {
      const row = {
        name: f.name,
        brand: f.brand ?? null,
        barcode: f.barcode ?? null,
        kcal: f.kcal,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
        fiber: f.fiber ?? null,
        portion_g: f.portionG,
        portion_name: f.portionName,
        source: f.source === 'off' ? 'off' : 'custom',
      }
      const saved = f.barcode
        ? unwrap(await supabase.from('foods').upsert(row, { onConflict: 'user_id,barcode' }).select('*').single())
        : unwrap(await supabase.from('foods').insert(row).select('*').single())
      return storedToItem(saved as StoredFood)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.foods }),
  })
}

// -----------------------------------------------------------------------------
// Diario pasti e acqua
// -----------------------------------------------------------------------------
const normLog = (l: FoodLog): FoodLog => ({
  ...l,
  grams: Number(l.grams),
  kcal: Number(l.kcal),
  protein: Number(l.protein),
  carbs: Number(l.carbs),
  fat: Number(l.fat),
})

export function useFoodLogs(date: string) {
  return useQuery({
    queryKey: qk.logs(date),
    queryFn: async () => (unwrap(await supabase.from('food_logs').select('*').eq('date', date).order('created_at')) as FoodLog[]).map(normLog),
  })
}

export function useFoodLogsRange(from: string, to: string) {
  return useQuery({
    queryKey: qk.logsRange(from, to),
    queryFn: async () =>
      (unwrap(await supabase.from('food_logs').select('date, kcal, protein, carbs, fat').gte('date', from).lte('date', to)) as FoodLog[]).map(normLog),
  })
}

/** Cibi usati di recente (i più frequenti in cima). */
export function useRecentFoods() {
  return useQuery({
    queryKey: qk.recent,
    queryFn: async () => {
      const rows = unwrap(
        await supabase.from('food_logs').select('food_key, food_name, grams, kcal, protein, carbs, fat').order('created_at', { ascending: false }).limit(300),
      ) as FoodLog[]
      const map = new Map<string, { log: FoodLog; count: number }>()
      for (const r of rows.map(normLog)) {
        const cur = map.get(r.food_key)
        if (cur) cur.count++
        else map.set(r.food_key, { log: r, count: 1 })
      }
      return [...map.values()].sort((a, b) => b.count - a.count).map((x) => x.log)
    },
  })
}

export type LogInput = Omit<FoodLog, 'id' | 'created_at'> & { id?: string }

export function useSaveLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: LogInput) => {
      if (id) return unwrap(await supabase.from('food_logs').update(values).eq('id', id))
      return unwrap(await supabase.from('food_logs').insert(values))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

export function useDeleteLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('food_logs').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

export function useWater(date: string) {
  return useQuery({
    queryKey: qk.water(date),
    queryFn: async () => unwrap(await supabase.from('water_logs').select('*').eq('date', date).order('created_at')) as WaterLog[],
  })
}

export function useAddWater() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { date: string; ml: number }) => unwrap(await supabase.from('water_logs').insert(v)),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: qk.water(v.date) }),
  })
}

// -----------------------------------------------------------------------------
// Allenamenti del giorno (per calorie bruciate e valutazione)
// -----------------------------------------------------------------------------
export function useDaySessions(date: string) {
  return useQuery({
    queryKey: ['workout', 'day', date],
    queryFn: async () => {
      const [y, m, d] = date.split('-').map(Number)
      const from = new Date(y, m - 1, d)
      const to = new Date(y, m - 1, d + 1)
      return unwrap(
        await supabase.from('workout_sessions').select('*').gte('started_at', from.toISOString()).lt('started_at', to.toISOString()),
      ) as WorkoutSession[]
    },
  })
}
