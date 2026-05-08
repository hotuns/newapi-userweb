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
  SystemStatus,
  TopupInfo,
  TopupRecord,
  UserProfile,
} from '@/types/api'

type BillingPageProps = {
  profile?: ApiResponse<UserProfile>
  status?: ApiResponse<SystemStatus>
  topupInfo: ApiResponse<TopupInfo>
  topupRecords: PaginatedResponse<TopupRecord>
  subscription: ApiResponse<SubscriptionSummary>
  subscriptionPlans: ApiResponse<Array<{ plan: SubscriptionPlan }>>
}

export function BillingPage({
  profile,
  status,
  topupInfo,
  topupRecords,
  subscription,
  subscriptionPlans,
}: BillingPageProps) {
  const user = profile?.data
  const systemStatus = status?.data
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
  const [calculationError, setCalculationError] = useState('')
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'balance' | 'subscription'>('balance')
  const effectiveSelectedMethod = selectedMethod || epayMethods[0]?.type || ''
  const hasActionColumn = records.some((record) => canRetryTopup(record, epayMethods))
  const currentMinTopup = getMethodMinTopup(effectiveSelectedMethod)
  const canCalculateAmount = Boolean(
    selectedAmount >= currentMinTopup && info?.enable_online_topup
  )
  const currentBalanceLabel = formatUsdBalance(Number(user?.quota ?? 0), systemStatus)
  const ratioLabel = canCalculateAmount && calculatedMoney
    ? `¥${calculatedMoney} / $${formatNumber(selectedAmount)}`
    : calculating
      ? '计算中...'
      : calculationError || '-'

  useEffect(() => {
    if (!canCalculateAmount) {
      return
    }

    let cancelled = false

    async function calculateAmount() {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 8000)

      try {
        setCalculating(true)
        setCalculationError('')
        const response = await fetch('/api/newapi/user/amount', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: Math.floor(selectedAmount) }),
          signal: controller.signal,
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
        setCalculationError('暂不可用')
      } catch {
        if (!cancelled) {
          setCalculatedMoney('')
          setCalculationError('暂不可用')
        }
      } finally {
        window.clearTimeout(timeout)
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
      toast.error(`充值额度不能小于 $${formatNumber(minTopup)}`)
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

  async function handleRetryPayment(record: TopupRecord) {
    const amount = Math.floor(Number(record.amount))
    const paymentMethod = record.payment_method?.trim() ?? ''

    if (!paymentMethod) {
      toast.error('当前订单缺少支付方式，无法继续支付')
      return
    }

    if (!amount || amount < 1) {
      toast.error('当前订单金额无效，无法继续支付')
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/newapi/user/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
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
      toast.success('已重新打开支付页面')
    } catch {
      toast.error('支付请求失败')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center'>
        <div className='inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-strong)] p-1'>
          {[
            { key: 'balance', label: '余额' },
            { key: 'subscription', label: '订阅' },
          ].map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type='button'
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                    : 'text-[var(--muted-strong)] hover:text-[var(--foreground)]'
                )}
                onClick={() => setActiveTab(tab.key as 'balance' | 'subscription')}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{activeTab === 'balance' ? '充值余额' : '订阅状态'}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {activeTab === 'balance' ? (
            info?.enable_online_topup && epayMethods.length ? (
              <>
                <div className='space-y-1'>
                  <p className='text-sm text-[var(--muted)]'>支付人民币，到账美元</p>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4'>
                    <p className='text-sm text-[var(--muted)]'>当前余额</p>
                    <p className='mt-2 text-2xl font-semibold text-[var(--foreground)]'>
                      {currentBalanceLabel}
                    </p>
                  </div>
                  <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4'>
                    <p className='text-sm text-[var(--muted)]'>充值兑换比例</p>
                    <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                      {ratioLabel}
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  <Label>充值额度</Label>
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
                          ${formatNumber(amount)}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    type='number'
                    min={Math.max(1, currentMinTopup)}
                    value={selectedAmount || ''}
                    onChange={(event) => setSelectedAmount(Number(event.target.value) || 0)}
                    placeholder={`输入到账美元，最低 $${formatNumber(currentMinTopup)}`}
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

                <Button className='w-full' onClick={() => void handleTopup()} disabled={processing}>
                  {processing ? '处理中...' : '立即充值'}
                </Button>
              </>
            ) : (
              <EmptyState title='当前未开放充值' />
            )
          ) : subs.length ? (
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
                    {hasActionColumn ? <Th>操作</Th> : null}
                    <Th>创建时间</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <Td className='font-mono text-xs'>{record.trade_no}</Td>
                      <Td>{formatNumber(record.money)}</Td>
                      <Td>{formatNumber(record.amount)}</Td>
                      <Td>{formatPaymentMethod(record.payment_method)}</Td>
                      <Td>
                        <Badge tone={getTopupStatusTone(record.status)}>
                          {formatTopupStatus(record.status)}
                        </Badge>
                      </Td>
                      {hasActionColumn ? (
                        <Td>
                          {canRetryTopup(record, epayMethods) ? (
                            <Button
                              variant='secondary'
                              size='sm'
                              disabled={processing}
                              onClick={() => void handleRetryPayment(record)}
                            >
                              {processing ? '跳转中...' : '继续支付'}
                            </Button>
                          ) : (
                            '-'
                          )}
                        </Td>
                      ) : null}
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

function formatUsdBalance(value: number, status?: SystemStatus) {
  if (!Number.isFinite(value)) {
    return '$0.00'
  }

  const quotaPerUnit = Number(status?.quota_per_unit ?? 500000)
  const amountUSD = quotaPerUnit > 0 ? value / quotaPerUnit : 0

  return `$${new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: amountUSD >= 100 ? 0 : 2,
    maximumFractionDigits: amountUSD >= 100 ? 0 : 4,
  }).format(amountUSD)}`
}

function formatPaymentMethod(value?: string) {
  if (!value) {
    return '-'
  }

  const normalized = value.toLowerCase()

  switch (normalized) {
    case 'alipay':
      return '支付宝'
    case 'wxpay':
    case 'wechat':
    case 'wechatpay':
      return '微信支付'
    case 'stripe':
      return 'Stripe'
    case 'creem':
      return 'Creem'
    case 'waffo':
      return 'Waffo'
    case 'waffo_pancake':
      return 'Waffo Pancake'
    default:
      return value
  }
}

function formatTopupStatus(status?: string) {
  if (!status) {
    return '-'
  }

  switch (status.toLowerCase()) {
    case 'pending':
      return '待支付'
    case 'success':
      return '支付成功'
    case 'failed':
      return '支付失败'
    case 'expired':
      return '已过期'
    default:
      return status
  }
}

function getTopupStatusTone(status?: string): 'default' | 'success' | 'warning' {
  switch (status?.toLowerCase()) {
    case 'success':
      return 'success'
    case 'pending':
      return 'warning'
    default:
      return 'default'
  }
}

function canRetryTopup(
  record: TopupRecord,
  epayMethods: Array<{ type: string }>
) {
  if (record.status !== 'pending') {
    return false
  }

  const paymentMethod = record.payment_method?.trim().toLowerCase()

  if (!paymentMethod) {
    return false
  }

  return epayMethods.some((method) => method.type.toLowerCase() === paymentMethod)
}
