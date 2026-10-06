import { Activity } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { EmptyState, SectionTitle } from '../../../components/ui/Card'
import { Segmented } from '../../../components/ui/Segmented'
import { PageLoader } from '../../../components/ui/Spinner'
import { useSessions } from '../api'
import { SessionRow } from '../components/SessionRow'
import { addDays, weekLabel, weekStart } from '../format'
import type { SessionKind } from '../types'

type Filter = 'all' | SessionKind

export function ActivitiesPage() {
  const [days, setDays] = useState(90)
  const [filter, setFilter] = useState<Filter>('all')
  const [range] = useState(() => ({ to: addDays(new Date(), 1) }))
  const from = addDays(range.to, -days)
  const { data: sessions = [], isLoading } = useSessions(from.toISOString(), range.to.toISOString())

  const weeks = useMemo(() => {
    const map = new Map<number, typeof sessions>()
    for (const s of sessions.filter((x) => filter === 'all' || x.kind === filter)) {
      const k = weekStart(new Date(s.started_at)).getTime()
      map.set(k, [...(map.get(k) ?? []), s])
    }
    return [...map]
  }, [sessions, filter])

  return (
    <div className="space-y-4">
      <Segmented
        className="w-full"
        size="sm"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Tutte' },
          { value: 'strength', label: 'Palestra' },
          { value: 'run', label: 'Corsa' },
          { value: 'swim', label: 'Nuoto' },
          { value: 'other', label: 'Altro' },
        ]}
      />
      {isLoading ? (
        <PageLoader />
      ) : weeks.length ? (
        weeks.map(([k, list]) => (
          <section key={k}>
            <SectionTitle>{weekLabel(new Date(k))}</SectionTitle>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {list.map((s) => (
                <SessionRow key={s.id} s={s} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState icon={<Activity className="size-6" />} title="Nessuna attività nel periodo" />
      )}
      <Button variant="ghost" className="w-full" onClick={() => setDays(days + 90)}>
        Mostra attività più vecchie
      </Button>
    </div>
  )
}
