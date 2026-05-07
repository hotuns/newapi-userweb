import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SiteHeader } from '@/components/shell/site-header'
import type { PricingPreviewItem, PricingResponse } from '@/types/api'

type ModelsPageProps = {
  pricing: PricingResponse
  authenticated: boolean
  userModels: string[]
}

function renderSummary(item: PricingPreviewItem) {
  if (item.model_price > 0) return `单价 ${item.model_price}`
  if (item.model_ratio > 0) return `倍率 ${item.model_ratio}`
  return '请查看实例配置'
}

export function ModelsPage({
  pricing,
  authenticated,
  userModels,
}: ModelsPageProps) {
  return (
    <div className='min-h-screen'>
      <SiteHeader authenticated={authenticated} />
      <main className='mx-auto w-full max-w-7xl px-6 py-10 lg:px-8'>
        <div className='rounded-[var(--radius-xl)] border border-[var(--border)] bg-[rgba(255,253,247,0.86)] p-6 shadow-[var(--shadow-soft)]'>
          <Badge>公开模型浏览页</Badge>
          <h1 className='mt-4 text-4xl font-semibold text-[var(--foreground)]'>模型与价格</h1>
          <p className='mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]'>
            这个页面对未登录用户也开放，用于浏览当前实例公开的模型与价格概览。
          </p>
          {authenticated ? (
            <div className='mt-6 rounded-[var(--radius-lg)] bg-[var(--accent-soft)] p-4 text-sm text-[var(--muted-strong)]'>
              你当前可用的模型数量：<strong>{userModels.length}</strong>
            </div>
          ) : null}
        </div>

        <div className='mt-8'>
          {pricing.data.length ? (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {pricing.data.map((item) => {
                const availableToUser =
                  !authenticated || userModels.includes(item.model_name)
                return (
                  <Card key={item.model_name}>
                    <CardContent className='p-6'>
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <h2 className='text-xl font-semibold text-[var(--foreground)]'>
                            {item.model_name}
                          </h2>
                          <p className='mt-1 text-sm text-[var(--muted)]'>
                            {item.owner_by || '未标记供应方'}
                          </p>
                        </div>
                        <Badge tone={availableToUser ? 'success' : 'default'}>
                          {availableToUser ? '可用' : '需特定分组'}
                        </Badge>
                      </div>
                      <p className='mt-4 text-sm leading-6 text-[var(--muted)]'>
                        {item.description || '暂无描述。'}
                      </p>
                      <div className='mt-5 flex flex-wrap gap-2'>
                        {(item.supported_endpoint_types || []).map((endpoint) => (
                          <Badge key={`${item.model_name}-${endpoint}`}>{endpoint}</Badge>
                        ))}
                      </div>
                      <div className='mt-6 rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                        <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>
                          计费摘要
                        </p>
                        <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                          {renderSummary(item)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title='暂无公开模型数据'
              description='当前实例的 `/api/pricing` 公开返回为空。后续一旦后端配置公开价格，页面会自动呈现。'
              action={<Button variant='secondary'>等待实例开放数据</Button>}
            />
          )}
        </div>
      </main>
    </div>
  )
}
