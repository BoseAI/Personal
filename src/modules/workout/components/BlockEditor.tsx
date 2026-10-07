import { ArrowDown, ArrowUp, Link2, Plus, Trash2, Unlink } from 'lucide-react'
import { IconButton } from '../../../components/ui/Button'
import { Select } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { cn } from '../../../lib/cn'
import type { Exercise } from '../catalog'
import { findExercise } from '../exercises'
import { MEASURE_INFO } from '../measures'
import { BLOCK_LABELS, SET_TYPE_LABELS, type BlockKind, type PlanBlock, type PlanItem, type SetType } from '../types'
import { MuscleTags } from './MuscleTags'

const numberField =
  'num h-9 w-full rounded-lg border border-line bg-surface-2 px-2 text-center text-sm outline-none focus:border-line-strong'

export function BlockEditor({
  block,
  index,
  count,
  exercises,
  onChange,
  onRemove,
  onMove,
  onLinkNext,
  onSplit,
  onAddExercise,
}: {
  block: PlanBlock
  index: number
  count: number
  exercises: Exercise[]
  onChange: (b: PlanBlock) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onLinkNext: () => void
  onSplit: () => void
  onAddExercise: () => void
}) {
  const grouped = block.kind !== 'single'
  const setItem = (id: string, patch: Partial<PlanItem>) =>
    onChange({ ...block, items: block.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) })
  const removeItem = (id: string) => {
    const items = block.items.filter((it) => it.id !== id)
    if (!items.length) onRemove()
    else onChange({ ...block, items, kind: items.length === 1 ? 'single' : block.kind })
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-surface', grouped ? 'border-accent/40' : 'border-line')}>
      <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
        <span className="num w-6 text-center text-xs text-faint">{index + 1}</span>
        {block.items.length > 1 ? (
          <Segmented
            size="sm"
            value={block.kind}
            onChange={(k: BlockKind) => onChange({ ...block, kind: k, rounds: k === 'circuit' ? Math.max(block.rounds, 3) : block.rounds })}
            options={(['superset', 'circuit'] as BlockKind[]).map((k) => ({ value: k, label: BLOCK_LABELS[k].label }))}
          />
        ) : (
          <span className="text-xs text-muted">{BLOCK_LABELS.single.label}</span>
        )}
        <span className="flex-1" />
        <IconButton label="Su" disabled={index === 0} onClick={() => onMove(-1)} className="size-8">
          <ArrowUp className="size-4" />
        </IconButton>
        <IconButton label="Giù" disabled={index === count - 1} onClick={() => onMove(1)} className="size-8">
          <ArrowDown className="size-4" />
        </IconButton>
        {grouped ? (
          <IconButton label="Separa gli esercizi" onClick={onSplit} className="size-8">
            <Unlink className="size-4" />
          </IconButton>
        ) : (
          <IconButton label="Collega al successivo (superserie)" disabled={index === count - 1} onClick={onLinkNext} className="size-8">
            <Link2 className="size-4" />
          </IconButton>
        )}
        <IconButton label="Elimina blocco" onClick={onRemove} className="size-8 hover:text-negative">
          <Trash2 className="size-4" />
        </IconButton>
      </div>

      {grouped && (
        <div className="grid grid-cols-2 gap-2 border-b border-line bg-surface-2/40 px-3 py-2 text-xs">
          {block.kind === 'circuit' && (
            <label className="space-y-1">
              <span className="text-faint">Giri</span>
              <input
                inputMode="numeric"
                className={numberField}
                value={block.rounds}
                onChange={(e) => onChange({ ...block, rounds: clampInt(e.target.value, 1, 50) })}
              />
            </label>
          )}
          <label className="space-y-1">
            <span className="text-faint">Recupero a fine giro (s)</span>
            <input inputMode="numeric" className={numberField} value={block.restSec} onChange={(e) => onChange({ ...block, restSec: clampInt(e.target.value, 0, 900) })} />
          </label>
          <p className="col-span-2 text-faint">{BLOCK_LABELS[block.kind].hint}</p>
        </div>
      )}

      <div className="divide-y divide-line">
        {block.items.map((it, i) => {
          const ex = findExercise(it.exerciseKey, exercises)
          const measure = ex?.measure ?? 'reps'
          const withKg = measure === 'reps' || measure === 'distance'
          return (
            <div key={it.id} className="space-y-2 px-3 py-3">
              <div className="flex items-start gap-2">
                {grouped && <span className="num mt-0.5 text-xs font-semibold text-accent">{String.fromCharCode(65 + i)}</span>}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-sm font-medium">{it.exerciseName}</div>
                  {ex && <MuscleTags exercise={ex} />}
                </div>
                <IconButton label="Rimuovi esercizio" onClick={() => removeItem(it.id)} className="size-7">
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
              <div className={cn('grid gap-2 text-xs', block.kind === 'single' ? 'grid-cols-4' : 'grid-cols-3')}>
                {block.kind !== 'circuit' && (
                  <label className="space-y-1">
                    <span className="text-faint">Serie</span>
                    <input inputMode="numeric" className={numberField} value={it.sets} onChange={(e) => setItem(it.id, { sets: clampInt(e.target.value, 1, 20) })} />
                  </label>
                )}
                <label className="space-y-1">
                  <span className="text-faint">{MEASURE_INFO[measure].target}</span>
                  <input
                    className={numberField}
                    value={it.reps}
                    placeholder={MEASURE_INFO[measure].defaultTarget}
                    onChange={(e) => setItem(it.id, { reps: e.target.value.slice(0, 12) })}
                  />
                </label>
                {withKg ? (
                  <label className="space-y-1">
                    <span className="text-faint">Carico kg</span>
                    <input
                      inputMode="decimal"
                      className={numberField}
                      value={it.weightKg ?? ''}
                      placeholder="—"
                      onChange={(e) => setItem(it.id, { weightKg: parseDecimal(e.target.value) })}
                    />
                  </label>
                ) : (
                  <span className="space-y-1">
                    <span className="block text-faint">Misura</span>
                    <span className="flex h-9 items-center justify-center rounded-lg border border-dashed border-line text-faint">{MEASURE_INFO[measure].label}</span>
                  </span>
                )}
                {block.kind === 'single' && (
                  <label className="space-y-1">
                    <span className="text-faint">Recupero s</span>
                    <input inputMode="numeric" className={numberField} value={it.restSec} onChange={(e) => setItem(it.id, { restSec: clampInt(e.target.value, 0, 900) })} />
                  </label>
                )}
                {block.kind === 'circuit' && <span />}
              </div>
              <Select
                value={it.setType}
                onChange={(e) => setItem(it.id, { setType: e.target.value as SetType })}
                className="h-9 text-xs"
                aria-label="Tipo di serie"
              >
                {(Object.keys(SET_TYPE_LABELS) as SetType[]).map((t) => (
                  <option key={t} value={t}>
                    {SET_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          )
        })}
      </div>
      {grouped && (
        <button type="button" onClick={onAddExercise} className="flex w-full items-center justify-center gap-1 border-t border-line py-2.5 text-xs text-muted hover:bg-surface-2">
          <Plus className="size-3.5" /> Esercizio nel blocco
        </button>
      )}
    </div>
  )
}

export function clampInt(v: string, min: number, max: number): number {
  const n = parseInt(v.replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min
}

export function parseDecimal(v: string): number | null {
  const s = v.replace(',', '.').replace(/[^\d.]/g, '')
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}
