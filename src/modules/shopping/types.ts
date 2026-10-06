import type { MemberRole } from '../finance/types'

export type CheckedBehavior = 'move_bottom' | 'keep' | 'delete'

export type ShoppingList = {
  id: string
  name: string
  icon: string
  color: string
  checked_behavior: CheckedBehavior
  sort_order: number
  created_by: string | null
  created_at: string
}

export type ShoppingListWithMeta = ShoppingList & { role: MemberRole; shared: boolean; toBuy: number }

export type ShoppingItem = {
  id: string
  list_id: string
  name: string
  quantity: number
  checked: boolean
  checked_at: string | null
  checked_by: string | null
  created_by: string | null
  created_at: string
}

export const BEHAVIOR_LABELS: Record<CheckedBehavior, { label: string; description: string }> = {
  move_bottom: { label: 'In fondo', description: 'Gli elementi spuntati scendono in fondo alla lista.' },
  keep: { label: 'Restano', description: 'Gli elementi spuntati restano al loro posto, barrati.' },
  delete: { label: 'Eliminati', description: 'Gli elementi spuntati vengono eliminati (puoi annullare).' },
}
