import { House } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useEnabledModules } from '../../modules/core/api'

export function AppShell() {
  const { modules } = useEnabledModules()
  const nav = [
    { to: '/', label: 'Home', icon: House, end: true },
    ...modules.filter((m) => !m.soon).map((m) => ({ to: m.path, label: m.label, icon: m.icon, end: false })),
  ]

  return (
    <div className="min-h-dvh">
      <main className="pt-safe mx-auto max-w-2xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn('flex flex-1 flex-col items-center justify-center gap-1 transition', isActive ? 'text-fg' : 'text-faint hover:text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
