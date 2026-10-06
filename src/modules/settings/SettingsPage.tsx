import { ChevronRight, LogOut, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../auth/AuthProvider'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { ErrorText, Input } from '../../components/ui/Field'
import { IconChip } from '../../components/ui/IconChip'
import { formatEUR } from '../../lib/format'
import { errorMessage, supabase } from '../../lib/supabase'
import { useAccount } from '../finance/AccountContext'
import { useProfile, useUpdateProfile } from '../finance/api'
import { ROLE_LABELS, type AccountWithRole, type Profile } from '../finance/types'
import { AccountSheet } from './AccountSheet'

export function SettingsPage() {
  const { session } = useAuth()
  const { accounts } = useAccount()
  const [editing, setEditing] = useState<AccountWithRole | 'new' | null>(null)

  return (
    <div className="space-y-6 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight">Impostazioni</h1>

      <ProfileCard email={session?.user.email ?? ''} />

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
      </section>

      <Button variant="secondary" className="w-full" onClick={() => supabase.auth.signOut()}>
        <LogOut className="size-4" /> Esci
      </Button>

      <AccountSheet
        open={editing !== null}
        account={editing === 'new' ? undefined : (editing ?? undefined)}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function ProfileCard({ email }: { email: string }) {
  const { data: profile } = useProfile()
  return <ProfileForm key={profile?.display_name} email={email} profile={profile} />
}

function ProfileForm({ email, profile }: { email: string; profile?: Profile }) {
  const update = useUpdateProfile()
  const [name, setName] = useState(profile?.display_name ?? '')
  const [error, setError] = useState<string | null>(null)

  const dirty = profile && name.trim() && name.trim() !== profile.display_name

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-accent font-semibold text-accent-ink">
          {(profile?.display_name ?? '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate font-medium">{profile?.display_name}</div>
          <div className="truncate text-xs text-faint">{email}</div>
        </div>
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
