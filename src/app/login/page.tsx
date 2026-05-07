import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { getStatus } from '@/lib/server-fetch'
import { SiteHeader } from '@/components/shell/site-header'
import { LoginForm } from '@/features/auth/components/login-form'

export default async function LoginPage() {
  if (await isAuthenticated()) {
    redirect('/dashboard')
  }

  const status = await getStatus()

  return (
    <div className='min-h-screen'>
      <SiteHeader />
      <main className='mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-14 lg:flex-row lg:px-8'>
        <div className='max-w-xl space-y-5'>
          <p className='text-sm uppercase tracking-[0.18em] text-[var(--muted)]'>Sign in</p>
          <h1 className='text-4xl font-semibold text-[var(--foreground)]'>进入普通用户控制台</h1>
          <p className='text-base leading-8 text-[var(--muted)]'>
            登录后即可查看额度、创建 API Key、浏览模型并查询日志和账单。
          </p>
        </div>
        <div className='flex-1'>
          <LoginForm status={status.data || {}} />
        </div>
      </main>
    </div>
  )
}
