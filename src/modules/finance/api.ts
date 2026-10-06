import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { supabase, unwrap } from '../../lib/supabase'
import type {
  Account,
  AccountWithRole,
  Category,
  CategoryKind,
  CategoryNode,
  Member,
  MemberRole,
  Profile,
  Recurring,
  Transaction,
} from './types'

// -----------------------------------------------------------------------------
// Query keys
// -----------------------------------------------------------------------------
export const qk = {
  accounts: ['accounts'] as const,
  profile: ['profile'] as const,
  categories: (accountId: string) => ['categories', accountId] as const,
  allCategories: ['categories'] as const,
  transactions: (accountId: string, from: string, to: string) => ['transactions', accountId, from, to] as const,
  pending: (accountId: string) => ['transactions', accountId, 'pending'] as const,
  monthly: (accountId: string, from: string, to: string) => ['transactions', accountId, 'monthly', from, to] as const,
  byCategory: (accountId: string, from: string, to: string) => ['transactions', accountId, 'byCategory', from, to] as const,
  recurring: (accountId: string) => ['recurring', accountId] as const,
  members: (accountId: string) => ['members', accountId] as const,
}

// -----------------------------------------------------------------------------
// Conti e profilo
// -----------------------------------------------------------------------------
export function useAccounts() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.accounts,
    queryFn: async (): Promise<AccountWithRole[]> => {
      const [accounts, roles, balances] = await Promise.all([
        supabase.from('accounts').select('*').order('created_at').then(unwrap),
        supabase.from('account_members').select('account_id, role').eq('user_id', uid).then(unwrap),
        supabase.from('account_balances').select('account_id, balance').then(unwrap),
      ])
      const roleOf = new Map((roles as { account_id: string; role: MemberRole }[]).map((r) => [r.account_id, r.role]))
      const balanceOf = new Map((balances as { account_id: string; balance: number }[]).map((b) => [b.account_id, Number(b.balance)]))
      return (accounts as Account[])
        .map((a) => ({ ...a, opening_balance: Number(a.opening_balance), role: roleOf.get(a.id) ?? 'viewer', balance: balanceOf.get(a.id) ?? 0 }))
        .sort((a, b) => rankAccount(a, uid) - rankAccount(b, uid))
    },
  })
}

/** Ordine: i miei personali, i condivisi, i personali altrui. */
function rankAccount(a: AccountWithRole, uid: string) {
  if (a.kind === 'personal' && a.created_by === uid) return 0
  if (a.kind === 'shared') return 1
  return 2
}

export function useProfile() {
  const uid = useUserId()
  return useQuery({
    queryKey: qk.profile,
    queryFn: async () => unwrap(await supabase.from('profiles').select('id, display_name').eq('id', uid).single()) as Profile,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  const uid = useUserId()
  return useMutation({
    mutationFn: async (display_name: string) => unwrap(await supabase.from('profiles').update({ display_name }).eq('id', uid)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.profile }),
  })
}

export function useSaveAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Account> & { id?: string }) => {
      const { id, ...values } = input
      if (id) return unwrap(await supabase.from('accounts').update(values).eq('id', id))
      return unwrap(await supabase.from('accounts').insert(values))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('accounts').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries(),
  })
}

// -----------------------------------------------------------------------------
// Membri
// -----------------------------------------------------------------------------
export function useMembers(accountId: string | undefined) {
  return useQuery({
    queryKey: qk.members(accountId ?? ''),
    enabled: !!accountId,
    queryFn: async () =>
      unwrap(
        await supabase
          .from('account_members')
          .select('account_id, user_id, role, profile:profiles(display_name)')
          .eq('account_id', accountId!)
          .order('created_at'),
      ) as unknown as Member[],
  })
}

export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { accountId: string; email: string; role: MemberRole }) =>
      unwrap(await supabase.rpc('add_account_member', { p_account: v.accountId, p_email: v.email, p_role: v.role })),
    onSuccess: () => qc.invalidateQueries(),
  })
}

export function useUpdateMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: { accountId: string; userId: string; role: MemberRole | null }) => {
      const q = supabase.from('account_members')
      if (v.role === null) return unwrap(await q.delete().eq('account_id', v.accountId).eq('user_id', v.userId))
      return unwrap(await q.update({ role: v.role }).eq('account_id', v.accountId).eq('user_id', v.userId))
    },
    onSuccess: () => qc.invalidateQueries(),
  })
}

// -----------------------------------------------------------------------------
// Categorie
// -----------------------------------------------------------------------------
export function useCategories(accountId: string | undefined) {
  return useQuery({
    queryKey: qk.categories(accountId ?? ''),
    enabled: !!accountId,
    queryFn: async () =>
      unwrap(
        await supabase.from('categories').select('*').eq('account_id', accountId!).order('sort_order').order('name'),
      ) as Category[],
  })
}

/** Categorie di entrata (primo livello) degli altri conti modificabili: destinazioni dei trasferimenti. */
export function useTransferTargets(accountId: string | undefined, editableAccountIds: string[]) {
  const others = editableAccountIds.filter((id) => id !== accountId)
  return useQuery({
    queryKey: ['categories', 'transferTargets', accountId, others],
    enabled: !!accountId,
    queryFn: async () => {
      if (others.length === 0) return [] as Category[]
      return unwrap(
        await supabase
          .from('categories')
          .select('*')
          .in('account_id', others)
          .eq('kind', 'income')
          .is('archived_at', null)
          .order('sort_order'),
      ) as Category[]
    },
  })
}

export function buildTree(categories: Category[], kind: CategoryKind, includeArchived = false): CategoryNode[] {
  const visible = categories.filter((c) => c.kind === kind && (includeArchived || !c.archived_at))
  return visible
    .filter((c) => !c.parent_id)
    .map((p) => ({ ...p, children: visible.filter((c) => c.parent_id === p.id) }))
}

export function useSaveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Category> & { id?: string }) => {
      const { id, ...values } = input
      if (id) return unwrap(await supabase.from('categories').update(values).eq('id', id))
      return unwrap(await supabase.from('categories').insert(values))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.allCategories }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('categories').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.allCategories }),
  })
}

// -----------------------------------------------------------------------------
// Movimenti
// -----------------------------------------------------------------------------
const normalizeTx = (t: Transaction): Transaction => ({ ...t, amount: Number(t.amount) })

export function useTransactions(accountId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: qk.transactions(accountId ?? '', from, to),
    enabled: !!accountId,
    queryFn: async () =>
      (
        unwrap(
          await supabase
            .from('transactions')
            .select('*')
            .eq('account_id', accountId!)
            .gte('date', from)
            .lte('date', to)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false }),
        ) as Transaction[]
      ).map(normalizeTx),
  })
}

export function usePendingTransactions(accountId: string | undefined) {
  return useQuery({
    queryKey: qk.pending(accountId ?? ''),
    enabled: !!accountId,
    queryFn: async () =>
      (
        unwrap(
          await supabase.from('transactions').select('*').eq('account_id', accountId!).eq('status', 'pending').order('date'),
        ) as Transaction[]
      ).map(normalizeTx),
  })
}

export function useMonthlyTotals(accountId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: qk.monthly(accountId ?? '', from, to),
    enabled: !!accountId,
    queryFn: async () =>
      (
        unwrap(await supabase.rpc('finance_monthly_totals', { p_account: accountId, p_from: from, p_to: to })) as {
          month: string
          income: number
          expense: number
        }[]
      ).map((r) => ({ month: r.month, income: Number(r.income), expense: Number(r.expense) })),
  })
}

export function useCategoryTotals(accountId: string | undefined, from: string, to: string) {
  return useQuery({
    queryKey: qk.byCategory(accountId ?? '', from, to),
    enabled: !!accountId,
    queryFn: async () =>
      (
        unwrap(await supabase.rpc('finance_category_totals', { p_account: accountId, p_from: from, p_to: to })) as {
          category_id: string
          total: number
          count: number
        }[]
      ).map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) })),
  })
}

const invalidateMoney = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: qk.accounts })
}

export type TransactionInput = Pick<Transaction, 'account_id' | 'category_id' | 'amount' | 'date' | 'description' | 'status'> & {
  id?: string
}

export function useSaveTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: TransactionInput) => {
      if (id) return unwrap(await supabase.from('transactions').update(values).eq('id', id))
      return unwrap(await supabase.from('transactions').insert(values))
    },
    onSuccess: () => invalidateMoney(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('transactions').delete().eq('id', id)),
    onSuccess: () => invalidateMoney(qc),
  })
}

// -----------------------------------------------------------------------------
// Ricorrenti
// -----------------------------------------------------------------------------
export function useRecurring(accountId: string | undefined) {
  return useQuery({
    queryKey: qk.recurring(accountId ?? ''),
    enabled: !!accountId,
    queryFn: async () =>
      (
        unwrap(
          await supabase.from('recurring_transactions').select('*').eq('account_id', accountId!).order('next_date'),
        ) as Recurring[]
      ).map((r) => ({ ...r, amount: Number(r.amount) })),
  })
}

export type RecurringInput = Omit<Recurring, 'id' | 'next_date'> & { id?: string }

export function useSaveRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...values }: RecurringInput) => {
      if (id) unwrap(await supabase.from('recurring_transactions').update(values).eq('id', id))
      else unwrap(await supabase.from('recurring_transactions').insert(values))
      // Registra subito le eventuali occorrenze già scadute.
      unwrap(await supabase.rpc('generate_recurring'))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring'] })
      invalidateMoney(qc)
    },
  })
}

export function useDeleteRecurring() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => unwrap(await supabase.from('recurring_transactions').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring'] }),
  })
}

// -----------------------------------------------------------------------------
// Sincronizzazione: ricorrenti all'avvio + aggiornamenti realtime
// -----------------------------------------------------------------------------
export function useFinanceSync() {
  const qc = useQueryClient()

  useEffect(() => {
    let cancelled = false
    supabase.rpc('generate_recurring').then(({ data, error }) => {
      if (!cancelled && !error && Number(data) > 0) {
        qc.invalidateQueries({ queryKey: ['recurring'] })
        invalidateMoney(qc)
      }
    })

    const channel = supabase
      .channel('finance-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => invalidateMoney(qc))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () =>
        qc.invalidateQueries({ queryKey: qk.allCategories }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recurring_transactions' }, () =>
        qc.invalidateQueries({ queryKey: ['recurring'] }),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [qc])
}
