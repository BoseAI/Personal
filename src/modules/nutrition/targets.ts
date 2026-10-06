import type { WorkoutSession } from '../workout/types'
import { ACTIVITY_LABELS, type NutritionProfile } from './types'

export type Targets = { kcal: number; protein: number; carbs: number; fat: number; water: number }
export type DailyTargets = Targets & { base: Targets; burned: number; complete: boolean }

function age(birth: string, on: Date): number {
  const b = new Date(birth)
  let a = on.getFullYear() - b.getFullYear()
  if (on.getMonth() < b.getMonth() || (on.getMonth() === b.getMonth() && on.getDate() < b.getDate())) a--
  return a
}

/**
 * Obiettivi di base (giornata senza allenamento).
 * Metabolismo basale Mifflin-St Jeor × livello di attività (sport escluso),
 * poi −20% per dimagrire o +10% per la massa. Proteine e grassi in g/kg,
 * carboidrati per differenza; acqua 35 ml/kg. Gli override manuali vincono.
 */
export function baseTargets(p: NutritionProfile | null | undefined, weightKg: number | null, on = new Date()): Targets & { complete: boolean } {
  const complete = !!(p?.sex && p.birth_date && p.height_cm && weightKg)
  const w = weightKg ?? 70
  let kcal = 2000
  if (complete && p) {
    const bmr = 10 * w + 6.25 * Number(p.height_cm) - 5 * age(p.birth_date!, on) + (p.sex === 'm' ? 5 : -161)
    const tdee = bmr * ACTIVITY_LABELS[p.activity].factor
    kcal = tdee * (p.goal === 'lose' ? 0.8 : p.goal === 'gain' ? 1.1 : 1)
  }
  const goal = p?.goal ?? 'maintain'
  const protein = p?.protein_override ?? Math.round(w * (goal === 'lose' ? 2.0 : goal === 'gain' ? 1.8 : 1.6))
  const fat = p?.fat_override ?? Math.round(w * 0.9)
  const finalKcal = p?.kcal_override ?? Math.round(kcal / 10) * 10
  const carbs = p?.carbs_override ?? Math.max(0, Math.round((finalKcal - protein * 4 - fat * 9) / 4))
  const water = p?.water_override ?? Math.round((w * 35) / 50) * 50
  return { kcal: finalKcal, protein, carbs, fat, water, complete }
}

/** MET medi per tipo di attività (Compendium of Physical Activities). */
function met(s: WorkoutSession): number {
  if (s.kind === 'run' && s.distance_m && s.duration_sec) {
    const kmh = s.distance_m / 1000 / (s.duration_sec / 3600)
    return Math.min(16, Math.max(6, kmh * 1.0 + 0.5))
  }
  return { strength: 5, run: 9.8, swim: 7, other: 5 }[s.kind]
}

/** Calorie bruciate stimate: MET × peso × ore. */
export function burnedKcal(sessions: WorkoutSession[], weightKg: number | null): number {
  const w = weightKg ?? 70
  return Math.round(sessions.reduce((t, s) => t + met(s) * w * ((s.duration_sec ?? 0) / 3600), 0))
}

/**
 * Obiettivi del giorno: le calorie bruciate allenandosi si aggiungono
 * (in carboidrati), l'acqua cresce di 500 ml per ora di allenamento.
 */
export function dailyTargets(p: NutritionProfile | null | undefined, weightKg: number | null, sessions: WorkoutSession[], on = new Date()): DailyTargets {
  const base = baseTargets(p, weightKg, on)
  const burned = burnedKcal(sessions, weightKg)
  const hours = sessions.reduce((t, s) => t + (s.duration_sec ?? 0) / 3600, 0)
  return {
    ...base,
    kcal: base.kcal + burned,
    carbs: base.carbs + Math.round(burned / 4),
    water: base.water + Math.round((hours * 500) / 50) * 50,
    base,
    burned,
  }
}

export type DayTotals = { kcal: number; protein: number; carbs: number; fat: number; water: number }

export type Evaluation = {
  score: number
  verdict: string
  tips: string[]
  parts: { label: string; score: number; max: number }[]
}

/**
 * Valutazione della giornata (0-100): calorie vicine all'obiettivo (35),
 * proteine raggiunte (25), acqua (20), equilibrio carboidrati/grassi (10),
 * movimento (10: allenamento fatto, o metà punteggio in un giorno di riposo).
 * Per la giornata in corso il giudizio è "parziale".
 */
export function evaluateDay(t: DailyTargets, d: DayTotals, trained: boolean, isToday: boolean): Evaluation {
  const ratio = (v: number, target: number) => (target > 0 ? v / target : 0)
  const kcalR = ratio(d.kcal, t.kcal)
  const kcalScore = 35 * Math.max(0, 1 - Math.max(0, Math.abs(kcalR - 1) - 0.08) / 0.4)
  const protScore = 25 * Math.min(1, ratio(d.protein, t.protein))
  const waterScore = 20 * Math.min(1, ratio(d.water, t.water))
  const balance = (x: number, target: number) => Math.max(0, 1 - Math.max(0, Math.abs(ratio(x, target) - 1) - 0.15) / 0.5)
  const balanceScore = 10 * ((balance(d.carbs, t.carbs) + balance(d.fat, t.fat)) / 2)
  const moveScore = trained ? 10 : 5
  const score = Math.round(kcalScore + protScore + waterScore + balanceScore + moveScore)

  const tips: string[] = []
  const missingProt = Math.round(t.protein - d.protein)
  const missingWater = Math.round((t.water - d.water) / 50) * 50
  const kcalDiff = Math.round(d.kcal - t.kcal)
  if (missingProt > 5) tips.push(`Mancano ${missingProt} g di proteine`)
  if (missingWater > 0) tips.push(`Bevi ancora ${missingWater} ml d'acqua`)
  if (kcalDiff > t.kcal * 0.08) tips.push(`Sei ${kcalDiff} kcal sopra l'obiettivo`)
  else if (!isToday && kcalDiff < -t.kcal * 0.15) tips.push(`Hai mangiato ${-kcalDiff} kcal meno del necessario`)
  else if (isToday && kcalDiff < 0) tips.push(`Restano ${-kcalDiff} kcal disponibili`)
  if (d.fat > t.fat * 1.25) tips.push('Grassi un po\' alti oggi')
  if (!trained) tips.push('Nessun allenamento registrato')

  const verdict =
    isToday && score < 85
      ? 'Giornata in corso'
      : score >= 85
        ? 'Ottima giornata'
        : score >= 70
          ? 'Buona giornata'
          : score >= 50
            ? 'Giornata nella media'
            : 'Giornata da migliorare'
  return {
    score,
    verdict,
    tips,
    parts: [
      { label: 'Calorie', score: kcalScore, max: 35 },
      { label: 'Proteine', score: protScore, max: 25 },
      { label: 'Acqua', score: waterScore, max: 20 },
      { label: 'Equilibrio', score: balanceScore, max: 10 },
      { label: 'Movimento', score: moveScore, max: 10 },
    ],
  }
}

export function macrosFor(food: { kcal: number; protein: number; carbs: number; fat: number }, grams: number) {
  const k = grams / 100
  const r = (v: number) => Math.round(v * k * 10) / 10
  return { kcal: r(food.kcal), protein: r(food.protein), carbs: r(food.carbs), fat: r(food.fat) }
}
