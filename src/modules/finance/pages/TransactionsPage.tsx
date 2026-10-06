import { Receipt, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EmptyState } from '../../../components/ui/Card'
import { Select } from '../../../components/ui/Field'
import { PageLoader } from '../../../components/ui/Spinner'
import { currentPeriod, periodRange, type Period } from '../../../lib/dates'
import { formatEUR } from '../../../lib/format'
import { useAccount } from '../AccountContext'
import { buildTree, useCategories, useMembers, useTransactions } from '../api'
import { categoryPath } from '../components/CategoryPicker'
import { PeriodSwitcher } from '../components/PeriodSwitcher'
import { TransactionList } from '../components/TransactionList'
import { TransactionSheet } from '../components/TransactionSheet'
import type { Profile, Transaction } from '../types'

export function TransactionsPage() {
  const { account } = useAccount()
  const [period, setPeriod] = useState<Period>(currentPeriod)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editing, setEditing] = useState<Transaction | undefined>()

  const range = periodRange(period)
  const { data: categories = [] } = useCategories(account.id)
  const { data: transactions = [], isLoading } = useTransactions(account.id, range.from, range.to)
  const { data: members = [] } = useMembers(account.id)
  const profiles: Profile[] = members.map((m) => ({ id: m.user_id, display_name: m.profile?.display_name ?? '' }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions.filter((t) => {
      if (categoryFilter) {
        const c = categories.find((x) => x.id === t.category_id)
        if (t.category_id !== categoryFilter && c?.parent_id !== categoryFilter) return false
      }
      if (!q) return true
      const c = categories.find((x) => x.id === t.category_id)
      return (t.description ?? '').toLowerCase().includes(q) || categoryPath(c, categories).toLowerCase().includes(q)
    })
  }, [transactions, categories, query, categoryFilter])

  const kindOf = (t: Transaction) => categories.find((c) => c.id === t.category_id)?.kind
  const confirmed = filtered.filter((t) => t.status === 'confirmed')
  const income = confirmed.filter((t) => kindOf(t) === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = confirmed.filter((t) => kindOf(t) === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="space-y-4">
      <PeriodSwitcher value={period} onChange={setPeriod} />

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
          <Search className="size-4 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca"
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </label>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 w-40 text-sm">
          <option value="">Tutte</option>
          {(['expense', 'income'] as const).map((k) => (
            <optgroup key={k} label={k === 'expense' ? 'Uscite' : 'Entrate'}>
              {buildTree(categories, k, true).flatMap((p) => [
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>,
                ...p.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {'  › '}
                    {c.name}
                  </option>
                )),
              ])}
            </optgroup>
          ))}
        </Select>
      </div>

      <div className="num flex justify-between px-1 text-xs text-faint">
        <span>{filtered.length} movimenti</span>
        <span>
          <span className="text-positive">+{formatEUR(income)}</span> · <span>−{formatEUR(expense)}</span>
        </span>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : filtered.length ? (
        <TransactionList transactions={filtered} categories={categories} profiles={profiles} onSelect={setEditing} />
      ) : (
        <EmptyState icon={<Receipt className="size-6" />} title="Nessun movimento">
          Tocca + per aggiungerne uno.
        </EmptyState>
      )}

      <TransactionSheet open={!!editing} transaction={editing} onClose={() => setEditing(undefined)} />
    </div>
  )
}
