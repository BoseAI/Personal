const eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })
const eurCompact = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function formatEUR(value: number): string {
  return eur.format(value)
}

export function formatEURCompact(value: number): string {
  return Math.abs(value) < 1000 ? eur.format(Math.round(value)).replace(/,00/, '') : eurCompact.format(value)
}

export function formatSigned(value: number, kind: 'income' | 'expense'): string {
  return (kind === 'income' ? '+' : '−') + eur.format(Math.abs(value)).replace('-', '')
}

/** Accetta "12,50", "12.50", "1.234,56" -> 1234.56. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/\s|€/g, '')
  if (!s) return null
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100) / 100
}

export function amountToInput(value: number): string {
  return value.toFixed(2).replace('.', ',')
}
