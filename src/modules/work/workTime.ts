// Calcolo dell'orario di uscita e degli straordinari (minuti dalla mezzanotte).

export type WorkSettings = {
  /** Ore di lavoro da fare (pausa esclusa). */
  hours: number
  /** Pausa in minuti. */
  breakMin: number
  /** Lo straordinario matura solo dopo questi minuti oltre le ore dovute... */
  thresholdMin: number
  /** ...e poi a blocchi di questi minuti. */
  stepMin: number
}

export const DEFAULT_SETTINGS: WorkSettings = { hours: 8, breakMin: 45, thresholdMin: 30, stepMin: 15 }

export function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

export function toHHMM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function formatSpan(min: number): string {
  const m = Math.round(Math.abs(min))
  if (m < 60) return `${m} min`
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`
}

/** Uscita "a pari": entrata + ore dovute + pausa. */
export function baseExit(entry: number, s: WorkSettings): number {
  return entry + s.hours * 60 + s.breakMin
}

/** Minuti di straordinario pagati per un certo tempo oltre l'orario. */
export function paidOvertime(extraMin: number, s: WorkSettings): number {
  if (extraMin < s.thresholdMin) return 0
  return s.thresholdMin + Math.floor((extraMin - s.thresholdMin) / s.stepMin) * s.stepMin
}

/** Orari in cui conviene uscire: la base e poi ogni soglia di straordinario pagato. */
export function exitTiers(entry: number, s: WorkSettings, count = 8): { at: number; paid: number }[] {
  const base = baseExit(entry, s)
  return [{ at: base, paid: 0 }, ...Array.from({ length: count }, (_, k) => ({ at: base + s.thresholdMin + k * s.stepMin, paid: s.thresholdMin + k * s.stepMin }))]
}

export type ExitAdvice =
  | { phase: 'before'; minutesLeft: number; exitAt: number }
  | { phase: 'overtime'; extra: number; paid: number; unpaid: number; nextPaid: number; nextAt: number; wait: number }

/** Situazione a un certo orario: quanto manca, quanto è pagato, quanto conviene aspettare. */
export function advise(entry: number, at: number, s: WorkSettings): ExitAdvice {
  const base = baseExit(entry, s)
  if (at < base) return { phase: 'before', minutesLeft: base - at, exitAt: base }
  const extra = at - base
  const paid = paidOvertime(extra, s)
  const nextPaid = paid === 0 ? s.thresholdMin : paid + s.stepMin
  return { phase: 'overtime', extra, paid, unpaid: extra - paid, nextPaid, nextAt: base + nextPaid, wait: base + nextPaid - at }
}
