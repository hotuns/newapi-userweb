import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-[var(--radius-md)] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] px-4 py-2.5 text-[var(--accent-foreground)] shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]',
        secondary:
          'border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] hover:bg-[var(--surface-strong)]',
        ghost:
          'px-3 py-2 text-[var(--muted-strong)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]',
        danger:
          'bg-[var(--danger)] px-4 py-2.5 text-white hover:bg-[#8f3124]',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4',
        lg: 'h-12 px-5 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
