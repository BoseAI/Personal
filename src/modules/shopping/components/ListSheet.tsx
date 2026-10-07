import { LogOut, PackagePlus, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserId } from '../../../auth/AuthProvider'
import { MembersEditor } from '../../../components/MembersEditor'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input } from '../../../components/ui/Field'
import { IconChip } from '../../../components/ui/IconChip'
import { ColorPicker, IconPicker } from '../../../components/ui/IconPicker'
import { Segmented } from '../../../components/ui/Segmented'
import { Sheet } from '../../../components/ui/Sheet'
import { SWATCHES } from '../../../lib/colors'
import { errorMessage } from '../../../lib/supabase'
import { useToast } from '../../../components/ui/Toast'
import { useAddListMember, useAllItems, useDeleteList, useListMembers, usePreloadItems, useSaveList, useUpdateListMember } from '../api'
import { FOOD_PRESET_NAMES } from '../presets'
import { BEHAVIOR_LABELS, type CheckedBehavior, type ShoppingListWithMeta } from '../types'

const SHOPPING_ICON_GROUPS = ['Spesa e cibo', 'Casa', 'Persone e famiglia']

type Props = { open: boolean; onClose: () => void; list?: ShoppingListWithMeta }

export function ListSheet(props: Props) {
  return props.open ? <ListForm {...props} /> : null
}

function ListForm({ onClose, list }: Props) {
  const navigate = useNavigate()
  const uid = useUserId()
  const save = useSaveList()
  const del = useDeleteList()
  const leave = useUpdateListMember()
  const isOwner = !list || list.role === 'owner'

  const [name, setName] = useState(list?.name ?? '')
  const [icon, setIcon] = useState(list?.icon ?? 'shopping-basket')
  const [color, setColor] = useState(list?.color ?? SWATCHES[2])
  const [behavior, setBehavior] = useState<CheckedBehavior>(list?.checked_behavior ?? 'move_bottom')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError('Inserisci un nome.')
    try {
      const res = await save.mutateAsync({ id: list?.id, name: name.trim(), icon, color, checked_behavior: behavior })
      onClose()
      if (!list && res && 'id' in res) navigate(`/spesa/${res.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    if (!list || !confirm(`Eliminare la lista "${list.name}" e tutti i suoi elementi?`)) return
    try {
      await del.mutateAsync(list.id)
      onClose()
      navigate('/spesa')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function leaveList() {
    if (!list || !confirm('Uscire da questa lista condivisa?')) return
    try {
      await leave.mutateAsync({ listId: list.id, userId: uid, role: null })
      onClose()
      navigate('/spesa')
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={list ? 'Impostazioni lista' : 'Nuova lista'}
      footer={
        <div className="flex gap-2">
          {list && isOwner && (
            <Button variant="danger" onClick={remove} loading={del.isPending} aria-label="Elimina lista">
              <Trash2 className="size-4" />
            </Button>
          )}
          {list && !isOwner && (
            <Button variant="danger" onClick={leaveList} loading={leave.isPending}>
              <LogOut className="size-4" /> Esci dalla lista
            </Button>
          )}
          {isOwner && (
            <Button type="submit" form="list-form" variant="primary" className="flex-1" loading={save.isPending}>
              {list ? 'Salva' : 'Crea lista'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {list && list.role !== 'viewer' && <PreloadSection listId={list.id} />}
        <form id="list-form" onSubmit={submit}>
          <fieldset disabled={!isOwner} className="space-y-5">
            <div className="flex items-center gap-3">
              <IconChip icon={icon} color={color} size="lg" />
              <Input autoFocus={!list} value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Alimentari" className="flex-1" />
            </div>
            <Field label="Elementi spuntati" hint={BEHAVIOR_LABELS[behavior].description}>
              <Segmented
                className="w-full"
                value={behavior}
                onChange={setBehavior}
                options={(Object.keys(BEHAVIOR_LABELS) as CheckedBehavior[]).map((b) => ({ value: b, label: BEHAVIOR_LABELS[b].label }))}
              />
            </Field>
            {isOwner && (
              <>
                <Field label="Icona">
                  <IconPicker value={icon} color={color} onChange={setIcon} preferGroups={SHOPPING_ICON_GROUPS} />
                </Field>
                <Field label="Colore">
                  <ColorPicker value={color} onChange={setColor} />
                </Field>
              </>
            )}
            <ErrorText error={error} />
          </fieldset>
        </form>
        {list && <ListMembers list={list} />}
      </div>
    </Sheet>
  )
}

function ListMembers({ list }: { list: ShoppingListWithMeta }) {
  const { data: members = [] } = useListMembers(list.id)
  const add = useAddListMember()
  const update = useUpdateListMember()
  return (
    <MembersEditor
      title="Condivisa con"
      members={members.map((m) => ({ user_id: m.user_id, role: m.role, display_name: m.profile?.display_name ?? '' }))}
      isOwner={list.role === 'owner'}
      onAdd={(email, role) => add.mutateAsync({ listId: list.id, email, role })}
      onChange={(userId, role) => update.mutateAsync({ listId: list.id, userId, role })}
      roleHelp="Sola lettura: vede la lista. Modifica: aggiunge, spunta ed elimina elementi. Proprietario: in più cambia impostazioni e condivisione."
    />
  )
}

function PreloadSection({ listId }: { listId: string }) {
  const toast = useToast()
  const { data: items = [] } = useAllItems()
  const preload = usePreloadItems()
  const missing = FOOD_PRESET_NAMES.filter((n) => !items.some((i) => i.list_id === listId && i.name.trim().toLowerCase() === n.toLowerCase())).length

  async function run() {
    if (!confirm(`Aggiungere ${missing} prodotti alimentari comuni come già spuntati? Li riattivi con un tocco quando servono.`)) return
    const added = await preload.mutateAsync({ listId, names: FOOD_PRESET_NAMES, existing: items })
    toast({ message: `Aggiunti ${added} prodotti` }, 2500)
  }

  return (
    <section className="space-y-2">
      <p className="font-mono text-[11px] font-medium tracking-[0.12em] text-faint uppercase">Prodotti comuni</p>
      <Button className="w-full" disabled={!missing} loading={preload.isPending} onClick={run}>
        <PackagePlus className="size-4" /> {missing ? `Precarica ${missing} prodotti alimentari` : 'Prodotti comuni già caricati'}
      </Button>
      <p className="text-xs text-faint">Frutta, verdura, carne, latticini, dispensa, surgelati, bevande… entrano già spuntati: scrivi il nome o tocca il suggerimento per rimetterli da prendere.</p>
    </section>
  )
}
