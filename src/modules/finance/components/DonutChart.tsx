import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { formatEUR } from '../../../lib/format'

export type Slice = { id: string; name: string; value: number; color: string }

/** Ciambella delle categorie: il totale al centro, la fetta selezionata in evidenza. */
export function DonutChart({
  slices,
  selected,
  onSelect,
  centerLabel,
}: {
  slices: Slice[]
  selected: string | null
  onSelect: (id: string | null) => void
  centerLabel: string
}) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const sel = slices.find((s) => s.id === selected)

  return (
    <div className="relative mx-auto aspect-square w-full max-w-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="100%"
            paddingAngle={slices.length > 1 ? 1.5 : 0}
            cornerRadius={4}
            stroke="var(--surface)"
            strokeWidth={2}
            startAngle={90}
            endAngle={-270}
            isAnimationActive={false}
            onClick={(_, i) => onSelect(slices[i].id === selected ? null : slices[i].id)}
          >
            {slices.map((s) => (
              <Cell key={s.id} fill={s.color} opacity={selected && selected !== s.id ? 0.3 : 1} className="cursor-pointer outline-none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="max-w-[60%] truncate font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{sel ? sel.name : centerLabel}</span>
        <span className="num mt-1 text-xl font-semibold">{formatEUR(sel ? sel.value : total)}</span>
        {sel && total > 0 && <span className="num text-xs text-muted">{Math.round((sel.value / total) * 100)}%</span>}
      </div>
    </div>
  )
}
