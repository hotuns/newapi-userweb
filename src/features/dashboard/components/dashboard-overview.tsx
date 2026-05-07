'use client'

import Link from 'next/link'
import { useEffect, useDeferredValue, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  Activity,
  Copy,
  ExternalLink,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { BillingPage } from '@/features/billing/components/billing-page'
import { KeysPage } from '@/features/keys/components/keys-page'
import { ProfileSettingsForm } from '@/features/settings/components/profile-settings-form'
import { SecuritySettingsForm } from '@/features/settings/components/security-settings-form'
import { UserMenu } from '@/components/shell/user-menu'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, TableBody, TableHead, TableWrapper, Td, Th } from '@/components/ui/table'
import { buildGenericChatLaunchUrl, parseGenericChatTemplates } from '@/lib/chat-links'
import { buildQueryString, cn, formatDateTime, formatNumber } from '@/lib/utils'
import type {
  ApiResponse,
  LogStats,
  PaginatedResponse,
  QuotaDataPoint,
  SubscriptionPlan,
  SubscriptionSummary,
  SystemStatus,
  TokenRecord,
  TopupInfo,
  TopupRecord,
  UsageLog,
  UserProfile,
} from '@/types/api'

type RangeKey = 'today' | '3d' | '7d'

type DashboardOverviewProps = {
  status: ApiResponse<SystemStatus>
  profile: ApiResponse<UserProfile>
  userModels: ApiResponse<string[]>
  tokens: PaginatedResponse<TokenRecord>
  subscription: ApiResponse<SubscriptionSummary>
  subscriptionPlans: ApiResponse<Array<{ plan: SubscriptionPlan }>>
  trendToday: ApiResponse<QuotaDataPoint[]>
  trendThreeDays: ApiResponse<QuotaDataPoint[]>
  trendSevenDays: ApiResponse<QuotaDataPoint[]>
  initialLogs: PaginatedResponse<UsageLog>
  initialLogStats: ApiResponse<LogStats>
  topupInfo: ApiResponse<TopupInfo>
  topupRecords: PaginatedResponse<TopupRecord>
  apiBaseUrl: string
  renderedAtMs: number
}

type ChartBucket = {
  timestamp: number
  label: string
  quota: number
  tokenUsed: number
  count: number
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: 'today', label: '今日', days: 1 },
  { key: '3d', label: '三天', days: 3 },
  { key: '7d', label: '七天', days: 7 },
]

function getRangeWindow(range: RangeKey) {
  const now = new Date()
  const end = Math.floor(now.getTime() / 1000)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  if (range === '3d') {
    start.setDate(start.getDate() - 2)
  }

  if (range === '7d') {
    start.setDate(start.getDate() - 6)
  }

  return {
    startTimestamp: Math.floor(start.getTime() / 1000),
    endTimestamp: end,
  }
}

function toHourBucket(timestamp: number) {
  return timestamp - (timestamp % 3600)
}

function formatChartLabel(timestamp: number, range: RangeKey) {
  const date = new Date(timestamp * 1000)

  if (range === 'today') {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (range === '3d') {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
    }).format(date)
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function buildChartBuckets(points: QuotaDataPoint[] | undefined, range: RangeKey) {
  const lookup = new Map<number, ChartBucket>()

  for (const point of points ?? []) {
    const bucketTime = toHourBucket(point.created_at)
    const current = lookup.get(bucketTime) ?? {
      timestamp: bucketTime,
      label: formatChartLabel(bucketTime, range),
      quota: 0,
      tokenUsed: 0,
      count: 0,
    }

    current.quota += Number(point.quota ?? 0)
    current.tokenUsed += Number(point.token_used ?? 0)
    current.count += Number(point.count ?? 0)
    lookup.set(bucketTime, current)
  }

  const { startTimestamp, endTimestamp } = getRangeWindow(range)
  const startHour = toHourBucket(startTimestamp)
  const endHour = toHourBucket(endTimestamp)
  const buckets: ChartBucket[] = []

  for (let cursor = startHour; cursor <= endHour; cursor += 3600) {
    buckets.push(
      lookup.get(cursor) ?? {
        timestamp: cursor,
        label: formatChartLabel(cursor, range),
        quota: 0,
        tokenUsed: 0,
        count: 0,
      }
    )
  }

  return buckets
}

function sumBuckets(buckets: ChartBucket[]) {
  return buckets.reduce(
    (total, bucket) => ({
      quota: total.quota + bucket.quota,
      tokenUsed: total.tokenUsed + bucket.tokenUsed,
      count: total.count + bucket.count,
    }),
    { quota: 0, tokenUsed: 0, count: 0 }
  )
}

function formatQuotaValue(value: number, status?: SystemStatus) {
  const displayType = status?.quota_display_type ?? 'TOKENS'
  const quotaPerUnit = Number(status?.quota_per_unit ?? 500000)
  const usdRate = Number(status?.usd_exchange_rate ?? 1)
  const customRate = Number(status?.custom_currency_exchange_rate ?? 1)
  const customSymbol = status?.custom_currency_symbol?.trim() || '¤'

  if (!Number.isFinite(value)) {
    return '-'
  }

  if (displayType === 'TOKENS') {
    return formatNumber(value)
  }

  const amountUSD = value / quotaPerUnit

  if (displayType === 'CNY') {
    return `¥${formatCurrency(amountUSD * usdRate)}`
  }

  if (displayType === 'CUSTOM') {
    return `${customSymbol}${formatCurrency(amountUSD * customRate)}`
  }

  return `$${formatCurrency(amountUSD)}`
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: value >= 100 ? 0 : 2,
    maximumFractionDigits: value >= 100 ? 0 : 4,
  }).format(value)
}

function getQuotaLabel(status?: SystemStatus) {
  const displayType = status?.quota_display_type ?? 'TOKENS'
  if (displayType === 'TOKENS') {
    return 'Tokens'
  }
  if (displayType === 'CNY') {
    return 'CNY'
  }
  if (displayType === 'CUSTOM') {
    return status?.custom_currency_symbol?.trim() || '自定义货币'
  }
  return 'USD'
}

function getResetTarget(subscription: SubscriptionSummary | undefined, nowMs: number) {
  const active = subscription?.subscriptions?.find(
    (item) => item.subscription?.status === 'active'
  )
  const nextReset = Number(active?.subscription?.next_reset_time ?? 0)

  if (nextReset * 1000 > nowMs) {
    return nextReset * 1000
  }

  const nextMidnight = new Date(nowMs)
  nextMidnight.setHours(24, 0, 0, 0)
  return nextMidnight.getTime()
}

function formatCountdown(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs)
  const totalMinutes = Math.floor(diff / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days} 天 ${hours} 小时`
  }

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`
  }

  return `${minutes} 分钟`
}

function getTokenStatusLabel(status: number) {
  if (status === 1) return '启用中'
  if (status === 2) return '已禁用'
  return '已过期'
}

function getTokenStatusTone(status: number): 'default' | 'success' | 'warning' {
  if (status === 1) return 'success'
  if (status === 2) return 'default'
  return 'warning'
}

function buildUsagePath(points: number[], width: number, height: number) {
  if (!points.length) {
    return ''
  }

  const maxValue = Math.max(...points, 1)
  const stepX = points.length === 1 ? width : width / (points.length - 1)

  return points
    .map((point, index) => {
      const x = index * stepX
      const y = height - (point / maxValue) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildUsageArea(points: number[], width: number, height: number) {
  const linePath = buildUsagePath(points, width, height)
  if (!linePath) {
    return ''
  }

  return `${linePath} L ${width} ${height} L 0 ${height} Z`
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const json = (await response.json()) as T & {
    success?: boolean
    message?: string
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.message || '请求失败')
  }

  return json
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const input = document.createElement('textarea')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
}

function UsageTrendChart({
  buckets,
  status,
}: {
  buckets: ChartBucket[]
  status?: SystemStatus
}) {
  const values = buckets.map((bucket) => bucket.quota)
  const linePath = buildUsagePath(values, 1000, 260)
  const areaPath = buildUsageArea(values, 1000, 260)
  const peak = Math.max(...values, 0)
  const total = sumBuckets(buckets)
  const labelIndexes = [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1]

  return (
    <div className='space-y-4'>
      <div className='relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border)] bg-[linear-gradient(180deg,#fbfdfd,#f1f7f5)] px-4 py-5'>
        <div className='pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(16,163,127,0.10),transparent_68%)]' />
        <svg
          viewBox='0 0 1000 320'
          className='relative z-10 h-64 w-full'
          preserveAspectRatio='none'
        >
          <defs>
            <linearGradient id='usage-area' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='rgba(16,163,127,0.18)' />
              <stop offset='100%' stopColor='rgba(16,163,127,0.02)' />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1='0'
              x2='1000'
              y1={260 - 260 * ratio}
              y2={260 - 260 * ratio}
              stroke='rgba(15,23,42,0.08)'
              strokeDasharray='6 10'
            />
          ))}
          {areaPath ? <path d={areaPath} fill='url(#usage-area)' /> : null}
          {linePath ? (
            <path
              d={linePath}
              fill='none'
              stroke='rgba(11,140,107,0.92)'
              strokeWidth='4'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          ) : null}
        </svg>
        <div className='relative z-10 mt-3 flex items-center justify-between text-xs text-[var(--muted)]'>
          {labelIndexes.map((index) => (
            <span key={`${buckets[index]?.timestamp ?? index}-${index}`}>
              {buckets[index]?.label ?? '-'}
            </span>
          ))}
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4'>
          <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>
            区间消耗
          </p>
          <p className='mt-2 text-xl font-semibold text-[var(--foreground)]'>
            {formatQuotaValue(total.quota, status)}
          </p>
        </div>
        <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4'>
          <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>
            区间请求
          </p>
          <p className='mt-2 text-xl font-semibold text-[var(--foreground)]'>
            {formatNumber(total.count)}
          </p>
        </div>
        <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4'>
          <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>
            峰值小时
          </p>
          <p className='mt-2 text-xl font-semibold text-[var(--foreground)]'>
            {formatQuotaValue(peak, status)}
          </p>
        </div>
      </div>
    </div>
  )
}

export function DashboardOverview({
  status,
  profile,
  userModels,
  tokens,
  subscription,
  subscriptionPlans,
  trendToday,
  trendThreeDays,
  trendSevenDays,
  initialLogs,
  initialLogStats,
  topupInfo,
  topupRecords,
  apiBaseUrl,
  renderedAtMs,
}: DashboardOverviewProps) {
  const systemStatus = status.data
  const user = profile.data
  const userModelList = userModels.data ?? []
  const planList = subscriptionPlans.data ?? []
  const activeSubscription =
    subscription.data?.subscriptions?.find((item) => item.subscription?.status === 'active') ??
    null
  const activePlan =
    activeSubscription?.plan ??
    planList.find((item) => item.plan.id === activeSubscription?.subscription?.plan_id)?.plan
  const todayBuckets = buildChartBuckets(trendToday.data, 'today')
  const threeDayBuckets = buildChartBuckets(trendThreeDays.data, '3d')
  const sevenDayBuckets = buildChartBuckets(trendSevenDays.data, '7d')
  const todaySummary = sumBuckets(todayBuckets)
  const dashboardTokens = tokens.data?.items ?? []
  const genericChatTemplates = parseGenericChatTemplates(systemStatus?.chats)

  const [range, setRange] = useState<RangeKey>('today')
  const [modelFilter, setModelFilter] = useState('')
  const [tokenFilter, setTokenFilter] = useState('')
  const [requestIdFilter, setRequestIdFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedChatTemplateName, setSelectedChatTemplateName] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Record<number, string>>({})
  const [loadingTokenId, setLoadingTokenId] = useState<number | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideTokenValue, setGuideTokenValue] = useState('')
  const [keysOpen, setKeysOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [nowMs, setNowMs] = useState(renderedAtMs)

  const deferredModelFilter = useDeferredValue(modelFilter.trim())
  const deferredTokenFilter = useDeferredValue(tokenFilter.trim())
  const deferredRequestIdFilter = useDeferredValue(requestIdFilter.trim())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  const selectedToken = dashboardTokens[0] ?? null
  const activeChatTemplateName =
    selectedChatTemplateName &&
    genericChatTemplates.some((template) => template.name === selectedChatTemplateName)
      ? selectedChatTemplateName
      : genericChatTemplates[0]?.name ?? ''
  const activeChatTemplate =
    genericChatTemplates.find((template) => template.name === activeChatTemplateName) ?? null

  const currentBuckets =
    range === 'today'
      ? todayBuckets
      : range === '3d'
        ? threeDayBuckets
        : sevenDayBuckets

  const resetTarget = getResetTarget(subscription.data, nowMs)
  const remainingPackageQuota = Math.max(
    0,
    Number(activeSubscription?.subscription?.amount_total ?? 0) -
      Number(activeSubscription?.subscription?.amount_used ?? 0)
  )

  const rangeWindow = getRangeWindow(range)
  const logQuery = buildQueryString({
    p: page,
    page_size: 10,
    start_timestamp: rangeWindow.startTimestamp,
    end_timestamp: rangeWindow.endTimestamp,
    model_name: deferredModelFilter,
    token_name: deferredTokenFilter,
    request_id: deferredRequestIdFilter,
  })

  const statsQuery = buildQueryString({
    start_timestamp: rangeWindow.startTimestamp,
    end_timestamp: rangeWindow.endTimestamp,
    model_name: deferredModelFilter,
    token_name: deferredTokenFilter,
  })

  const logsQuery = useQuery({
    queryKey: [
      'dashboard-logs',
      range,
      page,
      deferredModelFilter,
      deferredTokenFilter,
      deferredRequestIdFilter,
    ],
    queryFn: () =>
      fetchJson<PaginatedResponse<UsageLog>>(`/api/newapi/log/self?${logQuery}`),
    placeholderData: keepPreviousData,
    initialData: range === 'today' && page === 1 ? initialLogs : undefined,
  })

  const logStatsQuery = useQuery({
    queryKey: ['dashboard-log-stats', range, deferredModelFilter, deferredTokenFilter],
    queryFn: () =>
      fetchJson<ApiResponse<LogStats>>(`/api/newapi/log/self/stat?${statsQuery}`),
    initialData:
      range === 'today' &&
      deferredModelFilter === '' &&
      deferredTokenFilter === ''
        ? initialLogStats
        : undefined,
  })

  async function loadFullTokenValue(tokenId: number) {
    if (revealedKeys[tokenId]) {
      return revealedKeys[tokenId]
    }

    setLoadingTokenId(tokenId)

    try {
      const json = await fetchJson<ApiResponse<{ key: string }>>(
        `/api/newapi/token/${tokenId}/key`,
        { method: 'POST' }
      )
      const fullKey = json.data?.key ?? ''

      if (fullKey) {
        setRevealedKeys((current) => ({
          ...current,
          [tokenId]: fullKey,
        }))
      }

      return fullKey
    } finally {
      setLoadingTokenId(null)
    }
  }

  async function handleCopyToken(token: TokenRecord) {
    try {
      const fullKey = await loadFullTokenValue(token.id)
      if (!fullKey) {
        throw new Error('没有读取到完整令牌')
      }
      await copyText(fullKey)
      toast.success('令牌已复制')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '复制失败')
    }
  }

  async function handleOpenGuide(token: TokenRecord) {
    try {
      const fullKey = await loadFullTokenValue(token.id)
      setGuideTokenValue(fullKey || token.key)
      setGuideOpen(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '无法生成接入示例')
    }
  }

  async function handleOpenChatTemplate(token: TokenRecord) {
    if (!activeChatTemplate) {
      toast.error('当前没有可用的聊天工具模板')
      return
    }

    try {
      const fullKey = await loadFullTokenValue(token.id)
      if (!fullKey) {
        throw new Error('没有读取到完整令牌')
      }

      const launchUrl = buildGenericChatLaunchUrl(
        activeChatTemplate.template,
        apiBaseUrl,
        fullKey
      )
      window.open(launchUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打开聊天工具失败')
    }
  }

  const logs = logsQuery.data?.data?.items ?? []
  const totalLogs = logsQuery.data?.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalLogs / 10))
  const usageStats = logStatsQuery.data?.data

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[rgba(255,255,255,0.92)] px-5 py-4 shadow-[var(--shadow-soft)] md:flex-row md:items-center md:justify-between'>
          <div>
            <div className='flex flex-wrap items-center gap-3 text-sm text-[var(--muted)]'>
              <Link href='/' className='flex items-center gap-2 font-medium text-[var(--muted-strong)] hover:text-[var(--foreground)]'>
                <Sparkles className='size-4 text-[var(--accent)]' />
                MoreToken
              </Link>
              <div className='hidden h-4 w-px bg-[var(--border)] md:block' />
              <div className='hidden items-center gap-3 md:flex'>
                <Link href='/' className='hover:text-[var(--foreground)]'>
                  首页
                </Link>
                <Link href='/models' className='hover:text-[var(--foreground)]'>
                  模型与价格
                </Link>
                <Link href='/tutorial' className='hover:text-[var(--foreground)]'>
                  教程
                </Link>
              </div>
            </div>
            <h1 className='mt-2 text-2xl font-semibold text-[var(--foreground)]'>
              {user?.display_name || user?.username || '控制台'}
            </h1>
          </div>

          <div className='flex flex-wrap items-center gap-3'>
            <div className='hidden rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--muted-strong)] lg:block'>
              模型 {formatNumber(userModelList.length)} 个 · 请求 {formatNumber(user?.request_count ?? 0)} 次
            </div>
            {user ? (
              <UserMenu
                profile={user}
                onOpenProfile={() => setProfileOpen(true)}
                onOpenSecurity={() => setSecurityOpen(true)}
                onOpenBilling={() => setBillingOpen(true)}
                onOpenKeys={() => setKeysOpen(true)}
              />
            ) : null}
          </div>
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]'>
          <Card className='bg-[rgba(255,255,255,0.92)]'>
            <CardHeader className='gap-4 pb-5'>
              <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
                <div>
                  <CardTitle className='mt-2 text-3xl text-[var(--foreground)]'>用量趋势</CardTitle>
                </div>

                <div className='inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-strong)] p-1'>
                  {RANGE_OPTIONS.map((item) => (
                    <button
                      key={item.key}
                      type='button'
                      onClick={() => {
                        setRange(item.key)
                        setPage(1)
                      }}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium text-[var(--muted-strong)]',
                        range === item.key &&
                          'bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-card)]'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-5 px-6 py-6'>
              <UsageTrendChart buckets={currentBuckets} status={systemStatus} />

              <div className='grid gap-4 border-t border-[var(--border)] pt-5 md:grid-cols-3'>
                <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4'>
                  <p className='text-sm text-[var(--muted)]'>今日花费</p>
                  <p className='mt-2 text-2xl font-semibold text-[var(--foreground)]'>
                    {formatQuotaValue(todaySummary.quota, systemStatus)}
                  </p>
                  <p className='mt-2 text-xs text-[var(--muted)]'>
                    单位：{getQuotaLabel(systemStatus)}
                  </p>
                </div>
                <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4'>
                  <p className='text-sm text-[var(--muted)]'>剩余额度</p>
                  <p className='mt-2 text-2xl font-semibold text-[var(--foreground)]'>
                    {formatQuotaValue(Number(user?.quota ?? 0), systemStatus)}
                  </p>
                  <p className='mt-2 text-xs text-[var(--muted)]'>
                    今日调用 {formatNumber(todaySummary.count)} 次
                  </p>
                </div>
                <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4'>
                  <p className='text-sm text-[var(--muted)]'>距离重置</p>
                  <p className='mt-2 text-2xl font-semibold text-[var(--foreground)]'>
                    {formatCountdown(resetTarget, nowMs)}
                  </p>
                  <p className='mt-2 text-xs text-[var(--muted)]'>
                    {activeSubscription?.subscription?.next_reset_time
                      ? formatDateTime(activeSubscription.subscription.next_reset_time)
                      : '每日 00:00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='space-y-6'>
            <Card className='overflow-hidden border-0 bg-[linear-gradient(145deg,#0f1720_0%,#12352b_42%,#10a37f_100%)] text-white shadow-[0_28px_80px_rgba(15,23,42,0.24)]'>
              <CardHeader className='border-b border-[rgba(255,255,255,0.08)]'>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <CardTitle className='flex items-center gap-2'>
                      <Wallet className='size-5 text-[#bbf7d0]' />
                      余额与套餐
                    </CardTitle>
                  </div>
                  {activeSubscription ? <Badge tone='success'>套餐生效中</Badge> : <Badge>无套餐</Badge>}
                </div>
              </CardHeader>
              <CardContent className='space-y-4 px-6 py-6'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur'>
                    <p className='text-sm text-[rgba(236,253,245,0.72)]'>账户余额</p>
                    <p className='mt-2 text-2xl font-semibold text-white'>
                      {formatQuotaValue(Number(user?.quota ?? 0), systemStatus)}
                    </p>
                  </div>
                  <div className='rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur'>
                    <p className='text-sm text-[rgba(236,253,245,0.72)]'>套餐剩余额度</p>
                    <p className='mt-2 text-2xl font-semibold text-white'>
                      {activeSubscription
                        ? formatQuotaValue(remainingPackageQuota, systemStatus)
                        : '-'}
                    </p>
                  </div>
                </div>

                {activeSubscription ? (
                  <div className='rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='text-lg font-semibold text-white'>
                          {activePlan?.title || `套餐 #${activeSubscription.subscription.plan_id}`}
                        </p>
                        {activePlan?.subtitle ? (
                          <p className='mt-1 text-sm text-[rgba(236,253,245,0.72)]'>{activePlan.subtitle}</p>
                        ) : null}
                      </div>
                      <Badge tone='warning'>
                        {subscription.data?.billing_preference || 'subscription_first'}
                      </Badge>
                    </div>

                    <div className='mt-4 grid gap-4 sm:grid-cols-2'>
                      <div>
                        <p className='text-xs uppercase tracking-[0.18em] text-[rgba(236,253,245,0.68)]'>
                          已用 / 总量
                        </p>
                        <p className='mt-2 text-base font-semibold text-white'>
                          {formatQuotaValue(
                            Number(activeSubscription.subscription.amount_used ?? 0),
                            systemStatus
                          )}{' '}
                          /{' '}
                          {formatQuotaValue(
                            Number(activeSubscription.subscription.amount_total ?? 0),
                            systemStatus
                          )}
                        </p>
                      </div>
                      <div>
                        <p className='text-xs uppercase tracking-[0.18em] text-[rgba(236,253,245,0.68)]'>
                          有效期
                        </p>
                        <p className='mt-2 text-base font-semibold text-white'>
                          {formatDateTime(activeSubscription.subscription.start_time)} 至{' '}
                          {formatDateTime(activeSubscription.subscription.end_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    title='当前没有启用中的套餐'
                    description='可直接使用账户余额。'
                  />
                )}

                <div className='flex items-center justify-between rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-4 text-sm text-[rgba(236,253,245,0.78)]'>
                  <span>
                    可用模型 {formatNumber(userModelList.length)} 个，历史请求{' '}
                    {formatNumber(user?.request_count ?? 0)} 次
                  </span>
                  <Button size='sm' variant='secondary' onClick={() => setBillingOpen(true)}>
                    查看账单
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className='border-[rgba(69,61,45,0.1)] bg-[rgba(255,253,247,0.92)]'>
              <CardHeader>
                <div className='flex items-start justify-between gap-4'>
                  <div>
                    <CardTitle className='flex items-center gap-2'>
                      <KeyRound className='size-5 text-[var(--accent)]' />
                      令牌管理
                    </CardTitle>
                  </div>
                  <Badge tone={selectedToken ? getTokenStatusTone(selectedToken.status) : 'default'}>
                    {selectedToken ? getTokenStatusLabel(selectedToken.status) : '暂无令牌'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {selectedToken ? (
                  <>
                    <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <p className='text-lg font-semibold text-[var(--foreground)]'>
                            {selectedToken.name}
                          </p>
                          <p className='mt-2 font-mono text-xs text-[var(--muted-strong)]'>
                            {revealedKeys[selectedToken.id] || selectedToken.key}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Button
                            size='sm'
                            variant='secondary'
                            onClick={() => void handleCopyToken(selectedToken)}
                            disabled={loadingTokenId === selectedToken.id}
                          >
                            {loadingTokenId === selectedToken.id ? (
                              <RefreshCw className='mr-2 size-4 animate-spin' />
                            ) : (
                              <Copy className='mr-2 size-4' />
                            )}
                            复制
                          </Button>
                          <Button
                            size='sm'
                            onClick={() => void handleOpenGuide(selectedToken)}
                            disabled={loadingTokenId === selectedToken.id}
                          >
                            <ExternalLink className='mr-2 size-4' />
                            使用
                          </Button>
                        </div>
                      </div>
                    </div>

                    {genericChatTemplates.length ? (
                      <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4'>
                        <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                          <div className='min-w-0 flex-1'>
                            <p className='text-sm font-medium text-[var(--foreground)]'>
                              聊天工具
                            </p>
                            <p className='mt-1 text-xs text-[var(--muted)]'>
                              使用管理员配置的通用模板打开外部聊天工具。
                            </p>
                          </div>
                          <div className='grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-center'>
                            <Select
                              value={activeChatTemplateName}
                              onChange={(event) => setSelectedChatTemplateName(event.target.value)}
                              aria-label='选择聊天工具'
                            >
                              {genericChatTemplates.map((template) => (
                                <option key={template.name} value={template.name}>
                                  {template.name}
                                </option>
                              ))}
                            </Select>
                            <Button
                              size='sm'
                              onClick={() => void handleOpenChatTemplate(selectedToken)}
                              disabled={loadingTokenId === selectedToken.id}
                            >
                              <ExternalLink className='mr-2 size-4' />
                              打开
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : systemStatus?.chats?.length ? (
                      <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]'>
                        当前已配置聊天工具，但模板需要专用适配。MoreToken 暂仅支持
                        <code className='mx-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-xs text-[var(--foreground)]'>
                          {'{address}'}
                        </code>
                        和
                        <code className='mx-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-xs text-[var(--foreground)]'>
                          {'{key}'}
                        </code>
                        这类通用模板。
                      </div>
                    ) : null}

                    <div className='grid gap-4 sm:grid-cols-3'>
                      <div className='rounded-[var(--radius-lg)] border border-[var(--border)] p-4'>
                        <p className='text-sm text-[var(--muted)]'>令牌额度</p>
                        <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                          {selectedToken.unlimited_quota
                            ? '无限'
                            : formatQuotaValue(selectedToken.remain_quota, systemStatus)}
                        </p>
                      </div>
                      <div className='rounded-[var(--radius-lg)] border border-[var(--border)] p-4'>
                        <p className='text-sm text-[var(--muted)]'>所属分组</p>
                        <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                          {selectedToken.group || 'default'}
                        </p>
                      </div>
                      <div className='rounded-[var(--radius-lg)] border border-[var(--border)] p-4'>
                        <p className='text-sm text-[var(--muted)]'>最近访问</p>
                        <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                          {formatDateTime(selectedToken.accessed_time)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title='还没有可用令牌'
                    description='创建第一个 API Key 后会显示在这里。'
                  />
                )}

                <div className='flex flex-wrap gap-3'>
                  <Button variant='secondary' onClick={() => setKeysOpen(true)}>
                    <ShieldCheck className='mr-2 size-4' />
                    管理全部令牌
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className='border-[rgba(69,61,45,0.1)] bg-[rgba(255,253,247,0.92)]'>
          <CardHeader className='gap-4'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <Activity className='size-5 text-[var(--accent)]' />
                  用量明细
                </CardTitle>
              </div>
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] px-4 py-3'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>区间消耗</p>
                  <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                    {formatQuotaValue(Number(usageStats?.quota ?? 0), systemStatus)}
                  </p>
                </div>
                <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] px-4 py-3'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>RPM</p>
                  <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                    {formatNumber(usageStats?.rpm ?? 0)}
                  </p>
                </div>
                <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] px-4 py-3'>
                  <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>TPM</p>
                  <p className='mt-2 text-lg font-semibold text-[var(--foreground)]'>
                    {formatNumber(usageStats?.tpm ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_180px_minmax(0,1fr)_auto]'>
              <Select
                value={range}
                onChange={(event) => {
                  setRange(event.target.value as RangeKey)
                  setPage(1)
                }}
              >
                {RANGE_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </Select>

              <Select
                value={tokenFilter}
                onChange={(event) => {
                  setTokenFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option value=''>全部令牌</option>
                {dashboardTokens.map((token) => (
                  <option key={token.id} value={token.name}>
                    {token.name}
                  </option>
                ))}
              </Select>

              <Select
                value={modelFilter}
                onChange={(event) => {
                  setModelFilter(event.target.value)
                  setPage(1)
                }}
              >
                <option value=''>全部模型</option>
                {userModelList.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </Select>

              <Input
                value={requestIdFilter}
                onChange={(event) => {
                  setRequestIdFilter(event.target.value)
                  setPage(1)
                }}
                placeholder='筛选 Request ID'
              />
            </div>
          </CardHeader>

          <CardContent className='space-y-4'>
            {logsQuery.isError ? (
              <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-6 text-sm text-[var(--danger)]'>
                {logsQuery.error instanceof Error ? logsQuery.error.message : '日志加载失败'}
              </div>
            ) : logsQuery.isLoading ? (
              <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]'>
                正在加载日志...
              </div>
            ) : logs.length ? (
              <>
                <TableWrapper>
                  <Table>
                    <TableHead>
                      <tr>
                        <Th>时间</Th>
                        <Th>模型</Th>
                        <Th>令牌</Th>
                        <Th>Request ID</Th>
                        <Th>花费</Th>
                        <Th>输入 Tokens</Th>
                        <Th>输出 Tokens</Th>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {logs.map((log) => (
                        <tr key={`${log.id}-${log.request_id ?? log.created_at ?? 'row'}`}>
                          <Td>{formatDateTime(log.created_at, 'seconds')}</Td>
                          <Td>{log.model_name || '-'}</Td>
                          <Td>{log.token_name || '-'}</Td>
                          <Td className='max-w-48 font-mono text-xs text-[var(--muted-strong)]'>
                            {log.request_id || '-'}
                          </Td>
                          <Td>{formatQuotaValue(log.quota, systemStatus)}</Td>
                          <Td>{formatNumber(log.prompt_tokens ?? 0)}</Td>
                          <Td>{formatNumber(log.completion_tokens ?? 0)}</Td>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                </TableWrapper>

                <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <p className='text-sm text-[var(--muted)]'>
                    当前第 {page} / {totalPages} 页，共 {formatNumber(totalLogs)} 条
                  </p>
                  <div className='flex gap-2'>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState
                title='当前筛选条件下没有日志'
                description='没有匹配记录。'
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title='令牌使用教程'
      >
        <div className='space-y-6 p-6'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
              <p className='text-sm text-[var(--muted)]'>Base URL</p>
              <p className='mt-2 break-all font-mono text-sm text-[var(--foreground)]'>
                {apiBaseUrl}
              </p>
            </div>
            <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
              <p className='text-sm text-[var(--muted)]'>认证头</p>
              <p className='mt-2 break-all font-mono text-sm text-[var(--foreground)]'>
                Authorization: Bearer {guideTokenValue || 'YOUR_API_KEY'}
              </p>
            </div>
            <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
              <p className='text-sm text-[var(--muted)]'>推荐模型</p>
              <p className='mt-2 text-sm font-semibold text-[var(--foreground)]'>
                {userModelList[0] || '从模型页选择'}
              </p>
            </div>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='font-medium text-[var(--foreground)]'>curl 示例</p>
              <Button
                size='sm'
                variant='secondary'
                onClick={() =>
                  void copyText(`curl ${apiBaseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${guideTokenValue || 'YOUR_API_KEY'}" \\
  -d '{
    "model": "${userModelList[0] || 'gpt-4o-mini'}",
    "messages": [{"role": "user", "content": "你好"}]
  }'`).then(() => toast.success('curl 示例已复制'))
                }
              >
                <Copy className='mr-2 size-4' />
                复制
              </Button>
            </div>
            <pre className='overflow-x-auto rounded-[var(--radius-lg)] bg-[#0f1720] p-4 text-sm leading-6 text-[#e5f7f1]'>
{`curl ${apiBaseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${guideTokenValue || 'YOUR_API_KEY'}" \\
  -d '{
    "model": "${userModelList[0] || 'gpt-4o-mini'}",
    "messages": [{"role": "user", "content": "你好"}]
  }'`}
            </pre>
          </div>

          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <p className='font-medium text-[var(--foreground)]'>JavaScript 示例</p>
              <Button
                size='sm'
                variant='secondary'
                onClick={() =>
                  void copyText(`const response = await fetch('${apiBaseUrl}/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ${guideTokenValue || 'YOUR_API_KEY'}',
  },
  body: JSON.stringify({
    model: '${userModelList[0] || 'gpt-4o-mini'}',
    messages: [{ role: 'user', content: '你好' }],
  }),
})

const data = await response.json()
console.log(data)`).then(() => toast.success('JS 示例已复制'))
                }
              >
                <Copy className='mr-2 size-4' />
                复制
              </Button>
            </div>
            <pre className='overflow-x-auto rounded-[var(--radius-lg)] bg-[#0f1720] p-4 text-sm leading-6 text-[#e5f7f1]'>
{`const response = await fetch('${apiBaseUrl}/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ${guideTokenValue || 'YOUR_API_KEY'}',
  },
  body: JSON.stringify({
    model: '${userModelList[0] || 'gpt-4o-mini'}',
    messages: [{ role: 'user', content: '你好' }],
  }),
})

const data = await response.json()
console.log(data)`}
            </pre>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={keysOpen}
        onClose={() => setKeysOpen(false)}
        title='Keys 管理'
        className='max-w-6xl'
      >
        <div className='p-6'>
          <KeysPage tokens={tokens} />
        </div>
      </Dialog>

      <Dialog
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        title='账单与套餐'
        className='max-w-6xl'
      >
        <div className='p-6'>
          <BillingPage
            topupInfo={topupInfo}
            topupRecords={topupRecords}
            subscription={subscription}
            subscriptionPlans={subscriptionPlans}
          />
        </div>
      </Dialog>

      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title='个人资料'
        className='max-w-3xl'
      >
        <div className='p-6'>
          {user ? <ProfileSettingsForm profile={user} /> : null}
        </div>
      </Dialog>

      <Dialog
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        title='安全设置'
        className='max-w-3xl'
      >
        <div className='p-6'>
          <SecuritySettingsForm />
        </div>
      </Dialog>
    </>
  )
}
