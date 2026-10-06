import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDistance, formatDuration, formatPace, formatSessionDate } from '../format'
import type { WorkoutSession } from '../types'
import { SessionIcon } from './SessionIcon'

export function SessionRow({ s, extra }: { s: WorkoutSession; extra?: string }) {
  const details = [formatDistance(s), formatDuration(s.duration_sec), formatPace(s), extra].filter(Boolean).join(' · ')
  return (
    <Link to={`/allenamento/attivita/${s.id}`} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-surface-2">
      <SessionIcon kind={s.kind} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{s.name}</div>
        <div className="num truncate text-xs text-faint">{formatSessionDate(s.started_at)}</div>
      </div>
      <span className="num shrink-0 text-right text-xs text-muted">{details}</span>
      <ChevronRight className="size-4 shrink-0 text-faint" />
    </Link>
  )
}
