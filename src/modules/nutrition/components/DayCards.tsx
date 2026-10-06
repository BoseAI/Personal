import { Droplet, Flame, Minus, Plus } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import type { DailyTargets, DayTotals, Evaluation } from '../targets'
import { MACRO_COLORS } from '../types'
import { Ring } from './Ring'

const scoreColor = (s: number) => (s >= 85 ? 'var(--positive)' : s >= 70 ? '#c6f432' : s >= 50 ? 'var(--warning)' : 'var(--negative)')

export function EvaluationCard({ evaluation, partial }: { evaluation: Evaluation; partial: boolean }) {
  const color = scoreColor(evaluation.score)
  return (
    <Card className="flex items-center gap-4 p-4">
      <Ring value={evaluation.score / 100} color={color} size={96} stroke={9}>
        <span className="num text-2xl font-semibold">{evaluation.score}</span>
        <span className="text-[9px] tracking-wider text-faint uppercase">{partial ? 'parziale' : 'su 100'}</span>
      </Ring>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-semibold">{evaluation.verdict}</p>
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-surface-3">
          {evaluation.parts.map((p) => (
            <div key={p.label} title={`${p.label} ${Math.round(p.score)}/${p.max}`} style={{ width: `${p.max}%` }} className="h-full bg-surface-2">
              <div className="h-full" style={{ width: `${(p.score / p.max) * 100}%`, background: color }} />
            </div>
          ))}
        </div>
        <ul className="space-y-0.5 text-xs text-muted">
          {evaluation.tips.slice(0, 3).map((t) => (
            <li key={t}>• {t}</li>
          ))}
          {!evaluation.tips.length && <li>Obiettivi centrati 👏</li>}
        </ul>
      </div>
    </Card>
  )
}

export function EnergyCard({ targets, totals }: { targets: DailyTargets; totals: DayTotals }) {
  const left = Math.round(targets.kcal - totals.kcal)
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Ring value={totals.kcal / targets.kcal} color={left < 0 ? 'var(--negative)' : '#f472b6'} size={110} stroke={10}>
          <span className="num text-xl font-semibold">{Math.round(totals.kcal)}</span>
          <span className="num text-[10px] text-faint">/ {targets.kcal} kcal</span>
        </Ring>
        <div className="flex-1 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{left >= 0 ? 'Disponibili' : 'In eccesso'}</span>
            <span className={cn('num font-semibold', left < 0 && 'text-negative')}>{Math.abs(left)} kcal</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-faint">Base</span>
            <span className="num text-muted">{targets.base.kcal} kcal</span>
          </div>
          {targets.burned > 0 && (
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-1 text-faint">
                <Flame className="size-3 text-[#fb923c]" /> Allenamento
              </span>
              <span className="num text-muted">+{targets.burned} kcal</span>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Macro label="Proteine" value={totals.protein} target={targets.protein} color={MACRO_COLORS.protein} />
        <Macro label="Carboidrati" value={totals.carbs} target={targets.carbs} color={MACRO_COLORS.carbs} />
        <Macro label="Grassi" value={totals.fat} target={targets.fat} color={MACRO_COLORS.fat} />
      </div>
    </Card>
  )
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (value / Math.max(target, 1)) * 100)}%`, background: color }} />
      </div>
      <div className="num text-xs">
        {Math.round(value)}
        <span className="text-faint">/{target} g</span>
      </div>
    </div>
  )
}

export function WaterCard({ ml, target, onAdd, busy }: { ml: number; target: number; onAdd: (ml: number) => void; busy: boolean }) {
  const glasses = Math.ceil(target / 250)
  const full = Math.floor(ml / 250)
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplet className="size-4 text-[#3987e5]" />
          <span className="text-sm font-medium">Acqua</span>
        </div>
        <span className="num text-sm">
          {(ml / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })}
          <span className="text-faint"> / {(target / 1000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} L</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: Math.max(glasses, full) }, (_, i) => (
          <div key={i} className={cn('h-7 w-5 rounded-b-md rounded-t-sm border', i < full ? 'border-[#3987e5] bg-[#3987e5]/70' : 'border-line bg-surface-2')} />
        ))}
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
        <button type="button" disabled={busy || ml <= 0} onClick={() => onAdd(-250)} aria-label="Togli 250 ml" className="flex size-10 items-center justify-center rounded-xl border border-line text-muted disabled:opacity-30">
          <Minus className="size-4" />
        </button>
        <button type="button" disabled={busy} onClick={() => onAdd(250)} className="flex h-10 items-center justify-center gap-1 rounded-xl bg-[#3987e5]/15 text-sm font-medium text-[#6aa8f0]">
          <Plus className="size-4" /> Bicchiere 250 ml
        </button>
        <button type="button" disabled={busy} onClick={() => onAdd(500)} className="flex h-10 items-center justify-center gap-1 rounded-xl bg-[#3987e5]/15 text-sm font-medium text-[#6aa8f0]">
          <Plus className="size-4" /> Bottiglia 500 ml
        </button>
      </div>
    </Card>
  )
}
