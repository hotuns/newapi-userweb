'use client'

import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const securitySchema = z
  .object({
    original_password: z.string().min(1, '请输入当前密码'),
    password: z.string().min(8, '新密码至少 8 个字符'),
    confirm_password: z.string().min(8, '请再次输入新密码'),
  })
  .refine((value) => value.password === value.confirm_password, {
    path: ['confirm_password'],
    message: '两次输入的新密码不一致',
  })

export function SecuritySettingsForm() {
  const form = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      original_password: '',
      password: '',
      confirm_password: '',
    },
  })

  async function handleSubmit(values: z.infer<typeof securitySchema>) {
    const response = await fetch('/api/newapi/user/self', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        original_password: values.original_password,
        password: values.password,
      }),
    })
    const json = await response.json()
    if (!json.success) {
      toast.error(json.message || '修改密码失败')
      return
    }
    toast.success('密码已更新')
    form.reset()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>密码安全</CardTitle>
        <CardDescription>
          按规划，V1 只实现修改密码，不纳入 Passkey 或 2FA 管理页。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className='space-y-4' onSubmit={form.handleSubmit(handleSubmit)}>
          <div className='space-y-2'>
            <Label htmlFor='original_password'>当前密码</Label>
            <Input id='original_password' type='password' {...form.register('original_password')} />
            <p className='text-xs text-[var(--danger)]'>
              {form.formState.errors.original_password?.message}
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password'>新密码</Label>
            <Input id='password' type='password' {...form.register('password')} />
            <p className='text-xs text-[var(--danger)]'>
              {form.formState.errors.password?.message}
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='confirm_password'>确认新密码</Label>
            <Input id='confirm_password' type='password' {...form.register('confirm_password')} />
            <p className='text-xs text-[var(--danger)]'>
              {form.formState.errors.confirm_password?.message}
            </p>
          </div>
          <Button>更新密码</Button>
        </form>
      </CardContent>
    </Card>
  )
}
