import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SiteHeader } from '@/components/shell/site-header'
import { getPricingDetails, getPricingSummary } from '@/lib/pricing-display'
import type { PricingResponse } from '@/types/api'

type ModelsPageProps = {
  pricing: PricingResponse
  authenticated: boolean
  userModels: string[]
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
          <h1 className='text-4xl font-semibold text-[var(--foreground)]'>模型与价格</h1>
        </div>

        <div className='mt-8'>
          {pricing.data.length ? (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {pricing.data.map((item) => {
                const availableToUser =
                  !authenticated || userModels.includes(item.model_name)
                const pricingDetails = getPricingDetails(item)
                return (
                  <Card key={item.model_name}>
                    <CardContent className='p-6'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <h2 className='text-xl font-semibold text-[var(--foreground)]'>
                              {item.model_name}
                            </h2>
                            {(item.supported_endpoint_types || []).map((endpoint) => (
                              <Badge key={`${item.model_name}-${endpoint}`}>{endpoint}</Badge>
                            ))}
                          </div>
                          {item.owner_by ? (
                            <p className='mt-1 text-sm text-[var(--muted)]'>{item.owner_by}</p>
                          ) : null}
                        </div>
                        <Badge tone={availableToUser ? 'success' : 'default'}>
                          {availableToUser ? '可用' : '需特定分组'}
                        </Badge>
                      </div>
                      {item.description ? (
                        <p className='mt-4 text-sm leading-6 text-[var(--muted)]'>
                          {item.description}
                        </p>
                      ) : null}
                      <div className='mt-6 rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                        <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>
                          计费摘要
                        </p>
                        <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                          {getPricingSummary(item, { fallbackSummary: '请查看实例配置' })}
                        </p>
                        {pricingDetails.length ? (
                          <div className='mt-3 flex flex-wrap gap-x-4 gap-y-2'>
                            {pricingDetails.map((detail) => (
                              <div
                                key={`${item.model_name}-${detail.label}`}
                                className='inline-flex items-baseline gap-2 text-sm text-[var(--muted-strong)]'
                              >
                                <p className='text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]'>
                                  {detail.label}
                                </p>
                                <p className='font-semibold text-[var(--foreground)]'>
                                  {detail.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : null}
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
