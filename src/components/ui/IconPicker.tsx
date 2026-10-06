import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ICON_GROUPS, ICONS } from '../../lib/icons'
import { SWATCHES, tint } from '../../lib/colors'
import { cn } from '../../lib/cn'

export function IconPicker({
  value,
  color,
  onChange,
  preferGroups = [],
}: {
  value: string
  color: string
  onChange: (icon: string) => void
  /** Gruppi da mostrare per primi (es. ['Spesa e cibo']). */
  preferGroups?: string[]
}) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return [...ICON_GROUPS].sort((a, b) => Number(preferGroups.includes(b.label)) - Number(preferGroups.includes(a.label)))
    return [{ label: 'Risultati', icons: Object.keys(ICONS).filter((n) => n.includes(s)) }]
  }, [q, preferGroups])

  return (
    <div className="rounded-xl border border-line bg-surface-2">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <Search className="size-4 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca icona (inglese: car, home…)"
          className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-faint"
        />
      </div>
      <div className="max-h-56 space-y-3 overflow-y-auto p-3">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-1.5 font-mono text-[10px] tracking-widest text-faint uppercase">{g.label}</p>
            <div className="grid grid-cols-8 gap-1">
              {g.icons.map((name) => {
                const Icon = ICONS[name]
                const active = name === value
                return (
                  <button
                    key={name}
                    type="button"
                    title={name}
                    onClick={() => onChange(name)}
                    className={cn('flex aspect-square items-center justify-center rounded-lg transition', !active && 'text-muted hover:bg-surface-3')}
                    style={active ? { background: tint(color, 0.22), color, outline: `1.5px solid ${color}` } : undefined}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {groups[0].icons.length === 0 && <p className="py-4 text-center text-xs text-faint">Nessuna icona trovata</p>}
      </div>
    </div>
  )
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c}
          onClick={() => onChange(c)}
          className={cn('size-8 rounded-full transition', value.toLowerCase() === c ? 'ring-2 ring-fg ring-offset-2 ring-offset-surface' : 'hover:scale-110')}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}
