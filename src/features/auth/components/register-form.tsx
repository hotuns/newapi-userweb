'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startTransition, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SystemStatus } from '@/types/api'

function createSchema(status: SystemStatus) {
  return z.object({
    username: z.string().min(3, '用户名至少 3 个字符'),
    password: z.string().min(8, '密码至少 8 个字符'),
    email: status.email_verification
      ? z.string().email('请输入有效邮箱')
      : z.string().optional().or(z.literal('')),
    verification_code: status.email_verification
      ? z.string().min(1, '请输入邮箱验证码')
      : z.string().optional().or(z.literal('')),
  })
}

type RegisterFormProps = {
  status: SystemStatus
}

export function RegisterForm({ status }: RegisterFormProps) {
  const schema = createSchema(status)
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
      verification_code: '',
    },
  })

  async function handleRegister(values: z.infer<typeof schema>) {
    if (status.turnstile_check) {
      toast.error('当前实例开启了 Turnstile，V1 暂未集成前端挑战组件。')
      return
    }
    setPending(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await response.json()
      if (!json.success) {
        toast.error(json.message || '注册失败')
        return
      }
      toast.success('注册成功，请登录')
      startTransition(() => {
        router.push('/login')
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className='mx-auto w-full max-w-md'>
      <CardHeader>
        <CardTitle>创建普通用户账号</CardTitle>
        <CardDescription>
          注册后即可进入控制台，管理 API Key、查看消费记录和账单概览。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className='space-y-4' onSubmit={form.handleSubmit(handleRegister)}>
          <div className='space-y-2'>
            <Label htmlFor='username'>用户名</Label>
            <Input id='username' {...form.register('username')} />
            <p className='text-xs text-[var(--danger)]'>
              {form.formState.errors.username?.message}
            </p>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='password'>密码</Label>
            <Input id='password' type='password' {...form.register('password')} />
            <p className='text-xs text-[var(--danger)]'>
              {form.formState.errors.password?.message}
            </p>
          </div>
          {status.email_verification ? (
            <>
              <div className='space-y-2'>
                <Label htmlFor='email'>邮箱</Label>
                <Input id='email' type='email' {...form.register('email')} />
                <p className='text-xs text-[var(--danger)]'>
                  {form.formState.errors.email?.message}
                </p>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='verification_code'>邮箱验证码</Label>
                <Input id='verification_code' {...form.register('verification_code')} />
                <p className='text-xs text-[var(--danger)]'>
                  {form.formState.errors.verification_code?.message}
                </p>
              </div>
            </>
          ) : null}
          {status.turnstile_check ? (
            <p className='rounded-[var(--radius-md)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--muted-strong)]'>
              当前实例开启了 Turnstile。V1 暂未集成挑战组件，因此此页面会禁用提交。
            </p>
          ) : null}
          <Button className='w-full' disabled={pending || Boolean(status.turnstile_check)}>
            {pending ? '注册中...' : '创建账号'}
          </Button>
        </form>

        <div className='mt-6 flex items-center justify-between text-sm text-[var(--muted)]'>
          <span>已经有账号？</span>
          <Link href='/login' className='font-semibold text-[var(--accent-strong)]'>
            去登录
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
