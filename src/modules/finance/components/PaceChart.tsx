import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatEUR, formatEURCompact } from '../../../lib/format'

export type PacePoint = { label: string; current: number | null; previous: number | null }

/** Spesa cumulata del periodo vs periodo precedente: un solo asse, due linee. */
export function PaceChart({ data, currentLabel, previousLabel }: { data: PacePoint[]; currentLabel: string; previousLabel: string }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full" style={{ background: 'var(--series-expense)' }} />
          {currentLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full border-t-2 border-dashed" style={{ borderColor: 'var(--text-faint)' }} />
          {previousLabel}
        </span>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-faint)', fontSize: 10 }} minTickGap={16} />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(v: number) => formatEURCompact(v)}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border-strong)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0].payload as PacePoint
                return (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                    <div className="mb-1 font-medium">{p.label}</div>
                    {p.current !== null && (
                      <div className="num flex justify-between gap-4 text-muted">
                        <span>{currentLabel}</span>
                        <span className="text-fg">{formatEUR(p.current)}</span>
                      </div>
                    )}
                    {p.previous !== null && (
                      <div className="num flex justify-between gap-4 text-muted">
                        <span>{previousLabel}</span>
                        <span className="text-fg">{formatEUR(p.previous)}</span>
                      </div>
                    )}
                  </div>
                )
              }}
            />
            <Line dataKey="previous" stroke="var(--text-faint)" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} connectNulls={false} />
            <Line dataKey="current" stroke="var(--series-expense)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
