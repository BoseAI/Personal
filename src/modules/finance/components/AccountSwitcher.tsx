import { Check, ChevronDown, Eye } from 'lucide-react'
import { useState } from 'react'
import { IconChip } from '../../../components/ui/IconChip'
import { Sheet } from '../../../components/ui/Sheet'
import { formatEUR } from '../../../lib/format'
import { cn } from '../../../lib/cn'
import { useAccount } from '../AccountContext'

export function AccountSwitcher() {
  const { accounts, account, setAccountId } = useAccount()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="group flex w-full items-center gap-3 text-left">
        <IconChip icon={account.icon} color={account.color} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm text-muted">
            <span className="truncate">{account.name}</span>
            <span className="font-mono text-[10px] tracking-wider text-faint uppercase">
              {account.kind === 'shared' ? 'condiviso' : 'personale'}
            </span>
            {account.role === 'viewer' && <Eye className="size-3.5 text-faint" aria-label="Sola lettura" />}
            <ChevronDown className="size-4 text-faint transition group-hover:text-muted" />
          </div>
          <div className={cn('num text-3xl font-semibold', account.balance < 0 && 'text-negative')}>{formatEUR(account.balance)}</div>
        </div>
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Conti">
        <div className="space-y-1 pb-2">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => {
                setAccountId(a.id)
                setOpen(false)
              }}
              className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-surface-2', a.id === account.id && 'bg-surface-2')}
            >
              <IconChip icon={a.icon} color={a.color} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-xs text-faint">
                  {a.kind === 'shared' ? 'Condiviso' : 'Personale'}
                  {a.role === 'viewer' && ' · sola lettura'}
                </div>
              </div>
              <span className="num text-sm text-muted">{formatEUR(a.balance)}</span>
              {a.id === account.id && <Check className="size-4 text-accent" />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
