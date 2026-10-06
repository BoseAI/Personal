import { Dumbbell, Settings, ShoppingCart, Wallet } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const NAV = [
  { to: '/finanze', label: 'Finanze', icon: Wallet },
  { to: '/spesa', label: 'Spesa', icon: ShoppingCart, soon: true },
  { to: '/allenamento', label: 'Allenamento', icon: Dumbbell, soon: true },
  { to: '/impostazioni', label: 'Impostazioni', icon: Settings },
]

export function AppShell() {
  return (
    <div className="min-h-dvh">
      <main className="pt-safe mx-auto max-w-2xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-2xl grid-cols-4">
          {NAV.map(({ to, label, icon: Icon, soon }) =>
            soon ? (
              <span key={to} className="flex flex-col items-center justify-center gap-1 text-faint/50" title="In arrivo">
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="text-[10px] font-medium">{label}</span>
              </span>
            ) : (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn('flex flex-col items-center justify-center gap-1 transition', isActive ? 'text-fg' : 'text-faint hover:text-muted')
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                    <span className="text-[10px] font-medium">{label}</span>
                  </>
                )}
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  )
}
