import type { FoodItem } from './types'

// Open Food Facts: database libero dei prodotti confezionati (API pubblica con CORS).
const BASE = 'https://world.openfoodfacts.org'
const FIELDS = 'code,product_name,product_name_it,brands,nutriments,serving_quantity,serving_size'

type OffProduct = {
  code?: string
  product_name?: string
  product_name_it?: string
  brands?: string
  serving_quantity?: number | string
  serving_size?: string
  nutriments?: Record<string, number | string | undefined>
}

function toFood(p: OffProduct): FoodItem | null {
  const n = p.nutriments ?? {}
  const num = (k: string) => {
    const v = Number(n[k])
    return Number.isFinite(v) ? v : null
  }
  const kcal = num('energy-kcal_100g') ?? (num('energy_100g') !== null ? num('energy_100g')! / 4.184 : null)
  const name = (p.product_name_it || p.product_name || '').trim()
  if (kcal === null || !name || !p.code) return null
  const serving = Number(p.serving_quantity)
  return {
    key: `off:${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || null,
    barcode: p.code,
    kcal: Math.round(kcal * 10) / 10,
    protein: num('proteins_100g') ?? 0,
    carbs: num('carbohydrates_100g') ?? 0,
    fat: num('fat_100g') ?? 0,
    fiber: num('fiber_100g'),
    portionG: Number.isFinite(serving) && serving > 0 ? serving : null,
    portionName: Number.isFinite(serving) && serving > 0 ? 'porzione' : null,
    source: 'off',
  }
}

export async function offByBarcode(code: string, signal?: AbortSignal): Promise<FoodItem | null> {
  const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, { signal })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Open Food Facts non risponde, riprova tra poco.')
  const data = (await res.json()) as { status?: number; product?: OffProduct }
  return data.status === 1 && data.product ? toFood({ ...data.product, code }) : null
}

export async function offSearch(query: string, signal?: AbortSignal): Promise<FoodItem[]> {
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=25&lc=it&cc=it&fields=${FIELDS}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error('Open Food Facts non risponde, riprova tra poco.')
  const data = (await res.json()) as { products?: OffProduct[] }
  return (data.products ?? []).map(toFood).filter((f): f is FoodItem => f !== null)
}
