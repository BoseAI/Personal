import { createElement } from 'react'
import { getIcon } from '../../lib/icons'
import { tint } from '../../lib/colors'
import { cn } from '../../lib/cn'

export function IconChip({ icon, color, size = 'md', className }: { icon: string; color: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const box = { sm: 'size-7 rounded-lg', md: 'size-9 rounded-xl', lg: 'size-12 rounded-2xl' }[size]
  const glyph = { sm: 'size-3.5', md: 'size-[18px]', lg: 'size-6' }[size]
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', box, className)} style={{ background: tint(color), color }}>
      {createElement(getIcon(icon), { className: glyph, strokeWidth: 1.75 })}
    </span>
  )
}
