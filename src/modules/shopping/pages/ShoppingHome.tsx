import { Plus, Search, ShoppingCart, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, SectionTitle } from '../../../components/ui/Card'
import { IconChip } from '../../../components/ui/IconChip'
import { PageLoader } from '../../../components/ui/Spinner'
import { useAllItems, useShoppingLists } from '../api'
import { ItemRow } from '../components/ItemRow'
import { ItemSheet } from '../components/ItemSheet'
import { ListSheet } from '../components/ListSheet'
import type { ShoppingItem } from '../types'
import { useItemActions } from '../useItemActions'

export function ShoppingHome() {
  const { data: lists = [], isLoading } = useShoppingLists()
  const { data: items = [] } = useAllItems()
  const { toggle } = useItemActions()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ShoppingItem | undefined>()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return lists
      .map((l) => ({ list: l, items: items.filter((i) => i.list_id === l.id && i.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length)
  }, [query, items, lists])

  if (isLoading) return <PageLoader />
  const totalToBuy = lists.reduce((s, l) => s + l.toBuy, 0)

  return (
    <div className="space-y-5 pt-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Spesa</h1>
        <p className="text-sm text-muted">{totalToBuy ? `${totalToBuy} elementi da prendere` : 'Tutto preso'}</p>
      </div>

      <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
        <Search className="size-4 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca in tutte le liste"
          className="w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
        />
        {query && (
          <button type="button" aria-label="Cancella ricerca" onClick={() => setQuery('')} className="text-faint">
            <X className="size-4" />
          </button>
        )}
      </label>

      {query.trim() ? (
        results.length ? (
          <div className="space-y-4">
            {results.map(({ list, items }) => (
              <section key={list.id}>
                <SectionTitle>
                  <Link to={`/spesa/${list.id}`} className="hover:text-muted">
                    {list.name}
                  </Link>
                </SectionTitle>
                <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {items.map((i) => (
                    <ItemRow
                      key={i.id}
                      item={i}
                      color={list.color}
                      canEdit={list.role !== 'viewer'}
                      onToggle={() => toggle(i, list)}
                      onOpen={() => setEditing(i)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Search className="size-6" />} title={`Nessun risultato per "${query.trim()}"`} />
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {lists.map((l) => (
            <Link
              key={l.id}
              to={`/spesa/${l.id}`}
              className="group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface p-3.5 transition hover:border-line-strong active:scale-[0.98]"
            >
              <div
                className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full opacity-20 blur-2xl transition group-hover:opacity-30"
                style={{ background: l.color }}
              />
              <div className="flex items-start justify-between">
                <IconChip icon={l.icon} color={l.color} size="lg" />
                {l.shared && <Users className="size-4 text-faint" aria-label="Condivisa" />}
              </div>
              <div>
                <div className="truncate font-medium">{l.name}</div>
                <div className="text-xs text-faint">{l.toBuy ? `${l.toBuy} da prendere` : 'Completata'}</div>
              </div>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-faint transition hover:border-line-strong hover:text-muted"
          >
            <Plus className="size-6" />
            <span className="text-sm">Nuova lista</span>
          </button>
        </div>
      )}

      {!lists.length && !query && (
        <EmptyState icon={<ShoppingCart className="size-6" />} title="Nessuna lista">
          Crea la prima lista, ad esempio Alimentari.
        </EmptyState>
      )}

      <ListSheet open={creating} onClose={() => setCreating(false)} />
      <ItemSheet item={editing} onClose={() => setEditing(undefined)} />
    </div>
  )
}
