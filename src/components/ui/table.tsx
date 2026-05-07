import type { HTMLAttributes, TableHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function TableWrapper({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]',
        className
      )}
      {...props}
    />
  )
}

export function Table({
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn('w-full border-collapse', className)} {...props} />
}

export function TableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-[var(--surface-strong)]', className)} {...props} />
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />
}

export function Th({
  className,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]',
        className
      )}
      {...props}
    />
  )
}

export function Td({
  className,
  ...props
}: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'border-t border-[var(--border)] px-4 py-3 align-top text-sm text-[var(--foreground)]',
        className
      )}
      {...props}
    />
  )
}
