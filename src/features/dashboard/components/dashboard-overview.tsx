'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useSyncExternalStore, type ComponentType } from 'react'
import { useEffect, useDeferredValue, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Activity,
  Bell,
  CheckCheck,
  ChevronDown,
  Copy,
  ExternalLink,
  House,
  KeyRound,
  Megaphone,
  RefreshCw,
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
  Announcement,
  ApiResponse,
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
  notice: ApiResponse<string>
  profile: ApiResponse<UserProfile>
  userModels: ApiResponse<string[]>
  tokens: PaginatedResponse<TokenRecord>
  subscription: ApiResponse<SubscriptionSummary>
  subscriptionPlans: ApiResponse<Array<{ plan: SubscriptionPlan }>>
  trendToday: ApiResponse<QuotaDataPoint[]>
  trendThreeDays: ApiResponse<QuotaDataPoint[]>
  trendSevenDays: ApiResponse<QuotaDataPoint[]>
  initialLogs: PaginatedResponse<UsageLog>
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

type NoticeItem = {
  id: string
  key: string
  kind: 'notice' | 'announcement'
  content: string
  publishDate?: string
  extra?: string
  type?: Announcement['type']
}

type NotificationReadState = {
  noticeKey?: string
  announcementKeys: string[]
}

const RANGE_OPTIONS: Array<{ key: RangeKey; label: string; days: number }> = [
  { key: 'today', label: '今日', days: 1 },
  { key: '3d', label: '三天', days: 3 },
  { key: '7d', label: '七天', days: 7 },
]

const NOTIFICATION_READ_STORAGE_KEY = 'newapi-userweb.notification-read-state'
const NOTIFICATION_READ_STORAGE_EVENT = 'newapi-userweb:notification-read-state'
const DEFAULT_NOTIFICATION_READ_STATE: NotificationReadState = { announcementKeys: [] }
const DEFAULT_NOTIFICATION_READ_STATE_SNAPSHOT = JSON.stringify(DEFAULT_NOTIFICATION_READ_STATE)
const SERVER_NOTIFICATION_READ_STATE_SNAPSHOT = `server:${DEFAULT_NOTIFICATION_READ_STATE_SNAPSHOT}`

function hashString(input: string): string {
  let hash = 0

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash).toString(36)
}

function getNoticeKey(content: string) {
  return `notice:${hashString(content.trim())}`
}

function getAnnouncementKey(item: Announcement, index: number) {
  if (item.id !== undefined && item.id !== null) {
    return `announcement:id:${String(item.id)}`
  }

  return `announcement:${hashString(
    JSON.stringify({
      publishDate: item.publishDate ?? '',
      content: item.content?.trim() ?? '',
      extra: item.extra?.trim() ?? '',
      type: item.type ?? '',
      index,
    })
  )}`
}

function buildNoticeItem(noticeText: string): NoticeItem | null {
  const content = noticeText.trim()

  if (!content) {
    return null
  }

  return {
    id: 'system-notice',
    key: getNoticeKey(content),
    kind: 'notice',
    content,
  }
}

function buildAnnouncementItems(announcements: Announcement[] | undefined): NoticeItem[] {
  return (announcements ?? [])
    .map((item, index) => {
      const content = item.content?.trim() ?? ''

      return {
        id: `announcement-${item.id ?? item.publishDate ?? index}`,
        key: getAnnouncementKey(item, index),
        kind: 'announcement' as const,
        content,
        publishDate: item.publishDate,
        extra: item.extra?.trim(),
        type: item.type,
      }
    })
    .filter((item) => item.content.length > 0)
}

function parseNotificationReadStateSnapshot(snapshot: string): NotificationReadState {
  try {
    const raw = snapshot.startsWith('client:') || snapshot.startsWith('server:')
      ? snapshot.slice(snapshot.indexOf(':') + 1)
      : snapshot
    const parsed = JSON.parse(raw) as Partial<NotificationReadState>

    return {
      noticeKey: typeof parsed.noticeKey === 'string' ? parsed.noticeKey : undefined,
      announcementKeys: Array.isArray(parsed.announcementKeys)
        ? parsed.announcementKeys.filter((key): key is string => typeof key === 'string')
        : [],
    }
  } catch {
    return DEFAULT_NOTIFICATION_READ_STATE
  }
}

function getNotificationReadStateSnapshot() {
  if (typeof window === 'undefined') {
    return SERVER_NOTIFICATION_READ_STATE_SNAPSHOT
  }

  return `client:${
    window.localStorage.getItem(NOTIFICATION_READ_STORAGE_KEY) ??
    DEFAULT_NOTIFICATION_READ_STATE_SNAPSHOT
  }`
}

function subscribeNotificationReadState(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === NOTIFICATION_READ_STORAGE_KEY) {
      onStoreChange()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(NOTIFICATION_READ_STORAGE_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(NOTIFICATION_READ_STORAGE_EVENT, onStoreChange)
  }
}

function saveNotificationReadState(state: NotificationReadState) {
  try {
    window.localStorage.setItem(NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event(NOTIFICATION_READ_STORAGE_EVENT))
  } catch {
    // Ignore storage failures so notifications remain usable in restricted browsers.
  }
}

function mergeReadState(
  current: NotificationReadState,
  noticeItem: NoticeItem | null,
  announcementItems: NoticeItem[]
): NotificationReadState {
  const announcementKeys = new Set(current.announcementKeys)

  for (const item of announcementItems) {
    announcementKeys.add(item.key)
  }

  return {
    noticeKey: noticeItem?.key ?? current.noticeKey,
    announcementKeys: Array.from(announcementKeys),
  }
}

function formatNoticeDate(value?: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function HeaderIconLink({
  href,
  label,
  icon,
}: {
  href: string
  label: string
  icon: ComponentType<{ className?: string }>
}) {
  const Icon = icon

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className='group relative inline-flex size-10 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[rgba(15,23,42,0.05)] hover:text-[var(--foreground)]'
    >
      <Icon className='size-4.5' />
      <span className='pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-[var(--foreground)] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--background)] opacity-0 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-opacity duration-150 group-hover:opacity-100'>
        {label}
      </span>
    </Link>
  )
}

function MarkdownNotice({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className='mt-4 text-xl font-semibold text-[var(--foreground)] first:mt-0'>
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className='mt-4 text-lg font-semibold text-[var(--foreground)] first:mt-0'>
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className='mt-4 text-base font-semibold text-[var(--foreground)] first:mt-0'>
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className='my-3 text-sm leading-7 text-[var(--muted-strong)] first:mt-0 last:mb-0'>
            {children}
          </p>
        ),
        ul: ({ children }) => (
          <ul className='my-3 list-disc space-y-1.5 pl-5 text-sm leading-7 text-[var(--muted-strong)]'>
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className='my-3 list-decimal space-y-1.5 pl-5 text-sm leading-7 text-[var(--muted-strong)]'>
            {children}
          </ol>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target='_blank'
            rel='noreferrer'
            className='font-medium text-[var(--accent-strong)] underline underline-offset-4'
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className='my-4 border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-4 py-2 text-sm text-[var(--muted-strong)]'>
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.startsWith('language-')
          if (isBlock) {
            return (
              <code className={cn(className, 'block overflow-x-auto text-xs leading-6')}>
                {children}
              </code>
            )
          }

          return (
            <code className='rounded bg-[var(--surface-strong)] px-1.5 py-0.5 font-mono text-xs text-[var(--foreground)]'>
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className='my-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--foreground)] p-4 text-[var(--background)]'>
            {children}
          </pre>
        ),
        table: ({ children }) => (
          <div className='my-4 overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]'>
            <table className='min-w-full border-collapse text-left text-sm'>{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className='border-b border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 font-semibold text-[var(--foreground)]'>
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className='border-t border-[var(--border)] px-3 py-2 text-[var(--muted-strong)]'>
            {children}
          </td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

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

function formatLatency(value?: number) {
  const duration = Number(value ?? 0)

  if (!Number.isFinite(duration) || duration <= 0) {
    return '-'
  }

  if (duration < 1000) {
    return `${Math.round(duration)} ms`
  }

  if (duration < 60_000) {
    return `${(duration / 1000).toFixed(duration >= 10_000 ? 1 : 2)} s`
  }

  return `${(duration / 60_000).toFixed(1)} min`
}

function formatLogContent(value?: string) {
  const content = value?.trim()

  if (!content) {
    return '无额外内容'
  }

  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
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
  const labelIndexes = Array.from(
    new Set([0, Math.floor((buckets.length - 1) / 2), buckets.length - 1])
  ).filter((index) => index >= 0 && index < buckets.length)

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
  notice,
  profile,
  userModels,
  tokens,
  subscription,
  subscriptionPlans,
  trendToday,
  trendThreeDays,
  trendSevenDays,
  initialLogs,
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
  const noticeText = notice.data?.trim() ?? ''
  const noticeItem = buildNoticeItem(noticeText)
  const announcementItems = buildAnnouncementItems(systemStatus?.announcements)
  const noticeItems = noticeItem ? [noticeItem, ...announcementItems] : announcementItems

  const [range, setRange] = useState<RangeKey>('today')
  const [modelFilter, setModelFilter] = useState('')
  const [tokenFilter, setTokenFilter] = useState('')
  const [requestIdFilter, setRequestIdFilter] = useState('')
  const [page, setPage] = useState(1)
  const [selectedChatTemplateName, setSelectedChatTemplateName] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Record<number, string>>({})
  const [loadingTokenId, setLoadingTokenId] = useState<number | null>(null)
  const [chatToolsOpen, setChatToolsOpen] = useState(false)
  const [chatTargetToken, setChatTargetToken] = useState<TokenRecord | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideTokenValue, setGuideTokenValue] = useState('')
  const [keysOpen, setKeysOpen] = useState(false)
  const [billingOpen, setBillingOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [expandedLogIds, setExpandedLogIds] = useState<Record<number, boolean>>({})
  const [nowMs, setNowMs] = useState(renderedAtMs)

  const deferredModelFilter = useDeferredValue(modelFilter.trim())
  const deferredTokenFilter = useDeferredValue(tokenFilter.trim())
  const deferredRequestIdFilter = useDeferredValue(requestIdFilter.trim())
  const notificationReadStateSnapshot = useSyncExternalStore(
    subscribeNotificationReadState,
    getNotificationReadStateSnapshot,
    () => SERVER_NOTIFICATION_READ_STATE_SNAPSHOT
  )
  const notificationReadStateLoaded = notificationReadStateSnapshot.startsWith('client:')
  const notificationReadState = parseNotificationReadStateSnapshot(notificationReadStateSnapshot)
  const readAnnouncementKeys = notificationReadState.announcementKeys
  const unreadNoticeCount =
    notificationReadStateLoaded && noticeItem && notificationReadState.noticeKey !== noticeItem.key
      ? 1
      : 0
  const unreadAnnouncementCount = notificationReadStateLoaded
    ? announcementItems.filter((item) => !readAnnouncementKeys.includes(item.key)).length
    : 0
  const unreadNotificationCount = unreadNoticeCount + unreadAnnouncementCount
  const hasUnreadNotifications = unreadNotificationCount > 0
  const notificationSummary = [
    noticeItem ? '通知 1 条' : '',
    announcementItems.length ? `公告 ${announcementItems.length} 条` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 60_000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!notificationReadStateLoaded || !hasUnreadNotifications) {
      return
    }

    const timer = window.setTimeout(() => {
      setNoticeOpen(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [hasUnreadNotifications, notificationReadStateLoaded])

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

  function handleOpenToolSelector(token: TokenRecord) {
    setChatTargetToken(token)
    setChatToolsOpen(true)
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

  function toggleLogExpanded(logId: number) {
    setExpandedLogIds((current) => ({
      ...current,
      [logId]: !current[logId],
    }))
  }

  function markCurrentNotificationsRead() {
    const nextState = mergeReadState(notificationReadState, noticeItem, announcementItems)

    saveNotificationReadState(nextState)
  }

  function handleCloseNotifications() {
    if (noticeItems.length > 0) {
      markCurrentNotificationsRead()
    }

    setNoticeOpen(false)
  }

  return (
    <>
      <div className='space-y-6'>
        <div className='rounded-[calc(var(--radius-xl)+0.25rem)] border border-[rgba(15,23,42,0.07)] bg-[rgba(255,255,255,0.78)] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:px-5'>
          <div className='flex items-center justify-between gap-4'>
            <Link href='/' className='inline-flex min-w-0 items-center gap-3 text-[var(--foreground)]'>
              <span className='flex size-10 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface)] ring-1 ring-[rgba(15,23,42,0.08)]'>
                <Image
                  src='/brand/moretoken-icon.png'
                  alt='MoreToken'
                  width={40}
                  height={40}
                  className='size-full object-cover'
                  priority
                />
              </span>
              <span className='truncate text-xl font-semibold tracking-[-0.04em]'>
                MoreToken
              </span>
            </Link>

            <div className='flex shrink-0 items-center gap-2.5'>
              <HeaderIconLink href='/' label='首页' icon={House} />
              <Button
                variant='ghost'
                size='sm'
                aria-label='通知与公告'
                title='通知与公告'
                className='group relative size-10 rounded-full border border-[rgba(15,23,42,0.07)] bg-[rgba(255,255,255,0.68)] p-0 text-[var(--foreground)] shadow-none hover:border-[rgba(15,23,42,0.12)] hover:bg-white'
                onClick={() => setNoticeOpen(true)}
              >
                <Bell className='size-4' />
                {hasUnreadNotifications ? (
                  <span className='absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold leading-5 text-[var(--accent-foreground)]'>
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                ) : null}
                <span className='pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-full bg-[var(--foreground)] px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--background)] opacity-0 shadow-[0_10px_30px_rgba(15,23,42,0.18)] transition-opacity duration-150 group-hover:opacity-100'>
                  通知与公告
                </span>
              </Button>
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
            <CardContent className='space-y-4 px-6 py-6'>
              <UsageTrendChart buckets={currentBuckets} status={systemStatus} />

              <div className='grid gap-3 border-t border-[var(--border)] pt-4 md:grid-cols-3'>
                <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5'>
                  <p className='text-xs text-[var(--muted)]'>今日花费</p>
                  <p className='mt-1.5 text-xl font-semibold text-[var(--foreground)]'>
                    {formatQuotaValue(todaySummary.quota, systemStatus)}
                  </p>
                </div>
                <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5'>
                  <p className='text-xs text-[var(--muted)]'>剩余额度</p>
                  <p className='mt-1.5 text-xl font-semibold text-[var(--foreground)]'>
                    {formatQuotaValue(Number(user?.quota ?? 0), systemStatus)}
                  </p>
                </div>
                <div className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5'>
                  <p className='text-xs text-[var(--muted)]'>距离重置</p>
                  <p className='mt-1.5 text-xl font-semibold text-[var(--foreground)]'>
                    {formatCountdown(resetTarget, nowMs)}
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
                    <CardTitle className='flex items-center gap-2 text-white'>
                      <Wallet className='size-5 text-[#bbf7d0]' />
                      余额与订阅
                    </CardTitle>
                  </div>
                  <Button size='sm' variant='secondary' onClick={() => setBillingOpen(true)}>
                    充值
                  </Button>
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
                    <p className='text-sm text-[rgba(236,253,245,0.72)]'>订阅剩余额度</p>
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
                          {activePlan?.title || `订阅 #${activeSubscription.subscription.plan_id}`}
                        </p>
                      </div>
                      <Badge
                        tone='warning'
                        className='border-[rgba(255,255,255,0.28)] bg-[rgba(255,255,255,0.14)] text-[#f8fafc]'
                      >
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
                  <div className='rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur'>
                    <p className='text-base font-semibold text-[#f8fafc]'>当前没有启用中的订阅</p>
                  </div>
                )}
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
                  <Button size='sm' variant='secondary' onClick={() => setKeysOpen(true)}>
                    更多
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {selectedToken ? (
                  <>
                    <div className='rounded-[var(--radius-lg)] bg-[var(--surface-strong)] p-4'>
                      <div className='flex items-start justify-between gap-4'>
                        <div>
                          <div className='flex items-center gap-2'>
                            <span
                              className={cn(
                                'inline-flex size-2.5 rounded-full',
                                selectedToken.status === 1
                                  ? 'bg-[var(--success)] shadow-[0_0_0_4px_rgba(30,125,86,0.12)]'
                                  : selectedToken.status === 2
                                    ? 'bg-[var(--muted)] shadow-[0_0_0_4px_rgba(113,113,122,0.12)]'
                                    : 'bg-[var(--accent-strong)] shadow-[0_0_0_4px_rgba(202,90,26,0.12)]'
                              )}
                              aria-label={getTokenStatusLabel(selectedToken.status)}
                              title={getTokenStatusLabel(selectedToken.status)}
                            />
                            <p className='text-lg font-semibold text-[var(--foreground)]'>
                              {selectedToken.name}
                            </p>
                          </div>
                          <p className='mt-2 font-mono text-xs text-[var(--muted-strong)]'>
                            {selectedToken.key}
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
                            onClick={() => handleOpenToolSelector(selectedToken)}
                            disabled={loadingTokenId === selectedToken.id}
                          >
                            <ExternalLink className='mr-2 size-4' />
                            使用
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title='还没有可用令牌'
                  />
                )}
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
                        <Th>性能</Th>
                        <Th>Tokens</Th>
                        <Th>费用</Th>
                        <Th>令牌</Th>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {logs.map((log) => {
                        const isExpanded = Boolean(expandedLogIds[log.id])
                        const totalTokens =
                          Number(log.prompt_tokens ?? 0) + Number(log.completion_tokens ?? 0)

                        return (
                          <Fragment key={`${log.id}-${log.request_id ?? log.created_at ?? 'row'}`}>
                            <tr
                              className='cursor-pointer transition-colors hover:bg-[var(--surface-strong)]'
                              onClick={() => toggleLogExpanded(log.id)}
                            >
                              <Td>
                                <button
                                  type='button'
                                  className='flex items-center gap-2 text-left'
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    toggleLogExpanded(log.id)
                                  }}
                                  aria-expanded={isExpanded}
                                >
                                  <ChevronDown
                                    className={cn(
                                      'size-4 text-[var(--muted)] transition-transform',
                                      isExpanded && 'rotate-180'
                                    )}
                                  />
                                  <span>{formatDateTime(log.created_at, 'seconds')}</span>
                                </button>
                              </Td>
                              <Td>
                                <div className='font-medium text-[var(--foreground)]'>
                                  {log.model_name || '-'}
                                </div>
                              </Td>
                              <Td>{formatLatency(log.use_time)}</Td>
                              <Td>
                                <div>{formatNumber(totalTokens)}</div>
                                <div className='mt-1 text-xs text-[var(--muted)]'>
                                  in {formatNumber(log.prompt_tokens ?? 0)} / out{' '}
                                  {formatNumber(log.completion_tokens ?? 0)}
                                </div>
                              </Td>
                              <Td>{formatQuotaValue(log.quota, systemStatus)}</Td>
                              <Td>{log.token_name || '-'}</Td>
                            </tr>
                            {isExpanded ? (
                              <tr>
                                <Td colSpan={6} className='bg-[var(--surface-strong)] px-5 py-3'>
                                  <div className='grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
                                    <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
                                      {[
                                        ['日志 ID', formatNumber(log.id)],
                                        ['类型', formatNumber(log.type)],
                                        ['时间', formatDateTime(log.created_at, 'seconds')],
                                        ['模型', log.model_name || '-'],
                                        ['令牌', log.token_name || '-'],
                                        ['耗时', formatLatency(log.use_time)],
                                        ['输入', formatNumber(log.prompt_tokens ?? 0)],
                                        ['输出', formatNumber(log.completion_tokens ?? 0)],
                                        ['总计', formatNumber(totalTokens)],
                                        ['费用', formatQuotaValue(log.quota, systemStatus)],
                                      ].map(([label, value]) => (
                                        <div
                                          key={label}
                                          className='min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5'
                                        >
                                          <p className='text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]'>
                                            {label}
                                          </p>
                                          <p className='truncate text-sm font-semibold text-[var(--foreground)]'>
                                            {value}
                                          </p>
                                        </div>
                                      ))}
                                    </div>

                                    <div className='min-w-0 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]'>
                                      <div className='grid gap-2 border-b border-[var(--border)] px-3 py-1.5 md:grid-cols-[88px_1fr] md:items-center'>
                                        <p className='text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]'>
                                          Request ID
                                        </p>
                                        <p className='break-all font-mono text-xs text-[var(--foreground)]'>
                                          {log.request_id || '-'}
                                        </p>
                                      </div>

                                      <div className='px-3 py-1.5'>
                                        <div className='mb-1 flex items-center justify-between gap-3'>
                                          <p className='text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]'>
                                            内容
                                          </p>
                                          <Badge>{log.content?.trim() ? '已返回' : '无内容'}</Badge>
                                        </div>
                                        <pre className='max-h-32 overflow-auto whitespace-pre-wrap break-words rounded-[var(--radius-sm)] bg-[var(--surface-strong)] px-3 py-2 font-mono text-xs leading-5 text-[var(--muted-strong)]'>
                                          {formatLogContent(log.content)}
                                        </pre>
                                      </div>
                                    </div>
                                  </div>
                                </Td>
                              </tr>
                            ) : null}
                          </Fragment>
                        )
                      })}
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
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={noticeOpen}
        onClose={handleCloseNotifications}
        title='通知与公告'
        description={
          noticeItems.length
            ? `${notificationSummary || '暂无内容'}${hasUnreadNotifications ? ` · ${unreadNotificationCount} 条未读` : ''}`
            : '暂无通知或公告'
        }
        className='max-w-3xl'
      >
        <div className='space-y-4 p-6'>
          {noticeItems.length ? (
            <>
              <div className='flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-strong)] p-4 sm:flex-row sm:items-center sm:justify-between'>
                <div className='space-y-1'>
                  <p className='text-sm font-semibold text-[var(--foreground)]'>
                    {hasUnreadNotifications
                      ? `有 ${unreadNotificationCount} 条未读内容`
                      : '当前内容均已读'}
                  </p>
                  <p className='text-xs text-[var(--muted)]'>
                    关闭弹窗会自动标记当前通知和公告为已读。
                  </p>
                </div>
                <Button
                  type='button'
                  size='sm'
                  variant='secondary'
                  disabled={!hasUnreadNotifications}
                  onClick={markCurrentNotificationsRead}
                >
                  <CheckCheck className='mr-2 size-4' />
                  全部标为已读
                </Button>
              </div>

              {noticeItem ? (
                <section className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                      <Bell className='size-4 text-[var(--accent)]' />
                      <p className='text-sm font-semibold text-[var(--foreground)]'>系统通知</p>
                      {unreadNoticeCount > 0 ? <Badge tone='warning'>未读</Badge> : null}
                    </div>
                    <Badge>Notice</Badge>
                  </div>
                  <div className='mt-4 break-words'>
                    <MarkdownNotice content={noticeItem.content} />
                  </div>
                </section>
              ) : null}

              {announcementItems.length ? (
                <section className='space-y-3'>
                  <div className='flex items-center gap-2 px-1'>
                    <Megaphone className='size-4 text-[var(--accent)]' />
                    <h3 className='text-sm font-semibold text-[var(--foreground)]'>系统公告</h3>
                    {unreadAnnouncementCount > 0 ? (
                      <Badge tone='warning'>{unreadAnnouncementCount} 条未读</Badge>
                    ) : null}
                  </div>

                  {announcementItems.map((item, index) => {
                    const publishDate = formatNoticeDate(item.publishDate)
                    const isUnread =
                      notificationReadStateLoaded && !readAnnouncementKeys.includes(item.key)

                    return (
                      <article
                        key={item.id}
                        className='rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5'
                      >
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                          <div className='flex items-center gap-2'>
                            <span className='inline-flex size-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-strong)]'>
                              {index + 1}
                            </span>
                            <p className='text-sm font-semibold text-[var(--foreground)]'>
                              公告 {index + 1}
                            </p>
                            {isUnread ? <Badge tone='warning'>未读</Badge> : null}
                          </div>
                          <div className='flex items-center gap-2'>
                            {item.type ? <Badge>{item.type}</Badge> : null}
                            {publishDate ? (
                              <span className='text-xs text-[var(--muted)]'>{publishDate}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className='mt-4 break-words'>
                          <MarkdownNotice content={item.content} />
                        </div>
                        {item.extra ? (
                          <div className='mt-4 rounded-[var(--radius-lg)] bg-[var(--surface-strong)] px-4 py-3'>
                            <MarkdownNotice content={item.extra} />
                          </div>
                        ) : null}
                      </article>
                    )
                  })}
                </section>
              ) : null}
            </>
          ) : (
            <EmptyState title='暂无通知与公告' />
          )}
        </div>
      </Dialog>

      <Dialog
        open={chatToolsOpen}
        onClose={() => setChatToolsOpen(false)}
        title='选择聊天工具'
      >
        <div className='space-y-4 p-6'>
          {genericChatTemplates.length ? (
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
                onClick={() => {
                  if (!chatTargetToken) {
                    return
                  }
                  void handleOpenChatTemplate(chatTargetToken)
                }}
                disabled={!chatTargetToken || loadingTokenId === chatTargetToken.id}
              >
                <ExternalLink className='mr-2 size-4' />
                打开聊天工具
              </Button>
            </div>
          ) : systemStatus?.chats?.length ? (
            <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]'>
              当前模板暂不支持
              <code className='mx-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-xs text-[var(--foreground)]'>
                {'{address}'}
              </code>
              和
              <code className='mx-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-xs text-[var(--foreground)]'>
                {'{key}'}
              </code>
              这类通用模板。
            </div>
          ) : (
            <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]'>
              暂无可用聊天工具模板
            </div>
          )}

          <div className='flex flex-wrap justify-end gap-3'>
            <Button
              size='sm'
              variant='secondary'
              onClick={() => {
                if (!chatTargetToken) {
                  return
                }
                setChatToolsOpen(false)
                void handleOpenGuide(chatTargetToken)
              }}
              disabled={!chatTargetToken || loadingTokenId === chatTargetToken.id}
            >
              查看 API 教程
            </Button>
            <Button size='sm' variant='secondary' onClick={() => setChatToolsOpen(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Dialog>

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
        title='令牌管理'
        className='max-w-6xl'
      >
        <div className='p-6'>
          <KeysPage tokens={tokens} />
        </div>
      </Dialog>

      <Dialog
        open={billingOpen}
        onClose={() => setBillingOpen(false)}
        title='账单与订阅'
        className='max-w-6xl'
      >
        <div className='p-6'>
          <BillingPage
            profile={profile}
            status={status}
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
