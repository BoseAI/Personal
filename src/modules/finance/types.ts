export type AccountKind = 'personal' | 'shared'
export type MemberRole = 'viewer' | 'editor' | 'owner'
export type CategoryKind = 'income' | 'expense'
export type TransactionStatus = 'confirmed' | 'pending'
export type Frequency = 'weekly' | 'monthly' | 'yearly'

export type Account = {
  id: string
  name: string
  kind: AccountKind
  icon: string
  color: string
  opening_balance: number
  created_by: string | null
  created_at: string
}

export type AccountWithRole = Account & { role: MemberRole; balance: number }

export type Category = {
  id: string
  account_id: string
  parent_id: string | null
  kind: CategoryKind
  name: string
  icon: string
  color: string
  transfer_category_id: string | null
  sort_order: number
  archived_at: string | null
}

export type CategoryNode = Category & { children: Category[] }

export type Transaction = {
  id: string
  account_id: string
  category_id: string
  amount: number
  date: string
  description: string | null
  status: TransactionStatus
  recurring_id: string | null
  transfer_source_id: string | null
  created_by: string | null
  created_at: string
}

export type Recurring = {
  id: string
  account_id: string
  category_id: string
  amount: number
  description: string | null
  frequency: Frequency
  interval_count: number
  start_date: string
  end_date: string | null
  next_date: string
  auto_confirm: boolean
  active: boolean
}

export type Member = {
  account_id: string
  user_id: string
  role: MemberRole
  profile: { display_name: string } | null
}

export type Profile = { id: string; display_name: string }

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner: 'Proprietario',
  editor: 'Modifica',
  viewer: 'Sola lettura',
}

export const FREQUENCY_LABELS: Record<Frequency, { one: string; many: string }> = {
  weekly: { one: 'settimana', many: 'settimane' },
  monthly: { one: 'mese', many: 'mesi' },
  yearly: { one: 'anno', many: 'anni' },
}
