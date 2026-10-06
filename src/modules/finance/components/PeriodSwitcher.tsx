import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from '../../../components/ui/Button'
import { Segmented } from '../../../components/ui/Segmented'
import { periodLabel, shiftPeriod, type Period } from '../../../lib/dates'

export function PeriodSwitcher({ value, onChange, allowYear = true }: { value: Period; onChange: (p: Period) => void; allowYear?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <IconButton label="Precedente" onClick={() => onChange(shiftPeriod(value, -1))}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <span className="min-w-32 text-center text-sm font-medium">{periodLabel(value)}</span>
        <IconButton label="Successivo" onClick={() => onChange(shiftPeriod(value, 1))}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>
      {allowYear && (
        <Segmented
          size="sm"
          value={value.mode}
          onChange={(mode) => onChange({ ...value, mode })}
          options={[
            { value: 'month', label: 'Mese' },
            { value: 'year', label: 'Anno' },
          ]}
        />
      )}
    </div>
  )
}
