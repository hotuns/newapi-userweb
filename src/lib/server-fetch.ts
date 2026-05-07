import { cache } from 'react'
import { buildNewApiUrl, createNewApiHeaders } from '@/lib/newapi'
import type {
  ApiResponse,
  LogStats,
  PaginatedResponse,
  PricingResponse,
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

async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T
}

export const getStatus = cache(async () => {
  const url = buildNewApiUrl('/api/status')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(),
    next: { revalidate: 60 },
  })
  const json = await parseJson<ApiResponse<SystemStatus>>(response)
  return json
})

export const getPricing = cache(async () => {
  const url = buildNewApiUrl('/api/pricing')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(),
    next: { revalidate: 300 },
  })
  return parseJson<PricingResponse>(response)
})

export const getNotice = cache(async () => {
  const url = buildNewApiUrl('/api/notice')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(),
    next: { revalidate: 60 },
  })
  return parseJson<ApiResponse<string>>(response)
})

export async function getSelf() {
  const url = buildNewApiUrl('/api/user/self')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/user/self'),
    cache: 'no-store',
  })
  return parseJson<ApiResponse<UserProfile>>(response)
}

export async function getTokens(searchParams?: string) {
  const url = buildNewApiUrl('/api/token', searchParams)
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/token'),
    cache: 'no-store',
  })
  return parseJson<PaginatedResponse<TokenRecord>>(response)
}

export async function getUserModels() {
  const url = buildNewApiUrl('/api/user/models')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/user/models'),
    cache: 'no-store',
  })
  return parseJson<ApiResponse<string[]>>(response)
}

export async function getUserLogs(query?: string) {
  const url = buildNewApiUrl('/api/log/self', query)
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/log/self'),
    cache: 'no-store',
  })
  return parseJson<PaginatedResponse<UsageLog>>(response)
}

export async function getUserLogStats(query?: string) {
  const url = buildNewApiUrl('/api/log/self/stat', query)
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/log/self/stat'),
    cache: 'no-store',
  })
  return parseJson<ApiResponse<LogStats>>(response)
}

export async function getUserQuotaData(query?: string) {
  const url = buildNewApiUrl('/api/data/self', query)
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/data/self'),
    cache: 'no-store',
  })
  return parseJson<ApiResponse<QuotaDataPoint[]>>(response)
}

export async function getTopupInfo() {
  const url = buildNewApiUrl('/api/user/topup/info')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/user/topup/info'),
    cache: 'no-store',
  })
  return parseJson<ApiResponse<TopupInfo>>(response)
}

export async function getTopupRecords(query?: string) {
  const url = buildNewApiUrl('/api/user/topup/self', query)
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/user/topup/self'),
    cache: 'no-store',
  })
  return parseJson<PaginatedResponse<TopupRecord>>(response)
}

export async function getSubscriptionSelf() {
  const url = buildNewApiUrl('/api/subscription/self')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(undefined, '/api/subscription/self'),
    cache: 'no-store',
  })
  return parseJson<ApiResponse<SubscriptionSummary>>(response)
}

export const getSubscriptionPlans = cache(async () => {
  const url = buildNewApiUrl('/api/subscription/plans')
  const response = await fetch(url, {
    headers: await createNewApiHeaders(),
    next: { revalidate: 300 },
  })
  return parseJson<ApiResponse<Array<{ plan: SubscriptionPlan }>>>(response)
})
