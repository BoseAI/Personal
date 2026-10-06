import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input, Select, Toggle } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { Sheet } from '../../../components/ui/Sheet'
import { today } from '../../../lib/dates'
import { amountToInput, parseAmount } from '../../../lib/format'
import { errorMessage } from '../../../lib/supabase'
import { useAccount } from '../AccountContext'
import { buildTree, useCategories, useDeleteRecurring, useSaveRecurring } from '../api'
import { FREQUENCY_LABELS, type CategoryKind, type Frequency, type Recurring } from '../types'
import { CategoryPicker } from './CategoryPicker'

type Props = { open: boolean; onClose: () => void; recurring?: Recurring }

export function RecurringSheet(props: Props) {
  return props.open ? <RecurringForm {...props} /> : null
}

function RecurringForm({ open, onClose, recurring }: Props) {
  const { account, canEdit } = useAccount()
  const { data: categories = [] } = useCategories(account.id)
  const save = useSaveRecurring()
  const del = useDeleteRecurring()

  const [kind, setKind] = useState<CategoryKind>(() => categories.find((c) => c.id === recurring?.category_id)?.kind ?? 'expense')
  const [amount, setAmount] = useState(recurring ? amountToInput(recurring.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(recurring?.category_id ?? null)
  const [description, setDescription] = useState(recurring?.description ?? '')
  const [frequency, setFrequency] = useState<Frequency>(recurring?.frequency ?? 'monthly')
  const [intervalCount, setIntervalCount] = useState(recurring?.interval_count ?? 1)
  const [startDate, setStartDate] = useState(recurring?.start_date ?? today())
  const [endDate, setEndDate] = useState(recurring?.end_date ?? '')
  const [autoConfirm, setAutoConfirm] = useState(recurring?.auto_confirm ?? true)
  const [active, setActive] = useState(recurring?.active ?? true)
  const [error, setError] = useState<string | null>(null)

  const tree = useMemo(() => buildTree(categories, kind), [categories, kind])
  const category = categories.find((c) => c.id === categoryId)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!value || value <= 0) return setError('Inserisci un importo valido.')
    if (!categoryId || category?.kind !== kind) return setError('Scegli una categoria.')
    if (endDate && endDate < startDate) return setError('La data di fine è precedente all\'inizio.')
    setError(null)
    try {
      await save.mutateAsync({
        id: recurring?.id,
        account_id: account.id,
        category_id: categoryId,
        amount: value,
        description: description.trim() || null,
        frequency,
        interval_count: intervalCount,
        start_date: startDate,
        end_date: endDate || null,
        auto_confirm: autoConfirm,
        active,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    if (!recurring || !confirm('Eliminare la ricorrenza? I movimenti già registrati restano.')) return
    try {
      await del.mutateAsync(recurring.id)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const unit = FREQUENCY_LABELS[frequency]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={recurring ? 'Modifica ricorrente' : 'Nuova ricorrente'}
      footer={
        canEdit && (
          <div className="flex gap-2">
            {recurring && (
              <Button variant="danger" onClick={remove} loading={del.isPending} aria-label="Elimina">
                <Trash2 className="size-4" />
              </Button>
            )}
            <Button type="submit" form="rec-form" variant="primary" className="flex-1" loading={save.isPending}>
              Salva
            </Button>
          </div>
        )
      }
    >
      <form id="rec-form" onSubmit={submit}>
        <fieldset disabled={!canEdit} className="space-y-5">
          <Segmented
            className="w-full"
            value={kind}
            onChange={(k) => {
              setKind(k)
              setCategoryId(null)
            }}
            options={[
              { value: 'expense', label: 'Uscita' },
              { value: 'income', label: 'Entrata' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Es. Netflix" />
            </Field>
            <Field label="Importo €">
              <Input
                inputMode="decimal"
                className="num"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))}
                placeholder="0,00"
              />
            </Field>
          </div>

          <CategoryPicker tree={tree} all={categories} value={categoryId} onChange={setCategoryId} />

          <div className="grid grid-cols-[auto_1fr] items-end gap-3">
            <Field label="Ogni">
              <Input
                type="number"
                min={1}
                max={60}
                className="num w-20"
                value={intervalCount}
                onChange={(e) => setIntervalCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              />
            </Field>
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                <option key={f} value={f}>
                  {intervalCount === 1 ? FREQUENCY_LABELS[f].one : FREQUENCY_LABELS[f].many}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Dal" hint="Le date passate vengono registrate subito">
              <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Fino al" hint="Vuoto = senza fine">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Field>
          </div>

          <Toggle
            checked={autoConfirm}
            onChange={setAutoConfirm}
            label="Registra in automatico"
            description={
              autoConfirm
                ? `Il movimento viene registrato da solo ogni ${intervalCount === 1 ? unit.one : `${intervalCount} ${unit.many}`}.`
                : 'Il movimento resta "da confermare": utile per importi variabili (bollette).'
            }
          />
          {recurring && <Toggle checked={active} onChange={setActive} label="Attiva" description="Se disattivata non genera nuovi movimenti." />}
          <ErrorText error={error} />
        </fieldset>
      </form>
    </Sheet>
  )
}
