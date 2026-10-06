import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { monthKeys, monthShort } from '../../../lib/dates'
import { formatEUR, formatEURCompact } from '../../../lib/format'

type Row = { month: string; income: number; expense: number }

/** Entrate vs uscite per mese: barre affiancate, un solo asse. */
export function TrendChart({ data, from, to }: { data: Row[]; from: string; to: string }) {
  const byMonth = new Map(data.map((r) => [r.month, r]))
  const rows = monthKeys(from, to).map((m) => ({
    month: m,
    label: monthShort(m),
    income: byMonth.get(m)?.income ?? 0,
    expense: byMonth.get(m)?.expense ?? 0,
  }))

  return (
    <div>
      <div className="mb-2 flex gap-4 px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: 'var(--series-income)' }} />
          Entrate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: 'var(--series-expense)' }} />
          Uscite
        </span>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} barGap={2} barCategoryGap="22%" margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-faint)', fontSize: 10 }} interval={0} />
            <YAxis
              width={44}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickFormatter={(v: number) => formatEURCompact(v)}
            />
            <Tooltip
              cursor={{ fill: 'var(--surface-2)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const r = payload[0].payload as (typeof rows)[number]
                return (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-xl">
                    <div className="mb-1 font-medium">{r.label}</div>
                    <div className="num flex justify-between gap-4 text-muted">
                      <span>Entrate</span>
                      <span className="text-fg">{formatEUR(r.income)}</span>
                    </div>
                    <div className="num flex justify-between gap-4 text-muted">
                      <span>Uscite</span>
                      <span className="text-fg">{formatEUR(r.expense)}</span>
                    </div>
                    <div className="num mt-1 flex justify-between gap-4 border-t border-line pt-1 text-muted">
                      <span>Netto</span>
                      <span className="text-fg">{formatEUR(r.income - r.expense)}</span>
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="income" fill="var(--series-income)" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            <Bar dataKey="expense" fill="var(--series-expense)" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
