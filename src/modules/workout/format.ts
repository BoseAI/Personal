import type { WorkoutSession } from './types'

export function formatDuration(sec: number | null | undefined): string {
  if (!sec) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`
  return s ? `${m}m ${String(s).padStart(2, '0')}s` : `${m} min`
}

export function formatDistance(s: Pick<WorkoutSession, 'kind' | 'distance_m'>): string | null {
  if (!s.distance_m) return null
  return s.kind === 'swim' ? `${Math.round(s.distance_m).toLocaleString('it-IT')} m` : `${(s.distance_m / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} km`
}

/** Passo: min/km per la corsa, min/100 m per il nuoto. */
export function formatPace(s: Pick<WorkoutSession, 'kind' | 'distance_m' | 'duration_sec'>): string | null {
  if (!s.distance_m || !s.duration_sec) return null
  const unit = s.kind === 'swim' ? 100 : 1000
  const secPer = s.duration_sec / (s.distance_m / unit)
  const m = Math.floor(secPer / 60)
  const sec = Math.round(secPer % 60)
  return `${m}:${String(sec).padStart(2, '0')} /${s.kind === 'swim' ? '100 m' : 'km'}`
}

/** Lunedì 00:00 della settimana che contiene la data. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
const timeFmt = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' })
export const formatSessionDate = (iso: string) => `${dayFmt.format(new Date(iso))} · ${timeFmt.format(new Date(iso))}`

export function weekLabel(start: Date): string {
  const end = addDays(start, 6)
  const f = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })
  return `${f.format(start)} – ${f.format(end)}`
}
