import { Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MembersEditor } from '../../components/MembersEditor'
import { Button } from '../../components/ui/Button'
import { ErrorText, Field, Input } from '../../components/ui/Field'
import { IconChip } from '../../components/ui/IconChip'
import { ColorPicker, IconPicker } from '../../components/ui/IconPicker'
import { Segmented } from '../../components/ui/Segmented'
import { Sheet } from '../../components/ui/Sheet'
import { SWATCHES } from '../../lib/colors'
import { amountToInput, parseAmount } from '../../lib/format'
import { errorMessage } from '../../lib/supabase'
import { useAddMember, useDeleteAccount, useMembers, useSaveAccount, useUpdateMember } from '../finance/api'
import type { AccountKind, AccountWithRole } from '../finance/types'

type Props = { open: boolean; onClose: () => void; account?: AccountWithRole }

export function AccountSheet(props: Props) {
  return props.open ? <AccountForm {...props} /> : null
}

function AccountForm({ open, onClose, account }: Props) {
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
  const { data: members = [] } = useMembers(account.id)
  const add = useAddMember()
  const update = useUpdateMember()
  return (
    <MembersEditor
      members={members.map((m) => ({ user_id: m.user_id, role: m.role, display_name: m.profile?.display_name ?? '' }))}
      isOwner={account.role === 'owner'}
      onAdd={(email, role) => add.mutateAsync({ accountId: account.id, email, role })}
      onChange={(userId, role) => update.mutateAsync({ accountId: account.id, userId, role })}
      roleHelp="Sola lettura: vede saldo e movimenti. Modifica: aggiunge e modifica movimenti, categorie e ricorrenti. Proprietario: in più gestisce il conto e gli accessi."
    />
  )
}
