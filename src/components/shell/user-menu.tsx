'use client'

import { CreditCard, KeyRound, LogOut, Settings2, Shield } from 'lucide-react'
import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  { key: 'billing', label: '账单与订阅', icon: CreditCard },
  { key: 'keys', label: '令牌管理', icon: KeyRound },
] as const

export function UserMenu({
  profile,
  onOpenProfile,
  onOpenSecurity,
  onOpenBilling,
  onOpenKeys,
}: UserMenuProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const displayName = profile.display_name?.trim() || profile.username
  const initials = displayName.slice(0, 1).toUpperCase()

  function handleMenuAction(key: (typeof menuItems)[number]['key']) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          aria-label={displayName}
          title={displayName}
          className='group relative flex size-10 items-center justify-center rounded-full text-left transition-colors hover:bg-[rgba(15,23,42,0.04)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]'
        >
          <span className='flex size-9 items-center justify-center rounded-full bg-[rgba(16,163,127,0.12)] text-sm font-semibold text-[var(--accent-strong)]'>
            {initials}
          </span>
          <span className='pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-[var(--foreground)] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--background)] opacity-0 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-opacity duration-150 group-hover:opacity-100'>
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-64 p-2'>
        <DropdownMenuLabel className='px-3 py-3'>
          <p className='text-sm font-semibold text-[var(--foreground)]'>{displayName}</p>
          <p className='mt-1 text-xs font-normal text-[var(--muted)]'>
            {profile.email || `${profile.group} 分组用户`}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <DropdownMenuItem key={item.key} onSelect={() => handleMenuAction(item.key)}>
              <Icon className='size-4' />
              {item.label}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          className='text-[var(--danger)] focus:text-[var(--danger)] data-[highlighted]:bg-[rgba(166,63,48,0.08)]'
          onSelect={() => {
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
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
