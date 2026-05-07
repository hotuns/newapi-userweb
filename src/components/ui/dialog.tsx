'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  className?: string
  children: React.ReactNode
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  className,
  children,
}: DialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return (
    <div
      className='fixed inset-0 z-50 flex items-end justify-center bg-[rgba(31,30,26,0.52)] p-4 sm:items-center'
      onClick={onClose}
      role='presentation'
    >
      <div
        className={cn(
          'w-full max-w-3xl rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]',
          className
        )}
        onClick={(event) => event.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label={title}
      >
        <div className='flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5'>
          <div>
            <h2 className='text-xl font-semibold text-[var(--foreground)]'>{title}</h2>
            {description ? (
              <p className='mt-2 text-sm leading-6 text-[var(--muted)]'>{description}</p>
            ) : null}
          </div>
          <button
            type='button'
            className='rounded-full p-2 text-[var(--muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]'
            onClick={onClose}
            aria-label='关闭弹窗'
          >
            <X className='size-4' />
          </button>
        </div>
        <div className='max-h-[80vh] overflow-y-auto'>{children}</div>
      </div>
    </div>
  )
}
