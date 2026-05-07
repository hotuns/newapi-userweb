'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UserProfile } from '@/types/api'

const profileSchema = z.object({
  display_name: z.string().min(1, '请输入显示名称'),
})

type ProfileSettingsFormProps = {
  profile: UserProfile
}

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const router = useRouter()
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name || '',
    },
  })

  async function handleSubmit(values: z.infer<typeof profileSchema>) {
    const response = await fetch('/api/newapi/user/self', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })
    const json = await response.json()
    if (!json.success) {
      toast.error(json.message || '更新失败')
      return
    }
    toast.success('资料已更新')
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
        <CardDescription>V1 仅支持更新显示名称，其他信息保持只读。</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
            <p className='text-sm text-[var(--muted)]'>用户名</p>
            <p className='mt-2 text-lg font-semibold'>{profile.username}</p>
          </div>
          <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
            <p className='text-sm text-[var(--muted)]'>用户分组</p>
            <p className='mt-2 text-lg font-semibold'>{profile.group}</p>
          </div>
        </div>
        <form className='space-y-4' onSubmit={form.handleSubmit(handleSubmit)}>
          <div className='space-y-2'>
            <Label htmlFor='display_name'>显示名称</Label>
            <Input id='display_name' {...form.register('display_name')} />
            <p className='text-xs text-[var(--danger)]'>
              {form.formState.errors.display_name?.message}
            </p>
          </div>
          <Button>保存资料</Button>
        </form>
      </CardContent>
    </Card>
  )
}
