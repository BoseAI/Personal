import { ArrowRightLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { SectionTitle } from '../../../components/ui/Card'
import { IconChip } from '../../../components/ui/IconChip'
import { Segmented } from '../../../components/ui/Segmented'
import { PageLoader } from '../../../components/ui/Spinner'
import { cn } from '../../../lib/cn'
import { useAccount } from '../AccountContext'
import { buildTree, useCategories } from '../api'
import { CategorySheet } from '../components/CategorySheet'
import type { Category, CategoryKind } from '../types'

type Editing = { category?: Category; parentId?: string | null } | null

export function CategoriesPage() {
  const { account, canEdit } = useAccount()
  const { data: categories = [], isLoading } = useCategories(account.id)
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<Editing>(null)

  if (isLoading) return <PageLoader />
  const tree = buildTree(categories, kind, showArchived)
  const archivedCount = categories.filter((c) => c.kind === kind && c.archived_at).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'expense', label: 'Uscite' },
            { value: 'income', label: 'Entrate' },
          ]}
        />
        {canEdit && (
          <Button size="sm" variant="primary" onClick={() => setEditing({ parentId: null })}>
            <Plus className="size-4" /> Categoria
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {tree.map((p) => (
          <div key={p.id} className={cn('overflow-hidden rounded-2xl border border-line bg-surface', p.archived_at && 'opacity-50')}>
            <Row category={p} onClick={canEdit ? () => setEditing({ category: p }) : undefined} />
            {p.children.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
                {p.children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setEditing({ category: c })}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border border-line py-1 pr-3 pl-1.5 text-xs text-muted transition enabled:hover:bg-surface-2',
                      c.archived_at && 'line-through opacity-50',
                    )}
                  >
                    <IconChip icon={c.icon} color={p.color} size="sm" className="!size-5 !rounded-full" />
                    {c.name}
                    {c.transfer_category_id && <ArrowRightLeft className="size-3 text-accent" />}
                  </button>
                ))}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditing({ parentId: p.id })}
                    className="flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1 text-xs text-faint transition hover:text-muted"
                  >
                    <Plus className="size-3" /> Sotto
                  </button>
                )}
              </div>
            )}
            {p.children.length === 0 && canEdit && (
              <div className="border-t border-line px-3 py-2">
                <button type="button" onClick={() => setEditing({ parentId: p.id })} className="flex items-center gap-1 text-xs text-faint hover:text-muted">
                  <Plus className="size-3" /> Aggiungi sottocategoria
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {archivedCount > 0 && (
        <SectionTitle>
          <button type="button" onClick={() => setShowArchived((v) => !v)} className="hover:text-muted">
            {showArchived ? 'Nascondi' : 'Mostra'} archiviate ({archivedCount})
          </button>
        </SectionTitle>
      )}

      <CategorySheet
        open={!!editing}
        onClose={() => setEditing(null)}
        category={editing?.category}
        parentId={editing?.parentId}
        kind={kind}
      />
    </div>
  )
}

function Row({ category, onClick }: { category: Category; onClick?: () => void }) {
  return (
    <button type="button" disabled={!onClick} onClick={onClick} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition enabled:hover:bg-surface-2">
      <IconChip icon={category.icon} color={category.color} />
      <span className="flex-1 text-sm font-medium">{category.name}</span>
      {category.transfer_category_id && <ArrowRightLeft className="size-4 text-accent" aria-label="Trasferimento" />}
    </button>
  )
}
