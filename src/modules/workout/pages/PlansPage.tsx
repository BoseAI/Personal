import { ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/Card'
import { ErrorText } from '../../../components/ui/Field'
import { PageLoader } from '../../../components/ui/Spinner'
import { errorMessage } from '../../../lib/supabase'
import { useCustomExercises, usePlans, useSavePlan } from '../api'
import { allExercises, planFocus } from '../exercises'

export function PlansPage() {
  const navigate = useNavigate()
  const { data: plans = [], isLoading } = usePlans()
  const { data: custom = [] } = useCustomExercises()
  const exercises = useMemo(() => allExercises(custom), [custom])
  const save = useSavePlan()
  const [error, setError] = useState<string | null>(null)

  async function create() {
    const name = prompt('Nome della scheda', `Scheda ${String.fromCharCode(65 + plans.length)}`)
    if (!name?.trim()) return
    try {
      const p = await save.mutateAsync({ name: name.trim(), blocks: [], sort_order: plans.length })
      navigate(`/allenamento/schede/${p.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-3">
      {plans.length === 0 && (
        <EmptyState icon={<ClipboardList className="size-6" />} title="Nessuna scheda">
          Crea la prima scheda e aggiungi gli esercizi dal catalogo.
        </EmptyState>
      )}
      {plans.map((p) => {
        const focus = planFocus(p.blocks, exercises)
        const count = p.blocks.reduce((s, b) => s + b.items.length, 0)
        return (
          <Link key={p.id} to={`/allenamento/schede/${p.id}`} className="block space-y-2.5 rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong">
            <div className="flex items-center gap-2">
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="text-xs text-faint">{count} esercizi</span>
              <ChevronRight className="size-4 text-faint" />
            </div>
            {focus.length > 0 && (
              <>
                <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                  {focus.map((f) => (
                    <div key={f.group} style={{ width: `${f.share * 100}%`, background: f.color }} />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                  {focus.slice(0, 4).map((f) => (
                    <span key={f.group} className="flex items-center gap-1">
                      <span className="size-1.5 rounded-full" style={{ background: f.color }} />
                      {f.group} {Math.round(f.share * 100)}%
                    </span>
                  ))}
                </div>
              </>
            )}
          </Link>
        )
      })}
      <Button className="w-full" onClick={create} loading={save.isPending}>
        <Plus className="size-4" /> Nuova scheda
      </Button>
      <ErrorText error={error} />
    </div>
  )
}
