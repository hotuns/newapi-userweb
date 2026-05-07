'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableHead, TableWrapper, Td, Th } from '@/components/ui/table'
import { cn, formatDateTime, formatNumber } from '@/lib/utils'
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
  const epayMethods = useMemo(
    () =>
      (info?.pay_methods ?? []).filter((method) => {
        return !['stripe', 'creem', 'waffo_pancake'].includes(method.type) &&
          !method.type.startsWith('waffo')
      }),
    [info?.pay_methods]
  )
  const [selectedAmount, setSelectedAmount] = useState<number>(info?.amount_options?.[0] ?? 0)
  const [selectedMethod, setSelectedMethod] = useState<string>(epayMethods[0]?.type ?? '')
  const [calculatedMoney, setCalculatedMoney] = useState<string>('')
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const effectiveSelectedMethod = selectedMethod || epayMethods[0]?.type || ''
  const canCalculateAmount = Boolean(selectedAmount > 0 && info?.enable_online_topup)

  useEffect(() => {
    if (!canCalculateAmount) {
      return
    }

    let cancelled = false

    async function calculateAmount() {
      try {
        setCalculating(true)
        const response = await fetch('/api/newapi/user/amount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Math.floor(selectedAmount) }),
        })
        const json = (await response.json()) as {
          message?: string
          data?: string
        }

        if (cancelled) {
          return
        }

        if (json.message === 'success' && json.data) {
          setCalculatedMoney(json.data)
          return
        }

        setCalculatedMoney('')
      } catch {
        if (!cancelled) {
          setCalculatedMoney('')
        }
      } finally {
        if (!cancelled) {
          setCalculating(false)
        }
      }
    }

    void calculateAmount()

    return () => {
      cancelled = true
    }
  }, [canCalculateAmount, selectedAmount])

  function getMethodMinTopup(type: string) {
    const method = epayMethods.find((item) => item.type === type)
    const raw = Number(method?.min_topup ?? info?.min_topup ?? 0)
    return Number.isFinite(raw) && raw > 0 ? raw : Number(info?.min_topup ?? 0)
  }

  function submitPaymentForm(url: string, params: Record<string, unknown>) {
    const form = document.createElement('form')
    form.action = url
    form.method = 'POST'
    form.target = '_blank'

    for (const [key, value] of Object.entries(params)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = String(value ?? '')
      form.appendChild(input)
    }

    document.body.appendChild(form)
    form.submit()
    document.body.removeChild(form)
  }

  async function handleTopup() {
    const amount = Math.floor(Number(selectedAmount))
    const minTopup = getMethodMinTopup(effectiveSelectedMethod)

    if (!effectiveSelectedMethod) {
      toast.error('请选择支付方式')
      return
    }

    if (!amount || amount < minTopup) {
      toast.error(`充值数量不能小于 ${minTopup}`)
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/newapi/user/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: effectiveSelectedMethod,
        }),
      })
      const json = (await response.json()) as {
        success?: boolean
        message?: string
        data?: Record<string, unknown> | string
        url?: string
      }

      if (json.message !== 'success' || !json.url || typeof json.data !== 'object' || !json.data) {
        toast.error(
          typeof json.data === 'string'
            ? json.data
            : json.message || '拉起支付失败'
        )
        return
      }

      submitPaymentForm(json.url, json.data)
      toast.success('已打开支付页面')
    } catch {
      toast.error('支付请求失败')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-6 lg:grid-cols-[0.95fr_1.05fr]'>
        <Card>
          <CardHeader>
            <CardTitle>充值</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {info?.enable_online_topup && epayMethods.length ? (
              <>
                <div className='space-y-3'>
                  <Label>充值数量</Label>
                  <div className='flex flex-wrap gap-2'>
                    {(info?.amount_options ?? []).map((amount) => {
                      const active = selectedAmount === amount
                      return (
                        <button
                          key={amount}
                          type='button'
                          className={cn(
                            'rounded-full border px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                              : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:bg-[var(--surface-strong)]'
                          )}
                          onClick={() => setSelectedAmount(amount)}
                        >
                          {formatNumber(amount)}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    type='number'
                    min={Math.max(1, Number(info?.min_topup ?? 1))}
                    value={selectedAmount || ''}
                    onChange={(event) => setSelectedAmount(Number(event.target.value) || 0)}
                    placeholder='自定义充值数量'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='payment_method'>支付方式</Label>
                  <Select
                    id='payment_method'
                    value={effectiveSelectedMethod}
                    onChange={(event) => setSelectedMethod(event.target.value)}
                  >
                    {epayMethods.map((method) => (
                      <option key={method.type} value={method.type}>
                        {method.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                    <p className='text-sm text-[var(--muted)]'>最低充值</p>
                    <p className='mt-2 text-xl font-semibold'>
                      {formatNumber(getMethodMinTopup(effectiveSelectedMethod))}
                    </p>
                  </div>
                  <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                    <p className='text-sm text-[var(--muted)]'>支付金额</p>
                    <p className='mt-2 text-xl font-semibold'>
                      {!canCalculateAmount ? '-' : calculating ? '计算中...' : calculatedMoney || '-'}
                    </p>
                  </div>
                </div>

                <Button className='w-full' onClick={() => void handleTopup()} disabled={processing}>
                  {processing ? '处理中...' : '立即充值'}
                </Button>
              </>
            ) : (
              <EmptyState title='当前未开放充值' />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>订阅状态</CardTitle>
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
                              {plan?.title || `订阅 #${item.subscription.plan_id}`}
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
              <EmptyState title='没有可展示的订阅' />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>充值记录</CardTitle>
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
            <EmptyState title='没有充值记录' />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
