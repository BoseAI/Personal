import { Check, Minus, Plus, Timer, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button, IconButton } from '../../../components/ui/Button'
import { ErrorText } from '../../../components/ui/Field'
import { cn } from '../../../lib/cn'
import { errorMessage } from '../../../lib/supabase'
import { useCustomExercises, useLastSets, useSaveSession } from '../api'
import { parseDecimal } from '../components/BlockEditor'
import { ExercisePicker } from '../components/ExercisePicker'
import { MuscleTags } from '../components/MuscleTags'
import { RestTimer } from '../components/RestTimer'
import { allExercises, findExercise, uid } from '../exercises'
import { liveItem, setLiveSession, updateLiveSession, useLiveSession, type LiveBlock, type LiveItem, type LiveSession, type LiveSet } from '../live'
import { MEASURE_INFO, formatSet } from '../measures'
import { BLOCK_LABELS, SET_TYPE_LABELS, type WorkoutSet } from '../types'

export function LivePage() {
  const session = useLiveSession()
  if (!session) return <Navigate to="/allenamento" replace />
  return <Live session={session} />
}

function Live({ session }: { session: LiveSession }) {
  const navigate = useNavigate()
  const save = useSaveSession()
  const { data: custom = [] } = useCustomExercises()
  const exercises = useMemo(() => allExercises(custom), [custom])
  const keys = useMemo(() => session.blocks.flatMap((b) => b.items.map((i) => i.exerciseKey)), [session.blocks])
  const { data: last } = useLastSets(keys)
  const [rest, setRest] = useState<{ endsAt: number; total: number } | null>(null)
  const [picker, setPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const elapsed = useElapsed(session.startedAt)

  // Precompila i carichi vuoti con quelli dell'ultima volta (una volta per esercizio).
  useEffect(() => {
    if (!last) return
    const pending = session.blocks.some((b) => b.items.some((it) => !it.prefilled && last.has(it.exerciseKey)))
    if (!pending) return
    updateLiveSession((s) => ({
      ...s,
      blocks: s.blocks.map((b) => ({
        ...b,
        items: b.items.map((it) => {
          const prev = last.get(it.exerciseKey)
          if (it.prefilled || !prev) return it
          return {
            ...it,
            prefilled: true,
            sets: it.sets.map((st, i) => {
              const p = prev[Math.min(i, prev.length - 1)]
              return { ...st, weight: st.weight ?? p.weight_kg, reps: st.reps ?? p.reps, duration: st.duration ?? p.duration_sec, distance: st.distance ?? p.distance_m }
            }),
          }
        }),
      })),
    }))
  }, [last, session.blocks])

  const patchItem = (blockId: string, itemId: string, fn: (it: LiveItem) => LiveItem) =>
    updateLiveSession((s) => ({
      ...s,
      blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, items: b.items.map((it) => (it.id === itemId ? fn(it) : it)) } : b)),
    }))

  function toggleSet(block: LiveBlock, item: LiveItem, index: number) {
    const done = !item.sets[index].done
    patchItem(block.id, item.id, (it) => ({ ...it, sets: it.sets.map((s, i) => (i === index ? { ...s, done } : s)) }))
    if (!done) return
    // Recupero: dopo ogni serie se singolo; a fine giro se superserie/circuito.
    const isLastOfRound = block.items[block.items.length - 1].id === item.id
    const secs = block.kind === 'single' ? item.restSec : isLastOfRound ? block.restSec : 0
    if (secs > 0) setRest({ endsAt: Date.now() + secs * 1000, total: secs })
  }

  const doneSets = session.blocks.flatMap((b) => b.items.flatMap((it) => it.sets.filter((s) => s.done)))
  const volume = session.blocks
    .flatMap((b) => b.items.filter((it) => it.measure === 'reps').flatMap((it) => it.sets.filter((s) => s.done)))
    .reduce((s, x) => s + (x.weight ?? 0) * (x.reps ?? 0), 0)

  async function finish() {
    if (!doneSets.length) {
      if (confirm('Nessuna serie completata. Annullare l\'allenamento?')) setLiveSession(null)
      return
    }
    if (!confirm('Terminare e salvare l\'allenamento?')) return
    try {
      const sets = session.blocks.flatMap((b, bi) =>
        b.items.flatMap((it) =>
          it.sets
            .map((s, si) => ({ s, si }))
            .filter(({ s }) => s.done)
            .map(({ s, si }) => ({
              exercise_key: it.exerciseKey,
              exercise_name: it.exerciseName,
              block_index: bi,
              set_index: si,
              weight_kg: s.weight,
              reps: it.measure === 'reps' ? s.reps : null,
              duration_sec: it.measure === 'time' || it.measure === 'cardio' ? s.duration : null,
              distance_m: it.measure === 'distance' || it.measure === 'cardio' ? s.distance : null,
            })),
        ),
      )
      const saved = await save.mutateAsync({
        session: {
          kind: 'strength',
          plan_id: session.planId,
          name: session.name,
          started_at: session.startedAt,
          duration_sec: Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000),
          distance_m: null,
          avg_hr: null,
          rpe: null,
          notes: null,
        },
        sets,
      })
      setLiveSession(null)
      navigate(`/allenamento/attivita/${saved.id}`, { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] tracking-[0.14em] text-accent uppercase">In corso · {elapsed}</p>
          <h1 className="truncate text-xl font-semibold">{session.name}</h1>
        </div>
        <IconButton
          label="Annulla allenamento"
          onClick={() => confirm('Annullare l\'allenamento? Le serie inserite andranno perse.') && setLiveSession(null)}
        >
          <X className="size-5" />
        </IconButton>
      </div>

      <div className="num flex gap-4 text-xs text-muted">
        <span>{doneSets.length} serie fatte</span>
        <span>{Math.round(volume).toLocaleString('it-IT')} kg di volume</span>
      </div>

      {session.blocks.map((b) => (
        <div key={b.id} className={cn('overflow-hidden rounded-2xl border bg-surface', b.kind === 'single' ? 'border-line' : 'border-accent/40')}>
          {b.kind !== 'single' && (
            <div className="flex items-center justify-between border-b border-line bg-surface-2/40 px-3 py-1.5 text-xs">
              <span className="font-medium text-accent">{BLOCK_LABELS[b.kind].label}</span>
              <span className="text-faint">recupero {b.restSec}s a fine giro</span>
            </div>
          )}
          <div className="divide-y divide-line">
            {b.items.map((it, ii) => {
              const ex = findExercise(it.exerciseKey, exercises)
              const prev = last?.get(it.exerciseKey)
              return (
                <div key={it.id} className="space-y-2 px-3 py-3">
                  <div className="flex items-start gap-2">
                    {b.kind !== 'single' && <span className="num mt-0.5 text-xs font-semibold text-accent">{String.fromCharCode(65 + ii)}</span>}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-sm font-medium">{it.exerciseName}</div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-faint">
                        <span>
                          obiettivo {it.targetReps} {MEASURE_INFO[it.measure].targetUnit}
                        </span>
                        {b.kind === 'single' && it.restSec > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Timer className="size-3" /> {it.restSec}s
                          </span>
                        )}
                        {it.setType !== 'normal' && <span className="text-warning">{SET_TYPE_LABELS[it.setType]}</span>}
                      </div>
                      {ex && <MuscleTags exercise={ex} />}
                    </div>
                  </div>
                  <SetTable
                    item={it}
                    prev={prev}
                    onChange={(si, patch) => patchItem(b.id, it.id, (x) => ({ ...x, sets: x.sets.map((y, i) => (i === si ? { ...y, ...patch } : y)) }))}
                    onToggle={(si) => toggleSet(b, it, si)}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        patchItem(b.id, it.id, (x) => ({
                          ...x,
                          sets: [...x.sets, { ...(x.sets[x.sets.length - 1] ?? { weight: null, reps: null, duration: null, distance: null }), done: false }],
                        }))
                      }
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-muted hover:bg-surface-2"
                    >
                      <Plus className="size-3.5" /> Serie
                    </button>
                    {it.sets.length > 1 && (
                      <button
                        type="button"
                        onClick={() => patchItem(b.id, it.id, (x) => ({ ...x, sets: x.sets.slice(0, -1) }))}
                        className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs text-muted hover:bg-surface-2"
                      >
                        <Minus className="size-3.5" /> Serie
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <Button className="w-full" onClick={() => setPicker(true)}>
        <Plus className="size-4" /> Aggiungi esercizio
      </Button>
      <ErrorText error={error} />

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-line bg-bg/90 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-2.5">
          <Button variant="primary" className="w-full" loading={save.isPending} onClick={finish}>
            Termina allenamento
          </Button>
        </div>
      </div>

      {rest && <RestTimerBar rest={rest} setRest={setRest} />}

      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(list) =>
          updateLiveSession((s) => ({
            ...s,
            blocks: [...s.blocks, ...list.map((e) => ({ id: uid(), kind: 'single' as const, restSec: 90, items: [liveItem(e, e.measure === 'cardio' ? 1 : 3)] }))],
          }))
        }
      />
    </div>
  )
}

function RestTimerBar({ rest, setRest }: { rest: { endsAt: number; total: number }; setRest: (r: { endsAt: number; total: number } | null) => void }) {
  return <RestTimer endsAt={rest.endsAt} total={rest.total} onChange={(endsAt) => setRest({ ...rest, endsAt })} onClose={() => setRest(null)} />
}

function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [])
  const sec = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(s).padStart(2, '0')}`
}

const cell = 'num h-10 w-full rounded-lg border border-line bg-surface-2 text-center outline-none focus:border-line-strong'
const intOrNull = (v: string, max: number) => (v ? Math.min(max, parseInt(v.replace(/\D/g, ''), 10) || 0) : null)

/** Colonne delle serie secondo l'unità: kg×rip., secondi, metri(+kg), minuti+km. */
function SetTable({
  item,
  prev,
  onChange,
  onToggle,
}: {
  item: LiveItem
  prev?: WorkoutSet[]
  onChange: (index: number, patch: Partial<LiveSet>) => void
  onToggle: (index: number) => void
}) {
  const m = item.measure
  const headers = { reps: ['kg', 'rip.'], time: ['secondi'], distance: ['kg', 'metri'], cardio: ['minuti', 'km'] }[m]
  const cols = headers.length === 1 ? 'grid-cols-[1.5rem_1fr_2fr_2.75rem]' : 'grid-cols-[1.5rem_1fr_1fr_1fr_2.75rem]'
  return (
    <>
      <div className={cn('grid items-center gap-2 text-[11px] text-faint', cols)}>
        <span>#</span>
        <span>Ultima volta</span>
        {headers.map((h) => (
          <span key={h} className="text-center">
            {h}
          </span>
        ))}
        <span />
      </div>
      {item.sets.map((s, si) => {
        const p = prev?.[si]
        const label = `serie ${si + 1}`
        return (
          <div key={si} className={cn('grid items-center gap-2', cols, s.done && 'opacity-60')}>
            <span className="num text-xs text-muted">{si + 1}</span>
            <span className="num truncate text-xs text-faint">{p ? formatSet(m, p) : '—'}</span>
            {(m === 'reps' || m === 'distance') && (
              <input inputMode="decimal" aria-label={`Carico ${label}`} value={s.weight ?? ''} placeholder="kg" onChange={(e) => onChange(si, { weight: parseDecimal(e.target.value) })} className={cell} />
            )}
            {m === 'reps' && (
              <input inputMode="numeric" aria-label={`Ripetizioni ${label}`} value={s.reps ?? ''} placeholder="rip." onChange={(e) => onChange(si, { reps: intOrNull(e.target.value, 999) })} className={cell} />
            )}
            {m === 'time' && (
              <input inputMode="numeric" aria-label={`Secondi ${label}`} value={s.duration ?? ''} placeholder="sec" onChange={(e) => onChange(si, { duration: intOrNull(e.target.value, 36000) })} className={cell} />
            )}
            {m === 'distance' && (
              <input inputMode="numeric" aria-label={`Metri ${label}`} value={s.distance ?? ''} placeholder="m" onChange={(e) => onChange(si, { distance: intOrNull(e.target.value, 100000) })} className={cell} />
            )}
            {m === 'cardio' && (
              <>
                <input
                  inputMode="decimal"
                  aria-label={`Minuti ${label}`}
                  value={s.duration !== null ? Math.round((s.duration / 60) * 10) / 10 : ''}
                  placeholder="min"
                  onChange={(e) => {
                    const v = parseDecimal(e.target.value)
                    onChange(si, { duration: v === null ? null : Math.round(v * 60) })
                  }}
                  className={cell}
                />
                <input
                  inputMode="decimal"
                  aria-label={`Km ${label}`}
                  value={s.distance !== null ? Math.round(s.distance / 10) / 100 : ''}
                  placeholder="km"
                  onChange={(e) => {
                    const v = parseDecimal(e.target.value)
                    onChange(si, { distance: v === null ? null : Math.round(v * 1000) })
                  }}
                  className={cell}
                />
              </>
            )}
            <button
              type="button"
              aria-label={s.done ? 'Serie da rifare' : 'Serie fatta'}
              onClick={() => onToggle(si)}
              className={cn('flex size-10 items-center justify-center rounded-lg border transition active:scale-95', s.done ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong text-faint')}
            >
              <Check className="size-5" strokeWidth={2.5} />
            </button>
          </div>
        )
      })}
    </>
  )
}
