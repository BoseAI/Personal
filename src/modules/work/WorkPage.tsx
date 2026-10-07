import { Briefcase, Clock, Coffee, Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card, SectionTitle } from '../../components/ui/Card'
import { Field, Input } from '../../components/ui/Field'
import { Sheet } from '../../components/ui/Sheet'
import { cn } from '../../lib/cn'
import { today } from '../../lib/dates'
import { advise, baseExit, DEFAULT_SETTINGS, exitTiers, formatSpan, toHHMM, toMinutes, type WorkSettings } from './workTime'

// Impostazioni ed entrata di oggi restano sul telefono.
const SETTINGS_KEY = 'boseia.work.settings'
const DAY_KEY = 'boseia.work.day'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}
function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage non disponibile */
  }
}

type Day = { date: string; entry: string; breakMin: number }

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

export function WorkPage() {
  const [settings, setSettings] = useState<WorkSettings>(() => load(SETTINGS_KEY, DEFAULT_SETTINGS))
  const [day, setDay] = useState<Day>(() => {
    const d = load<Day>(DAY_KEY, { date: today(), entry: '', breakMin: settings.breakMin })
    return d.date === today() ? d : { date: today(), entry: '', breakMin: settings.breakMin }
  })
  const [now, setNow] = useState(nowMinutes)
  const [simulate, setSimulate] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const t = window.setInterval(() => setNow(nowMinutes()), 15000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => save(DAY_KEY, day), [day])

  const daySettings = { ...settings, breakMin: day.breakMin }
  const entry = toMinutes(day.entry)
  const simulated = toMinutes(simulate)

  return (
    <div className="space-y-5 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Lavoro</h1>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Settings2 className="size-4" /> Regole
        </Button>
      </div>

      <Card className="space-y-4 p-4">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <Field label="Entrata">
            <Input type="time" value={day.entry} onChange={(e) => setDay({ ...day, entry: e.target.value })} className="num text-lg" />
          </Field>
          <Button onClick={() => setDay({ ...day, entry: toHHMM(nowMinutes()) })}>
            <Clock className="size-4" /> Adesso
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Coffee className="size-4" /> Pausa
          </span>
          <div className="flex items-center gap-1">
            {[30, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDay({ ...day, breakMin: m })}
                className={cn('num rounded-lg border px-3 py-1.5 text-sm', day.breakMin === m ? 'border-accent bg-accent/15 text-fg' : 'border-line text-muted')}
              >
                {m}′
              </button>
            ))}
            <input
              inputMode="numeric"
              aria-label="Pausa in minuti"
              value={day.breakMin}
              onChange={(e) => setDay({ ...day, breakMin: Math.min(240, Number(e.target.value.replace(/\D/g, '')) || 0) })}
              className="num h-9 w-14 rounded-lg border border-line bg-surface-2 text-center outline-none"
            />
          </div>
        </div>
      </Card>

      {entry === null ? (
        <Card className="flex items-center gap-3 p-4 text-sm text-muted">
          <Briefcase className="size-5 text-faint" /> Inserisci l'orario di entrata per sapere quando uscire.
        </Card>
      ) : (
        <>
          <ExitHero entry={entry} now={now} settings={daySettings} />
          <Tiers entry={entry} now={now} settings={daySettings} />
          <section className="space-y-2">
            <SectionTitle>Simula un'uscita</SectionTitle>
            <Card className="space-y-3 p-4">
              <Field label="Se esco alle">
                <Input type="time" value={simulate} onChange={(e) => setSimulate(e.target.value)} className="num" />
              </Field>
              {simulated !== null && <Advice entry={entry} at={simulated} settings={daySettings} simulated />}
            </Card>
          </section>
        </>
      )}

      <RulesSheet
        open={editing}
        settings={settings}
        onClose={() => setEditing(false)}
        onSave={(s) => {
          setSettings(s)
          save(SETTINGS_KEY, s)
          setDay((d) => ({ ...d, breakMin: s.breakMin }))
          setEditing(false)
        }}
      />
    </div>
  )
}

function ExitHero({ entry, now, settings }: { entry: number; now: number; settings: WorkSettings }) {
  const base = baseExit(entry, settings)
  const start = entry
  const share = Math.max(0, Math.min(1, (now - start) / (base - start)))
  return (
    <Card className="relative space-y-4 overflow-hidden p-5">
      <div className="pointer-events-none absolute -top-16 -right-12 size-48 rounded-full bg-[#3987e5] opacity-20 blur-3xl" />
      <div className="relative">
        <p className="font-mono text-[10px] tracking-[0.14em] text-faint uppercase">Uscita a pari</p>
        <p className="num text-5xl font-semibold tracking-tight">{toHHMM(base)}</p>
        <p className="num mt-1 text-xs text-muted">
          {toHHMM(entry)} + {settings.hours}h + {settings.breakMin}′ pausa
        </p>
      </div>
      <div className="relative space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-[#3987e5] transition-all" style={{ width: `${share * 100}%` }} />
        </div>
        <div className="num flex justify-between text-[11px] text-faint">
          <span>{toHHMM(entry)}</span>
          <span>ora {toHHMM(now)}</span>
          <span>{toHHMM(base)}</span>
        </div>
      </div>
      <div className="relative">
        <Advice entry={entry} at={now} settings={settings} />
      </div>
    </Card>
  )
}

function Advice({ entry, at, settings, simulated }: { entry: number; at: number; settings: WorkSettings; simulated?: boolean }) {
  const a = advise(entry, at, settings)
  if (a.phase === 'before')
    return (
      <p className="text-sm text-muted">
        {simulated ? 'Usciresti in anticipo di' : 'Mancano'} <span className="num font-semibold text-fg">{formatSpan(a.minutesLeft)}</span>
        {simulated ? ' rispetto alle 8 ore.' : ` all'uscita delle ${toHHMM(a.exitAt)}.`}
      </p>
    )
  const exact = a.unpaid === 0
  return (
    <div className="space-y-1.5 text-sm">
      {a.paid > 0 ? (
        <p>
          Straordinario pagato: <span className="num font-semibold text-positive">{formatSpan(a.paid)}</span>
        </p>
      ) : (
        <p className="text-muted">Nessuno straordinario ancora maturato (serve almeno {formatSpan(settings.thresholdMin)}).</p>
      )}
      {exact && a.paid > 0 ? (
        <p className="font-medium text-positive">{simulated ? 'Orario perfetto: zero minuti regalati.' : 'Esci adesso: zero minuti regalati.'}</p>
      ) : (
        <p className="text-muted">
          {a.paid > 0 || !simulated ? (
            <>
              <span className="num font-semibold text-warning">{formatSpan(a.unpaid)}</span> {simulated ? 'sarebbero' : 'sono'} gratis.{' '}
            </>
          ) : null}
          {simulated ? 'Restando' : 'Resta'} altri <span className="num font-semibold text-fg">{formatSpan(a.wait)}</span> e alle{' '}
          <span className="num font-semibold text-fg">{toHHMM(a.nextAt)}</span> avrai {formatSpan(a.nextPaid)} pagati
          {!simulated && a.paid === 0 ? ', oppure esci subito.' : '.'}
        </p>
      )}
    </div>
  )
}

function Tiers({ entry, now, settings }: { entry: number; now: number; settings: WorkSettings }) {
  const tiers = exitTiers(entry, settings, 7)
  const next = tiers.find((t) => t.at >= now)
  return (
    <section className="space-y-2">
      <SectionTitle>Quando uscire senza regalare minuti</SectionTitle>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {tiers.map((t) => {
          const past = t.at < now
          const isNext = t === next
          return (
            <div key={t.at} className={cn('flex items-center gap-3 px-4 py-2.5', past && 'opacity-40', isNext && 'bg-[#3987e5]/10')}>
              <span className="num w-14 text-lg font-semibold">{toHHMM(t.at)}</span>
              <span className="flex-1 text-sm text-muted">{t.paid ? `+${formatSpan(t.paid)} di straordinario` : 'Fine delle 8 ore'}</span>
              {isNext && <span className="num text-xs font-medium text-[#6aa8f0]">tra {formatSpan(t.at - now)}</span>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function RulesSheet({ open, settings, onClose, onSave }: { open: boolean; settings: WorkSettings; onClose: () => void; onSave: (s: WorkSettings) => void }) {
  if (!open) return null
  return <RulesForm settings={settings} onClose={onClose} onSave={onSave} />
}

function RulesForm({ settings, onClose, onSave }: { settings: WorkSettings; onClose: () => void; onSave: (s: WorkSettings) => void }) {
  const [v, setV] = useState({ hours: String(settings.hours), breakMin: String(settings.breakMin), thresholdMin: String(settings.thresholdMin), stepMin: String(settings.stepMin) })
  const n = (s: string, min: number, max: number, fb: number) => {
    const x = Number(s.replace(',', '.'))
    return Number.isFinite(x) && x >= min && x <= max ? x : fb
  }
  const field = (k: keyof typeof v, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input inputMode="decimal" className="num" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </Field>
  )
  return (
    <Sheet
      open
      onClose={onClose}
      title="Regole orario"
      footer={
        <Button
          variant="primary"
          className="w-full"
          onClick={() =>
            onSave({
              hours: n(v.hours, 1, 14, 8),
              breakMin: Math.round(n(v.breakMin, 0, 240, 45)),
              thresholdMin: Math.round(n(v.thresholdMin, 0, 240, 30)),
              stepMin: Math.round(n(v.stepMin, 1, 120, 15)),
            })
          }
        >
          Salva
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 pb-2">
        {field('hours', 'Ore da fare', 'Pausa esclusa')}
        {field('breakMin', 'Pausa (min)', 'Valore di default')}
        {field('thresholdMin', 'Straordinario dopo (min)', 'Minimo per maturarlo')}
        {field('stepMin', 'Poi ogni (min)', 'Blocchi successivi')}
      </div>
    </Sheet>
  )
}
