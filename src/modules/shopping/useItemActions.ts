import { useToast } from '../../components/ui/Toast'
import { useAddItem, useDeleteItems, useUpdateItem } from './api'
import type { ShoppingItem, ShoppingList } from './types'

/** Spunta / aggiunta rispettando il comportamento della lista. */
export function useItemActions() {
  const toast = useToast()
  const add = useAddItem()
  const update = useUpdateItem()
  const del = useDeleteItems()

  function toggle(item: ShoppingItem, list: Pick<ShoppingList, 'checked_behavior'>) {
    if (!item.checked && list.checked_behavior === 'delete') {
      del.mutate([item.id])
      toast({
        message: `${item.name} eliminato`,
        action: { label: 'Annulla', onClick: () => add.mutate({ id: item.id, list_id: item.list_id, name: item.name, quantity: item.quantity }) },
      })
      return
    }
    update.mutate({ id: item.id, checked: !item.checked })
  }

  /** Se l'elemento esiste già nella lista lo riattiva o ne aumenta la quantità. */
  function addOrMerge(listId: string, name: string, quantity: number, existing: ShoppingItem[]) {
    const same = existing.find((i) => i.list_id === listId && i.name.trim().toLowerCase() === name.trim().toLowerCase())
    if (same && same.checked) {
      update.mutate({ id: same.id, checked: false, quantity })
      return 'restored' as const
    }
    if (same) {
      update.mutate({ id: same.id, quantity: same.quantity + quantity })
      return 'merged' as const
    }
    add.mutate({ id: crypto.randomUUID(), list_id: listId, name: name.trim(), quantity })
    return 'added' as const
  }

  function clearChecked(items: ShoppingItem[]) {
    const ids = items.filter((i) => i.checked).map((i) => i.id)
    if (ids.length) del.mutate(ids)
  }

  return { toggle, addOrMerge, clearChecked }
}
