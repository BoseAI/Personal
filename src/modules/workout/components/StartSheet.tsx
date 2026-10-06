import { ChevronRight, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Sheet } from '../../../components/ui/Sheet'
import { usePlans } from '../api'
import { startLiveSession, useLiveSession } from '../live'

/** Scegli la scheda da cui partire (o un allenamento libero). */
export function StartSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { data: plans = [] } = usePlans()
  const live = useLiveSession()

  function start(planId: string | null) {
    if (live && !confirm('C\'è già un allenamento in corso: sostituirlo?')) return
    startLiveSession(plans.find((p) => p.id === planId) ?? null)
    onClose()
    navigate('/allenamento/live')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Inizia allenamento">
      <div className="space-y-2 pb-2">
        {plans.map((p) => (
          <button key={p.id} type="button" onClick={() => start(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-3 text-left hover:bg-surface-2">
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            <span className="flex-1">
              <span className="block text-sm font-medium">{p.name}</span>
              <span className="block text-xs text-faint">{p.blocks.reduce((s, b) => s + b.items.length, 0)} esercizi</span>
            </span>
            <ChevronRight className="size-4 text-faint" />
          </button>
        ))}
        <button type="button" onClick={() => start(null)} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-line px-3 py-3 text-left text-muted hover:bg-surface-2">
          <Plus className="size-4" />
          <span className="text-sm">Allenamento libero</span>
        </button>
      </div>
    </Sheet>
  )
}
