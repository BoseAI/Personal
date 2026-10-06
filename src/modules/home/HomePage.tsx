import { ChevronRight, Settings } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useUserId } from '../../auth/AuthProvider'
import { PageLoader } from '../../components/ui/Spinner'
import { tint } from '../../lib/colors'
import { formatEUR } from '../../lib/format'
import { cn } from '../../lib/cn'
import { useMe, useEnabledModules } from '../core/api'
import type { ModuleDef, ModuleKey } from '../core/modules'
import { useAccounts } from '../finance/api'
import { useShoppingLists } from '../shopping/api'

function greeting() {
  const h = new Date().getHours()
  return h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera'
}

export function HomePage() {
  const { data: me } = useMe()
  const { modules, isLoading } = useEnabledModules()
  const [header] = useState(() => ({
    today: new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    greeting: greeting(),
  }))

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-8 pt-8">
      <header className="relative">
        <Link to="/impostazioni" aria-label="Impostazioni" className="absolute -top-1 right-0 flex size-10 items-center justify-center rounded-xl text-muted hover:bg-surface-2 hover:text-fg">
          <Settings className="size-5" />
        </Link>
        <p className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">{header.today}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {header.greeting}
          {me && <span className="text-muted">, {me.display_name}</span>}
        </h1>
      </header>

      <div className="space-y-3">
        {modules.map((m) => (
          <ModuleCard key={m.key} module={m} />
        ))}
        {modules.length === 0 && <p className="text-sm text-muted">Nessuna sezione abilitata: chiedi all'amministratore.</p>}
      </div>
    </div>
  )
}

function ModuleCard({ module: m }: { module: ModuleDef }) {
  const Icon = m.icon
  const body = (
    <>
      <div className="pointer-events-none absolute -top-16 -left-10 size-48 rounded-full opacity-25 blur-3xl" style={{ background: m.color }} />
      <div
        className="relative flex size-16 shrink-0 items-center justify-center rounded-2xl"
        style={{ background: tint(m.color, 0.12), boxShadow: `inset 0 0 0 1px ${tint(m.color, 0.35)}, 0 0 28px ${tint(m.color, 0.25)}` }}
      >
        <Icon className="size-8" strokeWidth={1.6} style={{ color: m.color, filter: `drop-shadow(0 0 6px ${tint(m.color, 0.6)})` }} />
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">{m.label}</span>
          {m.soon && <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-wider text-faint uppercase">presto</span>}
        </div>
        <div className="truncate text-sm text-muted">{m.description}</div>
        {!m.soon && <ModuleStat module={m.key} color={m.color} />}
      </div>
      {!m.soon && <ChevronRight className="relative size-5 text-faint transition group-hover:translate-x-0.5 group-hover:text-muted" />}
    </>
  )
  const cls = cn(
    'group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-line bg-surface p-4 transition',
    m.soon ? 'opacity-60' : 'hover:border-line-strong active:scale-[0.99]',
  )
  return m.soon ? (
    <div className={cls}>{body}</div>
  ) : (
    <Link to={m.path} className={cls}>
      {body}
    </Link>
  )
}

function ModuleStat({ module, color }: { module: ModuleKey; color: string }) {
  if (module === 'finance') return <FinanceStat color={color} />
  if (module === 'shopping') return <ShoppingStat color={color} />
  return null
}

function Stat({ children, color }: { children: ReactNode; color: string }) {
  return (
    <div className="num mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium">
      <span className="size-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {children}
    </div>
  )
}

function FinanceStat({ color }: { color: string }) {
  const uid = useUserId()
  const { data: accounts } = useAccounts()
  const mine = accounts?.find((a) => a.kind === 'personal' && a.created_by === uid) ?? accounts?.[0]
  if (!mine) return null
  return <Stat color={color}>{formatEUR(mine.balance)}</Stat>
}

function ShoppingStat({ color }: { color: string }) {
  const { data: lists } = useShoppingLists()
  if (!lists) return null
  const toBuy = lists.reduce((s, l) => s + l.toBuy, 0)
  return <Stat color={color}>{toBuy ? `${toBuy} da prendere` : 'Tutto preso'}</Stat>
}
