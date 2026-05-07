import type { ReactNode } from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className='rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[rgba(255,253,247,0.72)] p-8 text-center'>
      <h3 className='text-lg font-semibold text-[var(--foreground)]'>{title}</h3>
      <p className='mt-2 text-sm leading-6 text-[var(--muted)]'>{description}</p>
      {action ? <div className='mt-4'>{action}</div> : null}
    </div>
  )
}
