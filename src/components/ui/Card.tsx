import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-2xl border border-line bg-surface', className)} {...props} />
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between px-1">
      <h3 className="font-mono text-[11px] font-medium tracking-[0.12em] text-faint uppercase">{children}</h3>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="text-sm font-medium text-muted">{title}</p>
      {children && <div className="text-xs text-faint">{children}</div>}
    </div>
  )
}
