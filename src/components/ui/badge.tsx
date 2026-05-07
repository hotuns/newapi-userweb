import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'warning'
}

export function Badge({
  className,
  tone = 'default',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
        tone === 'default' &&
          'border-[var(--border)] bg-[var(--surface-strong)] text-[var(--muted-strong)]',
        tone === 'success' &&
          'border-[rgba(30,125,86,0.18)] bg-[rgba(30,125,86,0.1)] text-[var(--success)]',
        tone === 'warning' &&
          'border-[rgba(202,90,26,0.2)] bg-[var(--accent-soft)] text-[var(--accent-strong)]',
        className
      )}
      {...props}
    />
  )
}
