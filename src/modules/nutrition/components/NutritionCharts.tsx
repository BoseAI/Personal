import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'

const axis = { tickLine: false, axisLine: false, tick: { fill: 'var(--text-faint)', fontSize: 10 } } as const

export type WeightPoint = { label: string; weight: number | null; trend: number }

/** Pesate (punti) e media mobile 7 giorni (linea), un solo asse in kg. */
export function WeightChart({ data, goal }: { data: WeightPoint[]; goal: number | null }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} minTickGap={24} />
          <YAxis width={36} {...axis} domain={['dataMin - 1', 'dataMax + 1']} tick={{ ...axis.tick, fontFamily: 'JetBrains Mono' }} tickFormatter={(v: number) => v.toFixed(0)} />
          {goal && <ReferenceLine y={goal} stroke="var(--positive)" strokeDasharray="4 4" label={{ value: `obiettivo ${goal}`, fill: 'var(--text-faint)', fontSize: 10, position: 'insideTopRight' }} />}
          <Tooltip
            cursor={{ stroke: 'var(--border-strong)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as WeightPoint
              return (
                <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                  <div className="font-medium">{p.label}</div>
                  {p.weight !== null && <div className="num text-muted">Pesata <span className="text-fg">{p.weight.toFixed(1)} kg</span></div>}
                  <div className="num text-muted">Tendenza <span className="text-fg">{p.trend.toFixed(1)} kg</span></div>
                </div>
              )
            }}
          />
          <Scatter dataKey="weight" fill="var(--text-faint)" shape="circle" isAnimationActive={false} />
          <Line dataKey="trend" stroke="#f472b6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export type KcalPoint = { label: string; kcal: number; target: number }

export function KcalWeekChart({ data, target }: { data: KcalPoint[]; target: number }) {
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" {...axis} />
          <YAxis width={36} {...axis} tick={{ ...axis.tick, fontFamily: 'JetBrains Mono' }} />
          <ReferenceLine y={target} stroke="var(--text-faint)" strokeDasharray="4 4" />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const p = payload[0].payload as KcalPoint
              return (
                <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                  <div className="font-medium">{p.label}</div>
                  <div className="num text-muted">
                    <span className="text-fg">{Math.round(p.kcal)}</span> / {p.target} kcal
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="kcal" fill="#f472b6" radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
