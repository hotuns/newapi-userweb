import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'
import { getStatus } from '@/lib/server-fetch'
import { SiteHeader } from '@/components/shell/site-header'
import { RegisterForm } from '@/features/auth/components/register-form'

export default async function RegisterPage() {
  if (await isAuthenticated()) {
    redirect('/dashboard')
  }

  const status = await getStatus()

  return (
    <div className='min-h-screen'>
      <SiteHeader />
      <main className='mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-14 lg:flex-row lg:px-8'>
        <div className='max-w-xl space-y-5'>
          <p className='text-sm uppercase tracking-[0.18em] text-[var(--muted)]'>Register</p>
          <h1 className='text-4xl font-semibold text-[var(--foreground)]'>创建你的用户入口</h1>
          <p className='text-base leading-8 text-[var(--muted)]'>
            新前端只关注普通用户流程：注册、登录、Key 管理、日志查看和账单透明。
          </p>
        </div>
        <div className='flex-1'>
          <RegisterForm status={status.data || {}} />
        </div>
      </main>
    </div>
  )
}
