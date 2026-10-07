import type { Measure } from './catalog'

/** Etichette e unità per l'obiettivo (campo "reps" della scheda) e per le serie. */
export const MEASURE_INFO: Record<Measure, { label: string; target: string; targetUnit: string; defaultTarget: string }> = {
  reps: { label: 'Ripetizioni', target: 'Ripetizioni', targetUnit: 'rip.', defaultTarget: '10' },
  time: { label: 'A tempo', target: 'Durata (s)', targetUnit: 's', defaultTarget: '45' },
  distance: { label: 'A distanza', target: 'Distanza (m)', targetUnit: 'm', defaultTarget: '40' },
  cardio: { label: 'Cardio', target: 'Durata (min)', targetUnit: 'min', defaultTarget: '20' },
}

export function formatSeconds(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`
}

/** Una serie salvata, in forma leggibile secondo la sua unità di misura. */
export function formatSet(
  measure: Measure,
  s: { weight_kg: number | null; reps: number | null; duration_sec: number | null; distance_m: number | null },
): string {
  const kg = s.weight_kg ? `${s.weight_kg} kg` : null
  switch (measure) {
    case 'time':
      return [formatSeconds(s.duration_sec ?? 0), kg].filter(Boolean).join(' · ')
    case 'distance':
      return [`${s.distance_m ?? 0} m`, kg].filter(Boolean).join(' · ')
    case 'cardio':
      return [formatSeconds(s.duration_sec ?? 0), s.distance_m ? `${(s.distance_m / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} km` : null]
        .filter(Boolean)
        .join(' · ')
    default:
      return `${s.weight_kg ?? 0} kg × ${s.reps ?? 0}`
  }
}
