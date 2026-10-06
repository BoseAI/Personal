import { ChevronLeft, Eye, Plus, Search, Settings2, Users, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Button, IconButton } from '../../../components/ui/Button'
import { EmptyState, SectionTitle } from '../../../components/ui/Card'
import { IconChip } from '../../../components/ui/IconChip'
import { PageLoader } from '../../../components/ui/Spinner'
import { useToast } from '../../../components/ui/Toast'
import { useAllItems, useShoppingLists } from '../api'
import { ItemRow } from '../components/ItemRow'
import { ItemSheet } from '../components/ItemSheet'
import { ListSheet } from '../components/ListSheet'
import { QuantityStepper } from '../components/QuantityStepper'
import type { ShoppingItem } from '../types'
import { useItemActions } from '../useItemActions'

export function ListPage() {
  const { listId } = useParams()
  const { data: lists, isLoading } = useShoppingLists()
  const { data: allItems = [] } = useAllItems()
  const { toggle, addOrMerge, clearChecked } = useItemActions()
  const toast = useToast()

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [settings, setSettings] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | undefined>()

  const list = lists?.find((l) => l.id === listId)
  const items = useMemo(() => allItems.filter((i) => i.list_id === listId), [allItems, listId])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items
  }, [items, query])

  if (isLoading) return <PageLoader />
  if (!list) return <Navigate to="/spesa" replace />

  const canEdit = list.role !== 'viewer'
  const separated = list.checked_behavior === 'move_bottom'
  const open = separated ? visible.filter((i) => !i.checked) : visible
  const done = separated ? visible.filter((i) => i.checked) : []
  const checkedCount = items.filter((i) => i.checked).length

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !list) return
    const result = addOrMerge(list.id, name, quantity, items)
    if (result === 'merged') toast({ message: `Quantità di ${name.trim()} aumentata` }, 2500)
    if (result === 'restored') toast({ message: `${name.trim()} rimesso in lista` }, 2500)
    setName('')
    setQuantity(1)
  }

  const row = (i: ShoppingItem) => (
    <ItemRow key={i.id} item={i} color={list.color} canEdit={canEdit} onToggle={() => toggle(i, list)} onOpen={() => setEditing(i)} />
  )

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Link to="/spesa" aria-label="Indietro" className="-ml-2 flex size-9 items-center justify-center rounded-xl text-muted hover:bg-surface-2">
          <ChevronLeft className="size-6" />
        </Link>
        <IconChip icon={list.icon} color={list.color} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold">{list.name}</h1>
          <p className="flex items-center gap-1 text-xs text-faint">
            {list.shared && <Users className="size-3" />}
            {list.toBuy ? `${list.toBuy} da prendere` : 'Tutto preso'}
            {!canEdit && (
              <>
                {' · '}
                <Eye className="size-3" /> sola lettura
              </>
            )}
          </p>
        </div>
        <IconButton label="Cerca" onClick={() => (setSearching((v) => !v), setQuery(''))}>
          {searching ? <X className="size-5" /> : <Search className="size-5" />}
        </IconButton>
        <IconButton label="Impostazioni lista" onClick={() => setSettings(true)}>
          <Settings2 className="size-5" />
        </IconButton>
      </div>

      {searching && (
        <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
          <Search className="size-4 text-faint" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cerca in ${list.name}`}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
        </label>
      )}

      {canEdit && (
        <form onSubmit={submit} className="flex items-center gap-2 rounded-2xl border border-line bg-surface p-1.5 pl-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aggiungi elemento…"
            enterKeyHint="done"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
          />
          <QuantityStepper value={quantity} onChange={setQuantity} size="sm" />
          <button
            type="submit"
            aria-label="Aggiungi"
            disabled={!name.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink transition active:scale-95 disabled:opacity-30"
          >
            <Plus className="size-5" strokeWidth={2.5} />
          </button>
        </form>
      )}

      {open.length > 0 && <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{open.map(row)}</div>}

      {!open.length && !done.length && (
        <EmptyState title={query ? `Nessun risultato per "${query.trim()}"` : 'Lista vuota'}>
          {!query && canEdit && 'Scrivi qui sopra cosa serve.'}
        </EmptyState>
      )}

      {open.length === 0 && done.length > 0 && !query && <p className="px-1 text-sm text-muted">Hai preso tutto ✓</p>}

      {done.length > 0 && (
        <section>
          <SectionTitle
            action={
              canEdit && (
                <Button size="sm" variant="ghost" onClick={() => clearChecked(items)}>
                  Svuota
                </Button>
              )
            }
          >
            Presi · {done.length}
          </SectionTitle>
          <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface opacity-80">{done.map(row)}</div>
        </section>
      )}

      {!separated && checkedCount > 0 && canEdit && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => clearChecked(items)}>
          Rimuovi i {checkedCount} spuntati
        </Button>
      )}

      <ListSheet open={settings} list={list} onClose={() => setSettings(false)} />
      <ItemSheet item={editing} onClose={() => setEditing(undefined)} />
    </div>
  )
}
