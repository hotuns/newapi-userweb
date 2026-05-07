'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant='ghost'
      size='sm'
      disabled={pending}
      onClick={() => {
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
      {pending ? '退出中...' : '退出登录'}
    </Button>
  )
}
