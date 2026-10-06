import { ChevronLeft, Globe, Plus, ScanBarcode, Search, Trash2 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState, type ChangeEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { Sheet } from '../../../components/ui/Sheet'
import { PageLoader } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { errorMessage } from '../../../lib/supabase'
import { catalogItems, useDeleteLog, useRecentFoods, useSaveFood, useSaveLog, useStoredFoods } from '../api'
import { offByBarcode, offSearch } from '../off'
import { macrosFor } from '../targets'
import { MACRO_COLORS, MEALS, type FoodItem, type FoodLog, type Meal } from '../types'

const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

type Props = { open: boolean; onClose: () => void; date: string; meal: Meal; log?: FoodLog }

export function FoodSheet(props: Props) {
  return props.open ? <FoodFlow {...props} /> : null
}

/** Valori per 100 g ricavati da una voce di diario (per modificarla o riusarla). */
function logToItem(l: Pick<FoodLog, 'food_key' | 'food_name' | 'grams' | 'kcal' | 'protein' | 'carbs' | 'fat'>): FoodItem {
  const k = 100 / l.grams
  return {
    key: l.food_key,
    name: l.food_name,
    kcal: l.kcal * k,
    protein: l.protein * k,
    carbs: l.carbs * k,
    fat: l.fat * k,
    portionG: l.grams,
    portionName: 'ultima volta',
    source: l.food_key.startsWith('cat:') ? 'catalog' : l.food_key.startsWith('off:') ? 'off' : 'custom',
  }
}

function FoodFlow({ onClose, date, meal, log }: Props) {
  const [step, setStep] = useState<'search' | 'portion' | 'custom'>(log ? 'portion' : 'search')
  const [food, setFood] = useState<FoodItem | null>(log ? logToItem(log) : null)
  const pick = (f: FoodItem) => (setFood(f), setStep('portion'))

  return (
    <Sheet open onClose={onClose} title={log ? 'Modifica' : step === 'custom' ? 'Nuovo cibo' : 'Aggiungi cibo'}>
      {step === 'search' && <SearchStep onPick={pick} onCustom={() => setStep('custom')} />}
      {step === 'custom' && <CustomFoodStep onBack={() => setStep('search')} onCreated={pick} />}
      {step === 'portion' && food && (
        <PortionStep food={food} date={date} meal={log?.meal ?? meal} log={log} onBack={log ? undefined : () => setStep('search')} onDone={onClose} />
      )}
    </Sheet>
  )
}

function SearchStep({ onPick, onCustom }: { onPick: (f: FoodItem) => void; onCustom: () => void }) {
  const { data: recent = [] } = useRecentFoods()
  const { data: stored = [] } = useStoredFoods()
  const [tab, setTab] = useState<'recent' | 'foods' | 'online'>(recent.length ? 'recent' : 'foods')
  const [query, setQuery] = useState('')
  const [online, setOnline] = useState<FoodItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const q = query.trim().toLowerCase()
  const local = useMemo(() => {
    const all = [...stored, ...catalogItems]
    return q ? all.filter((f) => f.name.toLowerCase().includes(q) || (f.brand ?? '').toLowerCase().includes(q)) : all
  }, [stored, q])
  const recents = useMemo(() => recent.map(logToItem).filter((f) => !q || f.name.toLowerCase().includes(q)), [recent, q])

  async function searchOnline() {
    if (!q) return
    setTab('online')
    setLoading(true)
    setError(null)
    try {
      setOnline(await offSearch(query.trim()))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function onBarcode(code: string) {
    setScanning(false)
    const mine = stored.find((f) => f.barcode === code)
    if (mine) return onPick(mine)
    setLoading(true)
    setError(null)
    try {
      const f = await offByBarcode(code)
      if (f) onPick(f)
      else setError(`Prodotto ${code} non trovato su Open Food Facts: puoi crearlo a mano.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const list = tab === 'recent' ? recents : tab === 'foods' ? local : (online ?? [])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <form
          className="flex h-11 flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3"
          onSubmit={(e) => (e.preventDefault(), tab === 'online' ? searchOnline() : undefined)}
        >
          <Search className="size-4 text-faint" />
          <input
            value={query}
            onChange={(e) => (setQuery(e.target.value), tab === 'recent' && e.target.value && setTab('foods'))}
            placeholder="Cerca un cibo"
            enterKeyHint="search"
            className="w-full bg-transparent outline-none placeholder:text-faint"
          />
        </form>
        <button type="button" aria-label="Scansiona codice a barre" onClick={() => setScanning(true)} className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-ink">
          <ScanBarcode className="size-5" />
        </button>
      </div>

      <Segmented
        size="sm"
        className="w-full"
        value={tab}
        onChange={(t) => (setTab(t), t === 'online' && q && online === null ? searchOnline() : undefined)}
        options={[
          { value: 'recent', label: 'Recenti' },
          { value: 'foods', label: 'Cibi' },
          { value: 'online', label: 'Online' },
        ]}
      />

      {tab === 'online' && online === null && !loading && (
        <Button className="w-full" disabled={!q} onClick={searchOnline}>
          <Globe className="size-4" /> Cerca "{query.trim() || '…'}" su Open Food Facts
        </Button>
      )}
      <ErrorText error={error} />
      {loading && <PageLoader />}

      {!loading && (
        <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
          {list.slice(0, 80).map((f) => (
            <button key={f.key + f.name} type="button" onClick={() => onPick(f)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{f.name}</span>
                <span className="block truncate text-[11px] text-faint">
                  {[f.brand, f.source === 'off' ? 'Open Food Facts' : f.source === 'custom' ? 'Mio' : null].filter(Boolean).join(' · ') ||
                    `P ${Math.round(f.protein)} · C ${Math.round(f.carbs)} · G ${Math.round(f.fat)} per 100 g`}
                </span>
              </span>
              <span className="num shrink-0 text-xs text-muted">{Math.round(f.kcal)} kcal/100 g</span>
            </button>
          ))}
          {!list.length && (
            <p className="px-3 py-6 text-center text-sm text-faint">
              {tab === 'online' ? (online ? 'Nessun prodotto trovato' : '') : q ? 'Nessun cibo: prova la ricerca online' : 'Nessun cibo recente'}
            </p>
          )}
        </div>
      )}

      <button type="button" onClick={onCustom} className="flex w-full items-center justify-center gap-1 py-2 text-sm text-muted hover:text-fg">
        <Plus className="size-4" /> Crea un cibo
      </button>

      {scanning && (
        <Suspense fallback={null}>
          <BarcodeScanner onResult={onBarcode} onClose={() => setScanning(false)} />
        </Suspense>
      )}
    </div>
  )
}

function PortionStep({ food, date, meal: initialMeal, log, onBack, onDone }: { food: FoodItem; date: string; meal: Meal; log?: FoodLog; onBack?: () => void; onDone: () => void }) {
  const saveLog = useSaveLog()
  const del = useDeleteLog()
  const saveFood = useSaveFood()
  const [grams, setGrams] = useState(String(log?.grams ?? food.portionG ?? 100))
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [error, setError] = useState<string | null>(null)

  const g = Number(grams.replace(',', '.')) || 0
  const m = macrosFor(food, g)
  const quick = [
    ...(food.portionG && food.portionName ? [{ label: `1 ${food.portionName}`, g: food.portionG }, { label: `2 ${food.portionName}`, g: food.portionG * 2 }] : []),
    { label: '50 g', g: 50 },
    { label: '100 g', g: 100 },
    { label: '150 g', g: 150 },
    { label: '200 g', g: 200 },
  ]

  async function submit() {
    if (g <= 0) return setError('Inserisci la quantità.')
    try {
      let key = food.key
      // I prodotti online si salvano tra i "miei" cibi per ritrovarli subito (anche offline).
      if (!log && food.source === 'off') key = (await saveFood.mutateAsync(food)).key
      await saveLog.mutateAsync({ id: log?.id, date, meal, food_key: key, food_name: food.name, grams: g, ...m })
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <div className="flex items-start gap-2">
        {onBack && (
          <button type="button" aria-label="Indietro" onClick={onBack} className="-ml-1 flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface-2">
            <ChevronLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">{food.name}</p>
          <p className="num text-xs text-faint">
            {food.brand ? `${food.brand} · ` : ''}per 100 g: {Math.round(food.kcal)} kcal · P {food.protein.toFixed(1)} · C {food.carbs.toFixed(1)} · G {food.fat.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <input
          inputMode="decimal"
          value={grams}
          onChange={(e) => setGrams(e.target.value.replace(/[^\d,.]/g, ''))}
          className="num w-32 bg-transparent text-center text-5xl font-semibold outline-none"
          aria-label="Grammi"
        />
        <span className="num text-2xl text-faint">g</span>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {quick.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => setGrams(String(q.g))}
            className={cn('rounded-full border px-3 py-1.5 text-xs transition', g === q.g ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted hover:bg-surface-2')}
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-2xl border border-line bg-surface-2 p-3 text-center">
        <Value label="kcal" value={m.kcal} />
        <Value label="Proteine" value={m.protein} color={MACRO_COLORS.protein} unit="g" />
        <Value label="Carboidrati" value={m.carbs} color={MACRO_COLORS.carbs} unit="g" />
        <Value label="Grassi" value={m.fat} color={MACRO_COLORS.fat} unit="g" />
      </div>

      <Segmented size="sm" className="w-full" value={meal} onChange={setMeal} options={MEALS.map((x) => ({ value: x.key, label: x.label }))} />
      <ErrorText error={error} />
      <div className="flex gap-2">
        {log && (
          <Button variant="danger" aria-label="Elimina" loading={del.isPending} onClick={() => del.mutateAsync(log.id).then(onDone)}>
            <Trash2 className="size-4" />
          </Button>
        )}
        <Button variant="primary" className="flex-1" loading={saveLog.isPending || saveFood.isPending} onClick={submit}>
          {log ? 'Salva' : `Aggiungi a ${MEALS.find((x) => x.key === meal)!.label}`}
        </Button>
      </div>
    </div>
  )
}

function Value({ label, value, color, unit }: { label: string; value: number; color?: string; unit?: string }) {
  return (
    <div>
      <div className="num text-base font-semibold" style={color ? { color } : undefined}>
        {Math.round(value)}
        {unit && <span className="text-xs">{unit}</span>}
      </div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  )
}

function CustomFoodStep({ onBack, onCreated }: { onBack: () => void; onCreated: (f: FoodItem) => void }) {
  const save = useSaveFood()
  const [v, setV] = useState({ name: '', brand: '', kcal: '', protein: '', carbs: '', fat: '', portion: '', portionName: '' })
  const [error, setError] = useState<string | null>(null)
  const num = (s: string) => Number(s.replace(',', '.')) || 0
  const set = (k: keyof typeof v) => (e: ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value })

  async function submit() {
    if (!v.name.trim()) return setError('Inserisci il nome.')
    if (!v.kcal) return setError('Inserisci le calorie per 100 g.')
    try {
      const f = await save.mutateAsync({
        key: '',
        name: v.name.trim(),
        brand: v.brand.trim() || null,
        kcal: num(v.kcal),
        protein: num(v.protein),
        carbs: num(v.carbs),
        fat: num(v.fat),
        portionG: v.portion ? num(v.portion) : null,
        portionName: v.portion ? v.portionName.trim() || 'porzione' : null,
        source: 'custom',
      })
      onCreated(f)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4 pb-2">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted">
        <ChevronLeft className="size-4" /> Indietro
      </button>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome" className="col-span-2">
          <Input value={v.name} onChange={set('name')} placeholder="Es. Torta della nonna" />
        </Field>
        <Field label="Marca">
          <Input value={v.brand} onChange={set('brand')} placeholder="Opzionale" />
        </Field>
        <Field label="Kcal per 100 g">
          <Input inputMode="decimal" value={v.kcal} onChange={set('kcal')} />
        </Field>
        <Field label="Proteine g">
          <Input inputMode="decimal" value={v.protein} onChange={set('protein')} />
        </Field>
        <Field label="Carboidrati g">
          <Input inputMode="decimal" value={v.carbs} onChange={set('carbs')} />
        </Field>
        <Field label="Grassi g">
          <Input inputMode="decimal" value={v.fat} onChange={set('fat')} />
        </Field>
        <Field label="Porzione g">
          <Input inputMode="decimal" value={v.portion} onChange={set('portion')} placeholder="Opzionale" />
        </Field>
        <Field label="Nome porzione" className="col-span-2">
          <Input value={v.portionName} onChange={set('portionName')} placeholder="Es. fetta" />
        </Field>
      </div>
      <ErrorText error={error} />
      <Button variant="primary" className="w-full" loading={save.isPending} onClick={submit}>
        Crea e usa
      </Button>
    </div>
  )
}
