import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '../../lib/cn'

const TABS = [
  { to: '/alimentazione', label: 'Oggi', end: true },
  { to: '/alimentazione/peso', label: 'Peso', end: true },
  { to: '/alimentazione/obiettivi', label: 'Obiettivi', end: true },
]

export function NutritionLayout() {
  return (
    <div className="space-y-4">
      <h1 className="pt-6 text-2xl font-semibold tracking-tight">Alimentazione</h1>
      <nav className="no-scrollbar -mx-4 flex overflow-x-auto border-b border-line px-4">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                '-mb-px flex-1 border-b-2 px-2 py-2.5 text-center text-sm font-medium whitespace-nowrap transition',
                isActive ? 'border-[#f472b6] text-fg' : 'border-transparent text-faint hover:text-muted',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
