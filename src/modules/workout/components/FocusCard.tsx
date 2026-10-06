import { Card } from '../../../components/ui/Card'
import type { FocusRow } from '../exercises'
import { MUSCLES } from '../muscles'

/** Su cosa si concentra la scheda (o la settimana): quota per gruppo e muscoli principali. */
export function FocusCard({ rows, title, empty }: { rows: FocusRow[]; title: string; empty: string }) {
  if (!rows.length)
    return (
      <Card className="p-4">
        <p className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{title}</p>
        <p className="mt-2 text-sm text-muted">{empty}</p>
      </Card>
    )
  const top = rows[0]
  return (
    <Card className="space-y-3 p-4">
      <div>
        <p className="font-mono text-[10px] tracking-[0.12em] text-faint uppercase">{title}</p>
        <p className="mt-1 text-sm">
          Focus principale: <span className="font-semibold" style={{ color: top.color }}>{top.group}</span>
          {rows[1] && (
            <>
              , poi <span className="font-medium">{rows[1].group}</span>
            </>
          )}
        </p>
      </div>
      {/* Barra unica con le quote dei gruppi, separate da uno spazio */}
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {rows.map((r) => (
          <div key={r.group} style={{ width: `${r.share * 100}%`, background: r.color }} title={`${r.group} ${Math.round(r.share * 100)}%`} />
        ))}
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.group} className="flex items-start gap-2 text-xs">
            <span className="mt-1 size-2 shrink-0 rounded-sm" style={{ background: r.color }} />
            <span className="w-16 shrink-0 font-medium">{r.group}</span>
            <span className="num w-9 shrink-0 text-right text-muted">{Math.round(r.share * 100)}%</span>
            <span className="min-w-0 flex-1 text-faint">
              {r.muscles
                .slice(0, 4)
                .map((m) => MUSCLES[m.muscle].label)
                .join(' · ')}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
