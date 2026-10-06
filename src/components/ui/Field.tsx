import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const control =
  'w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[15px] text-fg placeholder:text-faint outline-none transition focus:border-line-strong focus:bg-surface-3'

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
      {children}
      {hint && <span className="block text-xs text-faint">{hint}</span>}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, 'min-h-20 py-2.5', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'h-11 appearance-none pr-9', className)} {...props}>
      {children}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-left"
    >
      <span>
        <span className="block text-sm text-fg">{label}</span>
        {description && <span className="block text-xs text-faint">{description}</span>}
      </span>
      <span className={cn('relative h-6 w-10 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-surface-3')}>
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full transition-all',
            checked ? 'left-[18px] bg-accent-ink' : 'left-0.5 bg-faint',
          )}
        />
      </span>
    </button>
  )
}

export function ErrorText({ error }: { error?: string | null }) {
  if (!error) return null
  return <p className="rounded-xl border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">{error}</p>
}
