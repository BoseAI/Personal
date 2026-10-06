import { ChevronRight, LogOut, Plus, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { ErrorText, Input } from '../../components/ui/Field'
import { IconChip } from '../../components/ui/IconChip'
import { formatEUR } from '../../lib/format'
import { errorMessage, supabase } from '../../lib/supabase'
import { useMe, useModuleAccess, useUpdateProfile, type Me } from '../core/api'
import { useAccounts } from '../finance/api'
import { ROLE_LABELS, type AccountWithRole } from '../finance/types'
import { AccountSheet } from './AccountSheet'
import { AdminUsers } from './AdminUsers'

export function SettingsPage() {
  const { session } = useAuth()
  const { data: me } = useMe()
  const { data: access } = useModuleAccess()

  return (
    <div className="space-y-6 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>
      <ProfileForm key={me?.display_name} email={session?.user.email ?? ''} me={me} />
      {(access?.finance ?? true) && <AccountsSection />}
      {me?.is_admin && <AdminUsers />}
      <Button variant="secondary" className="w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut className="size-4" /> Esci
      </Button>
    </div>
  )
}

function AccountsSection() {
  const { data: accounts = [] } = useAccounts()
  const [editing, setEditing] = useState<AccountWithRole | 'new' | null>(null)
  return (
    <section>
      <SectionTitle
        action={
          <Button size="sm" variant="ghost" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Nuovo conto
          </Button>
        }
      >
        Conti e permessi
      </SectionTitle>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {accounts.map((a) => (
          <button key={a.id} type="button" onClick={() => setEditing(a)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-surface-2">
            <IconChip icon={a.icon} color={a.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{a.name}</div>
              <div className="text-xs text-faint">
                {a.kind === 'shared' ? 'Condiviso' : 'Personale'} · {ROLE_LABELS[a.role]}
              </div>
            </div>
            <span className="num text-sm text-muted">{formatEUR(a.balance)}</span>
            <ChevronRight className="size-4 text-faint" />
          </button>
        ))}
      </div>
      <AccountSheet open={editing !== null} account={editing === 'new' ? undefined : (editing ?? undefined)} onClose={() => setEditing(null)} />
    </section>
  )
}

function ProfileForm({ email, me }: { email: string; me?: Me }) {
  const update = useUpdateProfile()
  const [name, setName] = useState(me?.display_name ?? '')
  const [error, setError] = useState<string | null>(null)
  const dirty = me && name.trim() && name.trim() !== me.display_name

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-accent font-semibold text-accent-ink">
          {(me?.display_name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{me?.display_name}</div>
          <div className="truncate text-xs text-faint">{email}</div>
        </div>
        {me?.is_admin && (
          <span className="flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
            <ShieldCheck className="size-3.5 text-accent" /> Admin
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome visualizzato" />
        <Button
          variant="primary"
          disabled={!dirty}
          loading={update.isPending}
          onClick={() => update.mutate(name.trim(), { onError: (e) => setError(errorMessage(e)), onSuccess: () => setError(null) })}
        >
          Salva
        </Button>
      </div>
      <ErrorText error={error} />
    </Card>
  )
}
