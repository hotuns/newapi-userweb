import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type StatCardProps = {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
}

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <Card className='overflow-hidden'>
      <CardContent className='flex items-start justify-between gap-4 p-5'>
        <div>
          <p className='text-sm text-[var(--muted)]'>{label}</p>
          <p className='mt-3 text-2xl font-semibold text-[var(--foreground)]'>{value}</p>
          {hint ? <p className='mt-2 text-xs text-[var(--muted)]'>{hint}</p> : null}
        </div>
        {icon ? (
          <div className='rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]'>
            {icon}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
