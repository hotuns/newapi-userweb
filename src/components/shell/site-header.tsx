'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SiteHeaderProps = {
  authenticated?: boolean
}

const publicLinks = [
  { href: '/', label: '首页' },
  { href: '/models', label: '模型与价格' },
  { href: '/tutorial', label: '教程' },
]

export function SiteHeader({ authenticated = false }: SiteHeaderProps) {
  const pathname = usePathname()

  return (
    <header className='sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(250,252,252,0.88)] backdrop-blur'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8'>
        <Link href='/' className='flex items-center gap-3'>
          <div className='flex size-10 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-bold text-[var(--accent-foreground)]'>
            MT
          </div>
          <div>
            <p className='text-sm font-semibold tracking-[0.22em] text-[var(--muted)] uppercase'>
              MoreToken
            </p>
            <p className='text-sm text-[var(--foreground)]'>大模型 API</p>
          </div>
        </Link>

        <nav className='hidden items-center gap-6 md:flex'>
          {publicLinks.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname === link.href || pathname.startsWith(`${link.href}/`)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]',
                  active &&
                    'bg-[var(--surface-strong)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(15,23,42,0.05)]'
                )}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className='flex items-center gap-3'>
          <Link href={authenticated ? '/dashboard' : '/login'}>
            <Button variant={authenticated ? 'secondary' : 'primary'} size='sm'>
              控制台
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
