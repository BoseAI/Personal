import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, SectionTitle } from '../../../components/ui/Card'
import { ErrorText, Field, Input, Select } from '../../../components/ui/Field'
import { Segmented } from '../../../components/ui/Segmented'
import { PageLoader } from '../../../components/ui/Spinner'
import { useToast } from '../../../components/ui/Toast'
import { today } from '../../../lib/dates'
import { errorMessage } from '../../../lib/supabase'
import { useNutritionProfile, useSaveNutritionProfile, useWeights, weightOn } from '../api'
import { baseTargets } from '../targets'
import { ACTIVITY_LABELS, GOAL_LABELS, type Activity, type Goal, type NutritionProfile } from '../types'

export function GoalsPage() {
  const { data: profile, isLoading } = useNutritionProfile()
  if (isLoading) return <PageLoader />
  return <GoalsForm key={profile ? 'p' : 'n'} profile={profile ?? null} />
}

const numOrNull = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null)
const str = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v))

function GoalsForm({ profile }: { profile: NutritionProfile | null }) {
  const toast = useToast()
  const save = useSaveNutritionProfile()
  const { data: weights } = useWeights()
  const weight = weightOn(weights, today())
  const [sex, setSex] = useState<'m' | 'f' | ''>(profile?.sex ?? '')
  const [birth, setBirth] = useState(profile?.birth_date ?? '')
  const [height, setHeight] = useState(str(profile?.height_cm))
  const [activity, setActivity] = useState<Activity>(profile?.activity ?? 'light')
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain')
  const [targetWeight, setTargetWeight] = useState(str(profile?.target_weight_kg))
  const [ov, setOv] = useState({
    kcal: str(profile?.kcal_override),
    protein: str(profile?.protein_override),
    carbs: str(profile?.carbs_override),
    fat: str(profile?.fat_override),
    water: str(profile?.water_override),
  })
  const [error, setError] = useState<string | null>(null)

  const values: Omit<NutritionProfile, 'user_id'> = {
    sex: sex || null,
    birth_date: birth || null,
    height_cm: numOrNull(height),
    activity,
    goal,
    target_weight_kg: numOrNull(targetWeight),
    kcal_override: numOrNull(ov.kcal),
    protein_override: numOrNull(ov.protein),
    carbs_override: numOrNull(ov.carbs),
    fat_override: numOrNull(ov.fat),
    water_override: numOrNull(ov.water),
  }
  const draft: NutritionProfile = { user_id: '', ...values }
  const computed = baseTargets({ ...draft, kcal_override: null, protein_override: null, carbs_override: null, fat_override: null, water_override: null }, weight)
  const final = baseTargets(draft, weight)

  async function submit() {
    try {
      await save.mutateAsync(values)
      setError(null)
      toast({ message: 'Obiettivi salvati' }, 2000)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const ovField = (k: keyof typeof ov, label: string, unit: string, auto: number) => (
    <Field label={`${label} (${unit})`}>
      <Input inputMode="numeric" className="num" value={ov[k]} onChange={(e) => setOv({ ...ov, [k]: e.target.value.replace(/\D/g, '') })} placeholder={`auto ${auto}`} />
    </Field>
  )

  return (
    <div className="space-y-5 pb-4">
      <Card className="grid grid-cols-5 gap-2 p-4 text-center">
        <Target label="kcal" value={final.kcal} />
        <Target label="Proteine" value={final.protein} unit="g" />
        <Target label="Carbo" value={final.carbs} unit="g" />
        <Target label="Grassi" value={final.fat} unit="g" />
        <Target label="Acqua" value={final.water / 1000} unit="L" />
      </Card>
      <p className="-mt-2 px-1 text-xs text-faint">
        Valori per un giorno senza allenamento: nei giorni in cui ti alleni l'app aggiunge le calorie stimate e +500 ml d'acqua per ogni ora.
        {weight ? ` Peso usato: ${weight} kg (ultima pesata).` : ' Registra una pesata per calcoli più precisi.'}
      </p>

      <section className="space-y-3">
        <SectionTitle>I tuoi dati</SectionTitle>
        <Segmented
          className="w-full"
          value={sex || 'x'}
          onChange={(v) => setSex(v === 'x' ? '' : (v as 'm' | 'f'))}
          options={[
            { value: 'm', label: 'Uomo' },
            { value: 'f', label: 'Donna' },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data di nascita">
            <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
          </Field>
          <Field label="Altezza cm">
            <Input inputMode="numeric" className="num" value={height} onChange={(e) => setHeight(e.target.value.replace(/[^\d,.]/g, ''))} />
          </Field>
        </div>
        <Field label="Attività quotidiana (sport escluso)" hint={ACTIVITY_LABELS[activity].hint}>
          <Select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
            {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Obiettivo">
          <Segmented className="w-full" value={goal} onChange={setGoal} options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({ value: g, label: GOAL_LABELS[g] }))} />
        </Field>
        <Field label="Peso obiettivo kg">
          <Input inputMode="decimal" className="num" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="Opzionale" />
        </Field>
      </section>

      <section className="space-y-3">
        <SectionTitle>Correzioni manuali</SectionTitle>
        <p className="-mt-1 px-1 text-xs text-faint">Lascia vuoto per usare il valore calcolato.</p>
        <div className="grid grid-cols-2 gap-3">
          {ovField('kcal', 'Calorie', 'kcal', computed.kcal)}
          {ovField('protein', 'Proteine', 'g', computed.protein)}
          {ovField('carbs', 'Carboidrati', 'g', computed.carbs)}
          {ovField('fat', 'Grassi', 'g', computed.fat)}
          {ovField('water', 'Acqua', 'ml', computed.water)}
        </div>
      </section>

      <ErrorText error={error} />
      <Button variant="primary" className="w-full" loading={save.isPending} onClick={submit}>
        Salva obiettivi
      </Button>
    </div>
  )
}

function Target({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div>
      <div className="num text-base font-semibold">
        {value.toLocaleString('it-IT', { maximumFractionDigits: 1 })}
        {unit && <span className="text-[10px] text-muted">{unit}</span>}
      </div>
      <div className="text-[10px] text-faint">{label}</div>
    </div>
  )
}
