import { Activity, Dumbbell, Footprints, Waves } from 'lucide-react'
import { tint } from '../../../lib/colors'
import type { SessionKind } from '../types'

export const SESSION_COLORS: Record<SessionKind, string> = {
  strength: '#fb923c',
  run: '#3987e5',
  swim: '#2dd4bf',
  other: '#9085e9',
}

const ICONS = { strength: Dumbbell, run: Footprints, swim: Waves, other: Activity }

export function SessionIcon({ kind, size = 'md' }: { kind: SessionKind; size?: 'sm' | 'md' }) {
  const Icon = ICONS[kind]
  const c = SESSION_COLORS[kind]
  return (
    <span className={size === 'sm' ? 'flex size-7 items-center justify-center rounded-lg' : 'flex size-10 items-center justify-center rounded-xl'} style={{ background: tint(c, 0.16), color: c }}>
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-5'} strokeWidth={1.75} />
    </span>
  )
}
