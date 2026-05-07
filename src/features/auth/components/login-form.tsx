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

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(1, '请输入密码'),
})

const twoFASchema = z.object({
  code: z.string().min(6, '请输入 2FA 验证码'),
})

type LoginFormProps = {
  status: SystemStatus
}

export function LoginForm({ status }: LoginFormProps) {
  const router = useRouter()
  const [requires2FA, setRequires2FA] = useState(false)
  const [pending, setPending] = useState(false)

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  })

  const twoFAForm = useForm<z.infer<typeof twoFASchema>>({
    resolver: zodResolver(twoFASchema),
    defaultValues: {
      code: '',
    },
  })

  async function handleLogin(values: z.infer<typeof loginSchema>) {
    setPending(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await response.json()
      if (!json.success) {
        toast.error(json.message || '登录失败')
        return
      }
      if (json.data?.require_2fa) {
        setRequires2FA(true)
        toast.message('检测到账号已启用 2FA，请完成验证')
        return
      }
      startTransition(() => {
        router.push('/dashboard')
        router.refresh()
      })
    } finally {
      setPending(false)
    }
  }

  async function handleTwoFA(values: z.infer<typeof twoFASchema>) {
    setPending(true)
    try {
      const response = await fetch('/api/auth/login/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const json = await response.json()
      if (!json.success) {
        toast.error(json.message || '2FA 验证失败')
        return
      }
      startTransition(() => {
        router.push('/dashboard')
        router.refresh()
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className='mx-auto w-full max-w-md'>
      <CardHeader>
        <CardTitle>{requires2FA ? '输入安全验证码' : '欢迎回来'}</CardTitle>
        <CardDescription>
          {requires2FA
            ? '你的账号已开启两步验证，完成验证后即可进入控制台。'
            : '使用你的 MoreToken 账号登录，继续管理令牌、查看模型和消费记录。'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!requires2FA ? (
          <form className='space-y-4' onSubmit={loginForm.handleSubmit(handleLogin)}>
            <div className='space-y-2'>
              <Label htmlFor='username'>用户名</Label>
              <Input id='username' placeholder='请输入用户名' {...loginForm.register('username')} />
              <p className='text-xs text-[var(--danger)]'>
                {loginForm.formState.errors.username?.message}
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='password'>密码</Label>
              <Input id='password' type='password' placeholder='请输入登录密码' {...loginForm.register('password')} />
              <p className='text-xs text-[var(--danger)]'>
                {loginForm.formState.errors.password?.message}
              </p>
            </div>
            {status.turnstile_check ? (
              <p className='rounded-[var(--radius-md)] bg-[var(--accent-soft)] px-3 py-2 text-xs text-[var(--muted-strong)]'>
                当前站点已开启额外的人机验证，登录页还需要补充对应验证组件。
              </p>
            ) : null}
            <Button className='w-full' disabled={pending || Boolean(status.turnstile_check)}>
              {pending ? '正在登录...' : '登录'}
            </Button>
          </form>
        ) : (
          <form className='space-y-4' onSubmit={twoFAForm.handleSubmit(handleTwoFA)}>
            <div className='space-y-2'>
              <Label htmlFor='code'>安全验证码</Label>
              <Input id='code' placeholder='请输入 6 位验证码或备用码' {...twoFAForm.register('code')} />
              <p className='text-xs text-[var(--danger)]'>
                {twoFAForm.formState.errors.code?.message}
              </p>
            </div>
            <Button className='w-full' disabled={pending}>
              {pending ? '验证中...' : '继续登录'}
            </Button>
            <Button
              type='button'
              variant='secondary'
              className='w-full'
              onClick={() => setRequires2FA(false)}
            >
              返回上一步
            </Button>
          </form>
        )}

        <div className='mt-6 flex items-center justify-between text-sm text-[var(--muted)]'>
          <span>还没有账号？</span>
          <Link href='/register' className='font-semibold text-[var(--accent-strong)]'>
            去注册
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
