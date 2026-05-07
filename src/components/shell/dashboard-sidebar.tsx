import Link from 'next/link'
import { LayoutDashboard, KeyRound, Logs, Wallet, UserRound, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: '控制台', icon: LayoutDashboard },
  { href: '/keys', label: 'Keys', icon: KeyRound },
  { href: '/logs', label: '日志', icon: Logs },
  { href: '/billing', label: '账单', icon: Wallet },
  { href: '/settings/profile', label: '资料', icon: UserRound },
  { href: '/settings/security', label: '安全', icon: Shield },
]

type DashboardSidebarProps = {
  pathname: string
}

export function DashboardSidebar({ pathname }: DashboardSidebarProps) {
  return (
    <aside className='w-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] lg:w-72'>
      <div className='border-b border-[var(--border)] px-2 pb-4'>
        <p className='text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]'>
          User Space
        </p>
        <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>普通用户控制台</p>
      </div>
      <nav className='mt-4 space-y-1'>
        {items.map((item) => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium',
                active
                  ? 'bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--muted-strong)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]'
              )}
            >
              <Icon className='size-4' />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
