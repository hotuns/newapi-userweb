'use client'

import { ChevronDown, CreditCard, KeyRound, LogOut, Settings2, Shield } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@/types/api'

type UserMenuProps = {
  profile: UserProfile
  onOpenProfile: () => void
  onOpenSecurity: () => void
  onOpenBilling: () => void
  onOpenKeys: () => void
}

const menuItems = [
  { key: 'profile', label: '个人资料', icon: Settings2 },
  { key: 'security', label: '安全设置', icon: Shield },
  { key: 'billing', label: '账单与套餐', icon: CreditCard },
  { key: 'keys', label: 'Keys 管理', icon: KeyRound },
] as const

export function UserMenu({
  profile,
  onOpenProfile,
  onOpenSecurity,
  onOpenBilling,
  onOpenKeys,
}: UserMenuProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const displayName = profile.display_name?.trim() || profile.username
  const initials = displayName.slice(0, 1).toUpperCase()

  function handleMenuAction(key: (typeof menuItems)[number]['key']) {
    setOpen(false)

    if (key === 'profile') {
      onOpenProfile()
      return
    }

    if (key === 'security') {
      onOpenSecurity()
      return
    }

    if (key === 'billing') {
      onOpenBilling()
      return
    }

    onOpenKeys()
  }

  return (
    <div className='relative' ref={containerRef}>
      <button
        type='button'
        className='flex items-center gap-3 rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.94)] px-2 py-2 shadow-[var(--shadow-card)] hover:border-[rgba(16,163,127,0.24)]'
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup='menu'
      >
        <span className='flex size-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)]'>
          {initials}
        </span>
        <span className='hidden text-left sm:block'>
          <span className='block text-sm font-semibold text-[var(--foreground)]'>{displayName}</span>
          <span className='block text-xs text-[var(--muted)]'>
            @{profile.username} · {profile.group}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'mr-1 size-4 text-[var(--muted)] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open ? (
        <div className='absolute right-0 z-30 mt-3 w-64 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)]'>
          <div className='border-b border-[var(--border)] px-3 py-3'>
            <p className='text-sm font-semibold text-[var(--foreground)]'>{displayName}</p>
            <p className='mt-1 text-xs text-[var(--muted)]'>
              {profile.email || `${profile.group} 分组用户`}
            </p>
          </div>

          <div className='py-2'>
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.key}
                  type='button'
                  className='flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm text-[var(--muted-strong)] hover:bg-[var(--accent-soft)] hover:text-[var(--foreground)]'
                  onClick={() => handleMenuAction(item.key)}
                >
                  <Icon className='size-4' />
                  {item.label}
                </button>
              )
            })}
          </div>

          <div className='border-t border-[var(--border)] px-2 pt-2'>
            <button
              type='button'
              disabled={pending}
              className='flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-left text-sm text-[var(--danger)] hover:bg-[rgba(166,63,48,0.08)] disabled:opacity-60'
              onClick={() => {
                setOpen(false)
                startTransition(async () => {
                  const response = await fetch('/api/auth/logout', { method: 'POST' })
                  const json = await response.json()
                  if (!json.success) {
                    toast.error(json.message || '退出登录失败')
                    return
                  }
                  router.push('/')
                  router.refresh()
                })
              }}
            >
              <LogOut className='size-4' />
              {pending ? '退出中...' : '退出登录'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
