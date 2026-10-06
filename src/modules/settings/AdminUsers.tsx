import { ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { SectionTitle } from '../../components/ui/Card'
import { ErrorText } from '../../components/ui/Field'
import { cn } from '../../lib/cn'
import { errorMessage } from '../../lib/supabase'
import { useAdminUsers, useModuleAccess, useSetAdmin, useSetModuleAccess, type AdminUser } from '../core/api'
import { MODULES } from '../core/modules'

/** Pannello amministratore: quali sezioni vede ciascun utente. */
export function AdminUsers() {
  const { data: users = [] } = useAdminUsers(true)
  return (
    <section>
      <SectionTitle>Utenti e sezioni</SectionTitle>
      <div className="space-y-2">
        {users.map((u) => (
          <UserCard key={u.id} user={u} />
        ))}
      </div>
      <p className="mt-2 px-1 text-xs text-faint">
        Le sezioni disattivate spariscono dalla Home e dal menu di quell'utente. I nuovi utenti si creano da Supabase → Authentication → Users.
      </p>
    </section>
  )
}

function UserCard({ user }: { user: AdminUser }) {
  const uid = useUserId()
  const { data: access } = useModuleAccess(user.id)
  const setAccess = useSetModuleAccess()
  const setAdmin = useSetAdmin()
  const [error, setError] = useState<string | null>(null)
  const onError = (e: unknown) => setError(errorMessage(e))

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-surface-3 text-sm font-semibold">
          {user.display_name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {user.display_name}
            {user.id === uid && <span className="text-faint"> (tu)</span>}
          </div>
          <div className="truncate text-xs text-faint">{user.email}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (user.is_admin || confirm(`Rendere ${user.display_name} amministratore? Potrà gestire sezioni e utenti.`))
              setAdmin.mutate({ userId: user.id, admin: !user.is_admin }, { onError })
          }}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition',
            user.is_admin ? 'border-accent/40 text-fg' : 'border-line text-faint hover:text-muted',
          )}
        >
          <ShieldCheck className={cn('size-3.5', user.is_admin && 'text-accent')} /> Admin
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MODULES.map((m) => {
          const on = access?.[m.key] ?? true
          const Icon = m.icon
          return (
            <button
              key={m.key}
              type="button"
              aria-pressed={on}
              onClick={() => setAccess.mutate({ userId: user.id, module: m.key, enabled: !on }, { onError })}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition',
                on ? 'border-transparent text-fg' : 'border-line text-faint line-through',
              )}
              style={on ? { background: `${m.color}22`, borderColor: `${m.color}66` } : undefined}
            >
              <Icon className="size-3.5" style={on ? { color: m.color } : undefined} />
              {m.label}
            </button>
          )
        })}
      </div>
      <ErrorText error={error} />
    </div>
  )
}
