import { cn } from '../../lib/cn'

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className={cn('inline-flex rounded-xl border border-line bg-surface p-0.5', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-[10px] font-medium whitespace-nowrap transition',
            size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
            value === o.value ? 'bg-surface-3 text-fg shadow-sm' : 'text-faint hover:text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
