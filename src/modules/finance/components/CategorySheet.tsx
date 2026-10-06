import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input, Select } from '../../../components/ui/Field'
import { IconChip } from '../../../components/ui/IconChip'
import { ColorPicker, IconPicker } from '../../../components/ui/IconPicker'
import { Sheet } from '../../../components/ui/Sheet'
import { SWATCHES } from '../../../lib/colors'
import { errorMessage } from '../../../lib/supabase'
import { useAccount } from '../AccountContext'
import { useCategories, useDeleteCategory, useSaveCategory, useTransferTargets } from '../api'
import type { Category, CategoryKind } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  category?: Category
  kind: CategoryKind
  /** Per una nuova sottocategoria: il padre preselezionato. */
  parentId?: string | null
}

export function CategorySheet(props: Props) {
  return props.open ? <CategoryForm {...props} /> : null
}

function CategoryForm({ open, onClose, category, kind, parentId }: Props) {
  const { account, accounts } = useAccount()
  const { data: categories = [] } = useCategories(account.id)
  const editable = accounts.filter((a) => a.role !== 'viewer').map((a) => a.id)
  const { data: targets = [] } = useTransferTargets(account.id, editable)
  const save = useSaveCategory()
  const del = useDeleteCategory()

  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? 'circle')
  const [color, setColor] = useState(category?.color ?? SWATCHES[0])
  const [parent, setParent] = useState(category?.parent_id ?? parentId ?? '')
  const [transfer, setTransfer] = useState(category?.transfer_category_id ?? '')
  const [error, setError] = useState<string | null>(null)

  const hasChildren = !!category && categories.some((c) => c.parent_id === category.id)
  const parents = categories.filter((c) => c.kind === kind && !c.parent_id && !c.archived_at && c.id !== category?.id)
  const parentCat = categories.find((c) => c.id === parent)
  const effectiveColor = parentCat?.color ?? color

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Inserisci un nome.')
    setError(null)
    try {
      await save.mutateAsync({
        id: category?.id,
        account_id: account.id,
        kind,
        name: name.trim(),
        icon,
        color: effectiveColor,
        parent_id: parent || null,
        transfer_category_id: kind === 'expense' ? transfer || null : null,
        ...(category ? {} : { sort_order: 50 }),
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function toggleArchive() {
    if (!category) return
    try {
      await save.mutateAsync({ id: category.id, archived_at: category.archived_at ? null : new Date().toISOString() })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    if (!category || !confirm(`Eliminare "${category.name}"?`)) return
    try {
      await del.mutateAsync(category.id)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? 'Modifica categoria' : parentId ? 'Nuova sottocategoria' : 'Nuova categoria'}
      footer={
        <div className="flex gap-2">
          {category && (
            <>
              <Button variant="danger" onClick={remove} loading={del.isPending} aria-label="Elimina">
                <Trash2 className="size-4" />
              </Button>
              <Button onClick={toggleArchive} aria-label={category.archived_at ? 'Ripristina' : 'Archivia'}>
                {category.archived_at ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
              </Button>
            </>
          )}
          <Button type="submit" form="cat-form" variant="primary" className="flex-1" loading={save.isPending}>
            Salva
          </Button>
        </div>
      }
    >
      <form id="cat-form" onSubmit={submit} className="space-y-5">
        <div className="flex items-center gap-3">
          <IconChip icon={icon} color={effectiveColor} size="lg" />
          <Input autoFocus={!category} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome categoria" className="flex-1" />
        </div>

        {!hasChildren && (
          <Field label="Categoria padre">
            <Select value={parent} onChange={(e) => setParent(e.target.value)}>
              <option value="">Nessuna (categoria principale)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Icona">
          <IconPicker value={icon} color={effectiveColor} onChange={setIcon} />
        </Field>

        {!parent && (
          <Field label="Colore">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
        )}

        {kind === 'expense' && (
          <Field label="Trasferisci a" hint="Ogni uscita in questa categoria crea un'entrata nel conto scelto.">
            <Select value={transfer} onChange={(e) => setTransfer(e.target.value)}>
              <option value="">Nessun trasferimento</option>
              {accounts
                .filter((a) => a.id !== account.id && a.role !== 'viewer')
                .map((a) => (
                  <optgroup key={a.id} label={a.name}>
                    {targets
                      .filter((t) => t.account_id === a.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
            </Select>
          </Field>
        )}
        {category?.archived_at && <p className="text-xs text-faint">Categoria archiviata: non compare nei nuovi movimenti, ma resta nei report.</p>}
        <ErrorText error={error} />
      </form>
    </Sheet>
  )
}
