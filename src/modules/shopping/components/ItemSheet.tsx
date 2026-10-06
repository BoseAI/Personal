import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input } from '../../../components/ui/Field'
import { Sheet } from '../../../components/ui/Sheet'
import { errorMessage } from '../../../lib/supabase'
import { useDeleteItems, useUpdateItem } from '../api'
import type { ShoppingItem } from '../types'
import { QuantityStepper } from './QuantityStepper'

type Props = { item?: ShoppingItem; onClose: () => void }

export function ItemSheet(props: Props) {
  return props.item ? <ItemForm {...props} item={props.item} /> : null
}

function ItemForm({ item, onClose }: Props & { item: ShoppingItem }) {
  const update = useUpdateItem()
  const del = useDeleteItems()
  const [name, setName] = useState(item.name)
  const [quantity, setQuantity] = useState(item.quantity)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Inserisci un nome.')
    try {
      await update.mutateAsync({ id: item.id, name: name.trim(), quantity })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    try {
      await del.mutateAsync([item.id])
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Modifica elemento"
      footer={
        <div className="flex gap-2">
          <Button variant="danger" onClick={remove} loading={del.isPending} aria-label="Elimina">
            <Trash2 className="size-4" />
          </Button>
          <Button type="submit" form="item-form" variant="primary" className="flex-1" loading={update.isPending}>
            Salva
          </Button>
        </div>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-5">
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Quantità">
          <div>
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </div>
        </Field>
        <ErrorText error={error} />
      </form>
    </Sheet>
  )
}
