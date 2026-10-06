import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type Point = { label: string; value: number; sub?: string }

const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--text-faint)', fontSize: 10 } } as const

function Tip({ active, payload, unit }: { active?: boolean; payload?: { payload: Point }[]; unit: string }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{p.label}</div>
      <div className="num text-muted">
        <span className="text-fg">{p.value.toLocaleString('it-IT', { maximumFractionDigits: 1 })}</span> {unit}
      </div>
      {p.sub && <div className="text-faint">{p.sub}</div>}
    </div>
  )
}

/** Andamento di una misura nel tempo (una sola serie, un solo asse). */
export function ProgressLine({ data, unit, color }: { data: Point[]; unit: string; color: string }) {
  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} minTickGap={20} />
          <YAxis width={36} {...axis} domain={['auto', 'auto']} tick={{ ...axis.tick, fontFamily: 'JetBrains Mono' }} />
          <Tooltip cursor={{ stroke: 'var(--border-strong)' }} content={<Tip unit={unit} />} />
          <Line dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WeeklyBars({ data, unit, color }: { data: Point[]; unit: string; color: string }) {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} interval={1} />
          <YAxis width={36} {...axis} tick={{ ...axis.tick, fontFamily: 'JetBrains Mono' }} />
          <Tooltip cursor={{ fill: 'var(--surface-2)' }} content={<Tip unit={unit} />} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
