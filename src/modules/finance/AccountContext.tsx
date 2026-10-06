import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageLoader } from '../../components/ui/Spinner'
import { ErrorText } from '../../components/ui/Field'
import { errorMessage } from '../../lib/supabase'
import { useAccounts, useFinanceSync } from './api'
import type { AccountWithRole } from './types'

type AccountContextValue = {
  accounts: AccountWithRole[]
  account: AccountWithRole
  setAccountId: (id: string) => void
  canEdit: boolean
}

const Ctx = createContext<AccountContextValue | null>(null)
const STORAGE_KEY = 'personal.selectedAccount'

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  useFinanceSync()
  const { data: accounts, isLoading, error } = useAccounts()
  const [selected, setSelected] = useState<string | null>(readStored)

  useEffect(() => {
    if (!selected) return
    try {
      localStorage.setItem(STORAGE_KEY, selected)
    } catch {
      /* storage non disponibile */
    }
  }, [selected])

  const value = useMemo(() => {
    if (!accounts?.length) return null
    const account = accounts.find((a) => a.id === selected) ?? accounts[0]
    return { accounts, account, setAccountId: setSelected, canEdit: account.role !== 'viewer' }
  }, [accounts, selected])

  if (isLoading) return <PageLoader />
  if (error)
    return (
      <div className="p-4">
        <ErrorText error={errorMessage(error)} />
      </div>
    )
  if (!value)
    return (
      <div className="p-4">
        <ErrorText error="Nessun conto disponibile per questo utente." />
      </div>
    )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAccount() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAccount fuori da AccountProvider')
  return ctx
}
