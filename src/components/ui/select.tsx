import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-11 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
