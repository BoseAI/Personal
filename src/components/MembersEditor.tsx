import { UserMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useUserId } from '../auth/AuthProvider'
import { errorMessage } from '../lib/supabase'
import { ROLE_LABELS, type MemberRole } from '../modules/finance/types'
import { Button, IconButton } from './ui/Button'
import { SectionTitle } from './ui/Card'
import { ErrorText, Input, Select } from './ui/Field'

const ROLES: MemberRole[] = ['owner', 'editor', 'viewer']

export type MemberRow = { user_id: string; role: MemberRole; display_name: string }

/** Elenco membri con ruoli + invito per email. Usato da conti e liste. */
export function MembersEditor({
  members,
  isOwner,
  onAdd,
  onChange,
  roleHelp,
  title = 'Chi può accedere',
}: {
  members: MemberRow[]
  isOwner: boolean
  onAdd: (email: string, role: MemberRole) => Promise<unknown>
  onChange: (userId: string, role: MemberRole | null) => Promise<unknown>
  roleHelp: string
  title?: string
}) {
  const uid = useUserId()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('editor')
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function invite(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    try {
      await onAdd(email.trim(), role)
      setEmail('')
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setAdding(false)
    }
  }

  async function change(userId: string, next: MemberRole | null) {
    if (next === null && !confirm(userId === uid ? 'Uscire e perdere l\'accesso?' : 'Rimuovere l\'accesso a questo utente?')) return
    try {
      await onChange(userId, next)
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section className="space-y-3">
      <SectionTitle>{title}</SectionTitle>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">
              {(m.display_name || '?').charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm">
              {m.display_name}
              {m.user_id === uid && <span className="text-faint"> (tu)</span>}
            </span>
            {isOwner ? (
              <Select value={m.role} onChange={(e) => change(m.user_id, e.target.value as MemberRole)} className="h-9 w-36 text-sm">
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            ) : (
              <span className="text-xs text-faint">{ROLE_LABELS[m.role]}</span>
            )}
            {(isOwner || m.user_id === uid) && (
              <IconButton label={m.user_id === uid ? 'Esci' : 'Rimuovi'} onClick={() => change(m.user_id, null)}>
                <UserMinus className="size-4" />
              </IconButton>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <form onSubmit={invite} className="space-y-2">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email utente" />
            <Select value={role} onChange={(e) => setRole(e.target.value as MemberRole)} className="w-36">
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" loading={adding}>
            Dai accesso
          </Button>
          <p className="text-xs text-faint">{roleHelp}</p>
        </form>
      )}
      <ErrorText error={error} />
    </section>
  )
}
