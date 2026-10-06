import { Plus } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useAccount } from './AccountContext'
import { AccountSwitcher } from './components/AccountSwitcher'
import { TransactionSheet } from './components/TransactionSheet'

const TABS = [
  { to: '/finanze', label: 'Panoramica', end: true },
  { to: '/finanze/movimenti', label: 'Movimenti' },
  { to: '/finanze/ricorrenti', label: 'Ricorrenti' },
  { to: '/finanze/categorie', label: 'Categorie' },
]

export function FinanceLayout() {
  const { canEdit } = useAccount()
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-4 pt-4">
      <AccountSwitcher />
      <nav className="no-scrollbar -mx-4 flex overflow-x-auto border-b border-line px-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                '-mb-px flex-1 border-b-2 px-2 py-2.5 text-center text-sm font-medium whitespace-nowrap transition',
                isActive ? 'border-accent text-fg' : 'border-transparent text-faint hover:text-muted',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />

      {canEdit && (
        <button
          type="button"
          aria-label="Nuovo movimento"
          onClick={() => setAdding(true)}
          className="fixed right-[max(1rem,calc(50%-21rem))] bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-lg shadow-black/40 transition active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.25} />
        </button>
      )}
      <TransactionSheet open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
