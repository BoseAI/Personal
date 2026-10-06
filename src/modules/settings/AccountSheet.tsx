import { Trash2, UserMinus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useUserId } from '../../auth/AuthProvider'
import { Button, IconButton } from '../../components/ui/Button'
import { SectionTitle } from '../../components/ui/Card'
import { ErrorText, Field, Input, Select } from '../../components/ui/Field'
import { IconChip } from '../../components/ui/IconChip'
import { ColorPicker, IconPicker } from '../../components/ui/IconPicker'
import { Segmented } from '../../components/ui/Segmented'
import { Sheet } from '../../components/ui/Sheet'
import { SWATCHES } from '../../lib/colors'
import { amountToInput, parseAmount } from '../../lib/format'
import { errorMessage } from '../../lib/supabase'
import { useAccount } from '../finance/AccountContext'
import { useAddMember, useDeleteAccount, useMembers, useSaveAccount, useUpdateMember } from '../finance/api'
import { ROLE_LABELS, type AccountKind, type AccountWithRole, type MemberRole } from '../finance/types'

const ROLES: MemberRole[] = ['owner', 'editor', 'viewer']

type Props = { open: boolean; onClose: () => void; account?: AccountWithRole }

export function AccountSheet(props: Props) {
  return props.open ? <AccountForm {...props} /> : null
}

function AccountForm({ open, onClose, account }: Props) {
  const { setAccountId } = useAccount()
  const save = useSaveAccount()
  const del = useDeleteAccount()
  const isOwner = !account || account.role === 'owner'

  const [name, setName] = useState(account?.name ?? '')
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'shared')
  const [icon, setIcon] = useState(account?.icon ?? 'house')
  const [color, setColor] = useState(account?.color ?? SWATCHES[0])
  const [opening, setOpening] = useState(account ? amountToInput(account.opening_balance) : '')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Inserisci un nome.')
    const openingValue = opening.trim() ? parseAmount(opening.replace(/^−/, '-')) : 0
    if (openingValue === null) return setError('Saldo iniziale non valido.')
    setError(null)
    try {
      await save.mutateAsync({
        id: account?.id,
        name: name.trim(),
        icon,
        color,
        opening_balance: openingValue,
        ...(account ? {} : { kind }),
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    if (!account) return
    const typed = prompt(`Eliminando "${account.name}" perderai tutti i suoi movimenti e categorie.\nScrivi il nome del conto per confermare:`)
    if (typed?.trim() !== account.name) return
    try {
      await del.mutateAsync(account.id)
      setAccountId('')
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={account ? account.name : 'Nuovo conto'}
      footer={
        isOwner && (
          <div className="flex gap-2">
            {account && (
              <Button variant="danger" onClick={remove} loading={del.isPending} aria-label="Elimina conto">
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button type="submit" form="account-form" variant="primary" className="flex-1" loading={save.isPending}>
              {account ? 'Salva' : 'Crea conto'}
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-6">
        <form id="account-form" onSubmit={submit}>
          <fieldset disabled={!isOwner} className="space-y-5">
            {!account && (
              <Field
                label="Tipo"
                hint={
                  kind === 'shared'
                    ? 'Verrà creata nei conti personali dei membri la categoria "Versamento" che alimenta questo conto.'
                    : 'Un ulteriore conto personale (es. risparmi).'
                }
              >
                <Segmented
                  className="w-full"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: 'shared', label: 'Condiviso' },
                    { value: 'personal', label: 'Personale' },
                  ]}
                />
              </Field>
            )}
            <div className="flex items-center gap-3">
              <IconChip icon={icon} color={color} size="lg" />
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome conto" className="flex-1" />
            </div>
            <Field label="Saldo iniziale €" hint="Il saldo del conto prima del primo movimento registrato.">
              <Input inputMode="decimal" className="num" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0,00" />
            </Field>
            {isOwner && (
              <>
                <Field label="Icona">
                  <IconPicker value={icon} color={color} onChange={setIcon} />
                </Field>
                <Field label="Colore">
                  <ColorPicker value={color} onChange={setColor} />
                </Field>
              </>
            )}
            <ErrorText error={error} />
          </fieldset>
        </form>

        {account && <MembersSection account={account} />}
      </div>
    </Sheet>
  )
}

function MembersSection({ account }: { account: AccountWithRole }) {
  const uid = useUserId()
  const { data: members = [] } = useMembers(account.id)
  const add = useAddMember()
  const update = useUpdateMember()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('editor')
  const [error, setError] = useState<string | null>(null)
  const isOwner = account.role === 'owner'

  async function invite(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    try {
      await add.mutateAsync({ accountId: account.id, email: email.trim(), role })
      setEmail('')
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function change(userId: string, next: MemberRole | null) {
    if (next === null && !confirm(userId === uid ? 'Uscire da questo conto?' : 'Rimuovere l\'accesso a questo utente?')) return
    try {
      await update.mutateAsync({ accountId: account.id, userId, role: next })
      setError(null)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section className="space-y-3">
      <SectionTitle>Chi può accedere</SectionTitle>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">
              {(m.profile?.display_name ?? '?').charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm">
              {m.profile?.display_name}
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
              <IconButton label={m.user_id === uid ? 'Esci dal conto' : 'Rimuovi'} onClick={() => change(m.user_id, null)}>
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
          <Button type="submit" className="w-full" loading={add.isPending}>
            Dai accesso
          </Button>
          <p className="text-xs text-faint">
            <strong className="text-muted">Sola lettura</strong>: vede saldo e movimenti. <strong className="text-muted">Modifica</strong>: aggiunge e
            modifica movimenti, categorie e ricorrenti. <strong className="text-muted">Proprietario</strong>: in più gestisce il conto e gli accessi.
          </p>
        </form>
      )}
      <ErrorText error={error} />
    </section>
  )
}
