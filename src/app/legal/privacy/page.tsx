import { notFound } from 'next/navigation'
import { SiteHeader } from '@/components/shell/site-header'
import { getStatus } from '@/lib/server-fetch'
import { buildNewApiUrl, createNewApiHeaders } from '@/lib/newapi'
import type { ApiResponse } from '@/types/api'

export default async function PrivacyPage() {
  const status = await getStatus()
  if (!status.data?.privacy_policy_enabled) {
    notFound()
  }

  const response = await fetch(buildNewApiUrl('/api/privacy-policy'), {
    headers: await createNewApiHeaders(),
    cache: 'no-store',
  })
  const json = (await response.json()) as ApiResponse<string>

  return (
    <div className='min-h-screen'>
      <SiteHeader />
      <main className='mx-auto w-full max-w-4xl px-6 py-12 lg:px-8'>
        <div className='rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow-soft)]'>
          <h1 className='text-4xl font-semibold text-[var(--foreground)]'>隐私政策</h1>
          <div className='prose prose-neutral mt-6 max-w-none whitespace-pre-wrap text-sm leading-7 text-[var(--muted-strong)]'>
            {json.data || '当前实例未提供隐私政策正文。'}
          </div>
        </div>
      </main>
    </div>
  )
}
