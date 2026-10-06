const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

/** Data locale in formato ISO (YYYY-MM-DD), senza conversioni UTC. */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return toISODate(new Date())
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export type Period = { mode: 'month' | 'year'; year: number; month: number } // month 0-11

export function currentPeriod(): Period {
  const d = new Date()
  return { mode: 'month', year: d.getFullYear(), month: d.getMonth() }
}

export function periodRange(p: Period): { from: string; to: string } {
  if (p.mode === 'year') return { from: `${p.year}-01-01`, to: `${p.year}-12-31` }
  return { from: toISODate(new Date(p.year, p.month, 1)), to: toISODate(new Date(p.year, p.month + 1, 0)) }
}

export function shiftPeriod(p: Period, delta: number): Period {
  if (p.mode === 'year') return { ...p, year: p.year + delta }
  const d = new Date(p.year, p.month + delta, 1)
  return { ...p, year: d.getFullYear(), month: d.getMonth() }
}

export function periodLabel(p: Period): string {
  return p.mode === 'year' ? String(p.year) : `${MONTHS[p.month]} ${p.year}`
}

/** I 12 mesi che terminano con il periodo (o l'anno intero in modalità anno). */
export function trendRange(p: Period): { from: string; to: string } {
  if (p.mode === 'year') return periodRange(p)
  return { from: toISODate(new Date(p.year, p.month - 11, 1)), to: toISODate(new Date(p.year, p.month + 1, 0)) }
}

export function monthKeys(from: string, to: string): string[] {
  const start = parseISODate(from)
  const end = parseISODate(to)
  const keys: string[] = []
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    keys.push(toISODate(d))
  }
  return keys
}

export function monthShort(iso: string): string {
  return MONTHS_SHORT[parseISODate(iso).getMonth()]
}

export function monthName(index: number): string {
  return MONTHS[index]
}

const dayFmt = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
const shortFmt = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDayHeader(iso: string): string {
  const t = today()
  if (iso === t) return 'Oggi'
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (iso === toISODate(y)) return 'Ieri'
  const s = dayFmt.format(parseISODate(iso))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function formatShortDate(iso: string): string {
  return shortFmt.format(parseISODate(iso))
}
