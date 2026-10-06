import { cn } from '../../../lib/cn'
import type { Exercise } from '../catalog'
import { GROUP_COLORS, MUSCLES } from '../muscles'

/** Muscoli allenati: primari pieni, secondari tenui. */
export function MuscleTags({ exercise, className }: { exercise: Exercise; className?: string }) {
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {exercise.primary.map((m) => (
        <span
          key={m}
          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
          style={{ background: `${GROUP_COLORS[MUSCLES[m].group]}26`, color: GROUP_COLORS[MUSCLES[m].group] }}
        >
          {MUSCLES[m].label}
        </span>
      ))}
      {exercise.secondary.map((m) => (
        <span key={m} className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-faint">
          {MUSCLES[m].label}
        </span>
      ))}
    </span>
  )
}
