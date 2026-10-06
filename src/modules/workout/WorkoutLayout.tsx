import { Dumbbell } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { useLiveSession } from './live'

const TABS = [
  { to: '/allenamento', label: 'Riepilogo', end: true },
  { to: '/allenamento/schede', label: 'Schede', end: true },
  { to: '/allenamento/attivita', label: 'Attività', end: true },
  { to: '/allenamento/progressi', label: 'Progressi', end: true },
]

export function WorkoutLayout() {
  const { pathname } = useLocation()
  const live = useLiveSession()
  const showTabs = TABS.some((t) => t.to === pathname.replace(/\/$/, ''))

  return (
    <div className="space-y-4">
      {showTabs && (
        <>
          <h1 className="pt-6 text-2xl font-semibold tracking-tight">Allenamento</h1>
          <nav className="no-scrollbar -mx-4 flex overflow-x-auto border-b border-line px-4">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  cn(
                    '-mb-px flex-1 border-b-2 px-2 py-2.5 text-center text-sm font-medium whitespace-nowrap transition',
                    isActive ? 'border-[#fb923c] text-fg' : 'border-transparent text-faint hover:text-muted',
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </>
      )}
      {live && pathname !== '/allenamento/live' && (
        <Link to="/allenamento/live" className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-3 py-2.5 text-sm">
          <Dumbbell className="size-5 text-accent" />
          <span className="flex-1">
            Allenamento in corso: <span className="font-semibold">{live.name}</span>
          </span>
          <span className="text-accent">Riprendi →</span>
        </Link>
      )}
      <Outlet />
    </div>
  )
}
