'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableHead, TableWrapper, Td, Th } from '@/components/ui/table'
import { formatDateTime, formatNumber } from '@/lib/utils'
import type {
  ApiResponse,
  PaginatedResponse,
  SubscriptionPlan,
  SubscriptionSummary,
  TopupInfo,
  TopupRecord,
} from '@/types/api'

type BillingPageProps = {
  topupInfo: ApiResponse<TopupInfo>
  topupRecords: PaginatedResponse<TopupRecord>
  subscription: ApiResponse<SubscriptionSummary>
  subscriptionPlans: ApiResponse<Array<{ plan: SubscriptionPlan }>>
}

export function BillingPage({
  topupInfo,
  topupRecords,
  subscription,
  subscriptionPlans,
}: BillingPageProps) {
  const info = topupInfo.data
  const records = topupRecords.data?.items ?? []
  const subs = subscription.data?.subscriptions ?? []
  const planList = subscriptionPlans.data ?? []

  return (
    <div className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-[0.95fr_1.05fr]'>
        <Card>
          <CardHeader>
            <CardTitle>充值配置</CardTitle>
            <CardDescription>只读展示当前实例开放给用户的充值能力。</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                <p className='text-sm text-[var(--muted)]'>在线充值</p>
                <p className='mt-2 text-xl font-semibold'>
                  {info?.enable_online_topup ? '已启用' : '未启用'}
                </p>
              </div>
              <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                <p className='text-sm text-[var(--muted)]'>Stripe</p>
                <p className='mt-2 text-xl font-semibold'>
                  {info?.enable_stripe_topup ? '已启用' : '未启用'}
                </p>
              </div>
            </div>
            <div className='rounded-[var(--radius-lg)] border border-[var(--border)] p-4'>
              <p className='text-sm text-[var(--muted)]'>最小充值额度</p>
              <p className='mt-2 text-2xl font-semibold'>{formatNumber(info?.min_topup ?? 0)}</p>
            </div>
            <div className='space-y-2'>
              <p className='text-sm font-medium text-[var(--muted-strong)]'>支付方式</p>
              <div className='flex flex-wrap gap-2'>
                {(info?.pay_methods ?? []).length ? (
                  info?.pay_methods?.map((method) => (
                    <Badge key={method.type}>{method.name}</Badge>
                  ))
                ) : (
                  <Badge>当前未开放</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>订阅状态</CardTitle>
            <CardDescription>V1 仅展示订阅概览，不发起购买和续费动作。</CardDescription>
          </CardHeader>
          <CardContent>
            {subs.length ? (
              <div className='space-y-4'>
                {subs.map((item) => (
                  (() => {
                    const plan =
                      item.plan ??
                      planList.find((planItem) => planItem.plan.id === item.subscription.plan_id)?.plan
                    const remainingQuota = Math.max(
                      0,
                      Number(item.subscription.amount_total ?? 0) -
                        Number(item.subscription.amount_used ?? 0)
                    )

                    return (
                      <div
                        key={item.subscription.id}
                        className='rounded-[var(--radius-lg)] border border-[var(--border)] p-4'
                      >
                        <div className='flex items-start justify-between gap-4'>
                          <div>
                            <p className='text-lg font-semibold text-[var(--foreground)]'>
                              {plan?.title || `套餐 #${item.subscription.plan_id}`}
                            </p>
                            <p className='mt-1 text-sm text-[var(--muted)]'>
                              状态：{item.subscription.status}
                            </p>
                          </div>
                          <Badge tone='success'>只读</Badge>
                        </div>
                        <div className='mt-4 grid gap-4 md:grid-cols-3'>
                          <div>
                            <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>剩余额度</p>
                            <p className='mt-2 text-lg font-semibold'>
                              {formatNumber(remainingQuota)}
                            </p>
                          </div>
                          <div>
                            <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>总额度</p>
                            <p className='mt-2 text-lg font-semibold'>
                              {formatNumber(item.subscription.amount_total ?? 0)}
                            </p>
                          </div>
                          <div>
                            <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>重置时间</p>
                            <p className='mt-2 text-lg font-semibold'>
                              {formatDateTime(item.subscription.next_reset_time)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ))}
              </div>
            ) : (
              <EmptyState
                title='没有可展示的订阅'
                description='当前账户下未查询到订阅记录，或实例未对普通用户开放订阅。'
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>充值记录</CardTitle>
          <CardDescription>只读账单视图，不在前端发起支付动作。</CardDescription>
        </CardHeader>
        <CardContent>
          {records.length ? (
            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <Th>订单号</Th>
                    <Th>金额</Th>
                    <Th>额度</Th>
                    <Th>方式</Th>
                    <Th>状态</Th>
                    <Th>创建时间</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <Td className='font-mono text-xs'>{record.trade_no}</Td>
                      <Td>{formatNumber(record.money)}</Td>
                      <Td>{formatNumber(record.amount)}</Td>
                      <Td>{record.payment_method || '-'}</Td>
                      <Td>{record.status}</Td>
                      <Td>{formatDateTime(record.create_time)}</Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          ) : (
            <EmptyState
              title='没有充值记录'
              description='当你在原有充值体系中产生记录后，这里会同步展示。'
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
