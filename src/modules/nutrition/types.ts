export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain'

export type NutritionProfile = {
  user_id: string
  sex: 'm' | 'f' | null
  birth_date: string | null
  height_cm: number | null
  activity: Activity
  goal: Goal
  target_weight_kg: number | null
  kcal_override: number | null
  protein_override: number | null
  carbs_override: number | null
  fat_override: number | null
  water_override: number | null
}

export type BodyWeight = { id: string; date: string; weight_kg: number; body_fat: number | null; note: string | null }

/** Cibo pronto per il diario: valori per 100 g. */
export type FoodItem = {
  key: string
  name: string
  brand?: string | null
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number | null
  portionG: number | null
  portionName: string | null
  source: 'catalog' | 'custom' | 'off'
  barcode?: string | null
}

export type StoredFood = {
  id: string
  name: string
  brand: string | null
  barcode: string | null
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number | null
  portion_g: number | null
  portion_name: string | null
  source: 'custom' | 'off'
}

export type FoodLog = {
  id: string
  date: string
  meal: Meal
  food_key: string
  food_name: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  created_at: string
}

export type WaterLog = { id: string; date: string; ml: number; created_at: string }

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Colazione' },
  { key: 'lunch', label: 'Pranzo' },
  { key: 'dinner', label: 'Cena' },
  { key: 'snack', label: 'Spuntini' },
]

export const ACTIVITY_LABELS: Record<Activity, { label: string; hint: string; factor: number }> = {
  sedentary: { label: 'Sedentario', hint: 'Lavoro da seduto, pochi passi', factor: 1.2 },
  light: { label: 'Leggero', hint: 'Cammini un po\' ogni giorno', factor: 1.375 },
  moderate: { label: 'Moderato', hint: 'Lavoro in piedi o molto movimento', factor: 1.55 },
  active: { label: 'Attivo', hint: 'Lavoro fisico', factor: 1.725 },
  very_active: { label: 'Molto attivo', hint: 'Lavoro fisico pesante', factor: 1.9 },
}

export const GOAL_LABELS: Record<Goal, string> = { lose: 'Dimagrire', maintain: 'Mantenere', gain: 'Massa' }

export const MACRO_COLORS = { protein: '#3987e5', carbs: '#c98500', fat: '#d55181' } as const
