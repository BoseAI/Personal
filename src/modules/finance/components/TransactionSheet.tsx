import { ArrowRightLeft, Link2, Trash2 } from 'lucide-react'
import { useMemo, useState, type SyntheticEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ErrorText, Field, Input } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { Sheet } from '../../../components/ui/Sheet'
import { today } from '../../../lib/dates'
import { amountToInput, parseAmount } from '../../../lib/format'
import { errorMessage } from '../../../lib/supabase'
import { useAccount } from '../AccountContext'
import { buildTree, useCategories, useDeleteTransaction, useSaveTransaction, useTransferTargets } from '../api'
import type { CategoryKind, Transaction } from '../types'
import { CategoryPicker } from './CategoryPicker'

type Props = { open: boolean; onClose: () => void; transaction?: Transaction }

/** Il form viene montato a ogni apertura: lo stato si inizializza dai props. */
export function TransactionSheet(props: Props) {
  return props.open ? <TransactionForm {...props} /> : null
}

function TransactionForm({ open, onClose, transaction }: Props) {
  const { account, accounts, canEdit } = useAccount()
  const { data: categories = [] } = useCategories(account.id)
  const editable = accounts.filter((a) => a.role !== 'viewer').map((a) => a.id)
  const { data: targets = [] } = useTransferTargets(account.id, editable)
  const save = useSaveTransaction()
  const del = useDeleteTransaction()

  const [kind, setKind] = useState<CategoryKind>(() => categories.find((c) => c.id === transaction?.category_id)?.kind ?? 'expense')
  const [amount, setAmount] = useState(transaction ? amountToInput(transaction.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category_id ?? null)
  const [date, setDate] = useState(transaction?.date ?? today())
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [error, setError] = useState<string | null>(null)

  const tree = useMemo(() => buildTree(categories, kind), [categories, kind])
  const category = categories.find((c) => c.id === categoryId)
  const transferTarget = category?.transfer_category_id ? targets.find((t) => t.id === category.transfer_category_id) : undefined
  const transferAccount = transferTarget && accounts.find((a) => a.id === transferTarget.account_id)
  const isMirror = !!transaction?.transfer_source_id
  const readOnly = !canEdit || isMirror
  const isPending = transaction?.status === 'pending'

  async function submit(e: SyntheticEvent, confirm = false) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (!value || value <= 0) return setError('Inserisci un importo valido.')
    if (!categoryId || category?.kind !== kind) return setError('Scegli una categoria.')
    setError(null)
    try {
      await save.mutateAsync({
        id: transaction?.id,
        account_id: account.id,
        category_id: categoryId,
        amount: value,
        date,
        description: description.trim() || null,
        status: confirm || !transaction ? 'confirmed' : transaction.status,
      })
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function remove() {
    if (!transaction || !confirm('Eliminare questo movimento?')) return
    try {
      await del.mutateAsync(transaction.id)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const title = transaction ? (isPending ? 'Movimento da confermare' : 'Modifica movimento') : 'Nuovo movimento'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        !readOnly && (
          <div className="flex gap-2">
            {transaction && (
              <Button variant="danger" onClick={remove} loading={del.isPending} aria-label="Elimina">
                <Trash2 className="size-4" />
              </Button>
            )}
            {isPending ? (
              <Button variant="primary" className="flex-1" loading={save.isPending} onClick={(e) => submit(e, true)}>
                Conferma
              </Button>
            ) : (
              <Button type="submit" form="tx-form" variant="primary" className="flex-1" loading={save.isPending}>
                Salva
              </Button>
            )}
          </div>
        )
      }
    >
      <form id="tx-form" onSubmit={submit} className="space-y-5">
        {isMirror && (
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-xs text-muted">
            <Link2 className="mt-0.5 size-4 shrink-0" />
            Generato automaticamente da un versamento: si modifica o elimina dal conto di origine.
          </p>
        )}
        <fieldset disabled={readOnly} className="space-y-5">
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

          <div className="flex items-baseline justify-center gap-2 py-2">
            <span className="num text-3xl text-faint">{kind === 'income' ? '+' : '−'}</span>
            <input
              inputMode="decimal"
              autoFocus={!transaction}
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d,.]/g, ''))}
              className="num w-48 bg-transparent text-center text-5xl font-semibold outline-none placeholder:text-surface-3"
              aria-label="Importo"
            />
            <span className="num text-3xl text-faint">€</span>
          </div>

          <CategoryPicker tree={tree} all={categories} value={categoryId} onChange={setCategoryId} />

          {transferAccount && (
            <p className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-xs text-muted">
              <ArrowRightLeft className="size-4 shrink-0 text-accent" />
              Verrà registrata un'entrata in <strong className="text-fg">{transferAccount.name}</strong> › {transferTarget!.name}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Nota">
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opzionale" />
            </Field>
          </div>
          <ErrorText error={error} />
        </fieldset>
      </form>
    </Sheet>
  )
}
