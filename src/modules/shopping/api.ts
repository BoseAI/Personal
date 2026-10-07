import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { supabase, unwrap } from '../../lib/supabase'
import type { MemberRole } from '../finance/types'
import type { ShoppingItem, ShoppingList, ShoppingListWithMeta } from './types'

const qk = {
  lists: ['shopping', 'lists'] as const,
  items: ['shopping', 'items'] as const,
  members: (listId: string) => ['shopping', 'members', listId] as const,
  all: ['shopping'] as const,
}

// -----------------------------------------------------------------------------
// Liste
// -----------------------------------------------------------------------------
export function useShoppingLists() {
  const uid = useUserId()
  const { data: items = [] } = useAllItems()
  const query = useQuery({
    queryKey: qk.lists,
    queryFn: async () => {
      const [lists, members] = await Promise.all([
        supabase.from('shopping_lists').select('*').order('sort_order').order('created_at').then(unwrap),
        supabase.from('shopping_list_members').select('list_id, user_id, role').then(unwrap),
      ])
      return { lists: lists as ShoppingList[], members: members as { list_id: string; user_id: string; role: MemberRole }[] }
    },
  })

  const data: ShoppingListWithMeta[] | undefined = query.data?.lists.map((l) => {
    const listMembers = query.data!.members.filter((m) => m.list_id === l.id)
    return {
      ...l,
      role: listMembers.find((m) => m.user_id === uid)?.role ?? 'viewer',
      shared: listMembers.length > 1,
      toBuy: items.filter((i) => i.list_id === l.id && !i.checked).length,
    }
  })
  return { ...query, data }
}

export function useSaveList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: Partial<ShoppingList> & { id?: string }) => {
      if (id) return unwrap(await supabase.from('shopping_lists').update(values).eq('id', id))
      return unwrap(await supabase.from('shopping_lists').insert(values).select('id').single()) as { id: string }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

export function useDeleteList() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('shopping_lists').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

// -----------------------------------------------------------------------------
// Membri
// -----------------------------------------------------------------------------
export function useListMembers(listId: string | undefined) {
  return useQuery({
    queryKey: qk.members(listId ?? ''),
    enabled: !!listId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('shopping_list_members')
          .select('user_id, role, profile:profiles(display_name)')
          .eq('list_id', listId!)
          .order('created_at'),
      ) as unknown as { user_id: string; role: MemberRole; profile: { display_name: string } | null }[],
  })
}

export function useAddListMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { listId: string; email: string; role: MemberRole }) =>
      unwrap(await supabase.rpc('add_list_member', { p_list: v.listId, p_email: v.email, p_role: v.role })),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

export function useUpdateListMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { listId: string; userId: string; role: MemberRole | null }) => {
      const q = supabase.from('shopping_list_members')
      if (v.role === null) return unwrap(await q.delete().eq('list_id', v.listId).eq('user_id', v.userId))
      return unwrap(await q.update({ role: v.role }).eq('list_id', v.listId).eq('user_id', v.userId))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  })
}

// -----------------------------------------------------------------------------
// Elementi (tutte le liste visibili: pochi dati, servono a ricerca e conteggi)
// -----------------------------------------------------------------------------
export function useAllItems() {
  return useQuery({
    queryKey: qk.items,
    queryFn: async () =>
      unwrap(await supabase.from('shopping_items').select('*').order('created_at', { ascending: false })) as ShoppingItem[],
  })
}

/** Aggiornamento ottimistico: la lista risponde subito al tocco. */
function useItemMutation<V>(fn: (v: V) => Promise<unknown>, optimistic: (items: ShoppingItem[], v: V) => ShoppingItem[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: qk.items })
      const prev = qc.getQueryData<ShoppingItem[]>(qk.items)
      if (prev) qc.setQueryData(qk.items, optimistic(prev, v))
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.items, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.items }),
  })
}

export type NewItem = { list_id: string; name: string; quantity: number }

export function useAddItem() {
  const uid = useUserId()
  return useItemMutation(
    async (v: NewItem & { id: string }) => unwrap(await supabase.from('shopping_items').insert(v)),
    (items, v) => [
      { ...v, checked: false, checked_at: null, checked_by: null, created_by: uid, created_at: new Date().toISOString() },
      ...items,
    ],
  )
}

export function useUpdateItem() {
  return useItemMutation(
    async ({ id, ...values }: Partial<ShoppingItem> & { id: string }) => unwrap(await supabase.from('shopping_items').update(values).eq('id', id)),
    (items, v) => items.map((i) => (i.id === v.id ? { ...i, ...v, checked_at: v.checked ? new Date().toISOString() : i.checked_at } : i)),
  )
}

/** Spunta (o toglie la spunta a) più elementi in una sola richiesta. */
export function useSetChecked() {
  return useItemMutation(
    async ({ ids, checked }: { ids: string[]; checked: boolean }) =>
      unwrap(await supabase.from('shopping_items').update({ checked }).in('id', ids)),
    (items, v) => items.map((i) => (v.ids.includes(i.id) ? { ...i, checked: v.checked, checked_at: v.checked ? new Date().toISOString() : null } : i)),
  )
}

export function useDeleteItems() {
  return useItemMutation(
    async (ids: string[]) => unwrap(await supabase.from('shopping_items').delete().in('id', ids)),
    (items, ids) => items.filter((i) => !ids.includes(i.id)),
  )
}

/**
 * Precarica una serie di prodotti già spuntati (pronti da riattivare),
 * saltando quelli già presenti nella lista. Restituisce quanti ne ha aggiunti.
 */
export function usePreloadItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, names, existing }: { listId: string; names: string[]; existing: ShoppingItem[] }) => {
      const have = new Set(existing.filter((i) => i.list_id === listId).map((i) => i.name.trim().toLowerCase()))
      const rows = names.filter((n) => !have.has(n.toLowerCase())).map((name) => ({ list_id: listId, name, quantity: 1, checked: true }))
      if (rows.length) unwrap(await supabase.from('shopping_items').insert(rows))
      return rows.length
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.items }),
  })
}

// -----------------------------------------------------------------------------
// Realtime: modifiche dagli altri membri
// -----------------------------------------------------------------------------
export function useShoppingSync() {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('shopping-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_items' }, () =>
        qc.invalidateQueries({ queryKey: qk.items }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_lists' }, () =>
        qc.invalidateQueries({ queryKey: qk.lists }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_members' }, () =>
        qc.invalidateQueries({ queryKey: qk.all }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}
