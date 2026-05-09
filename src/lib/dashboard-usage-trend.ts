import { buildNewApiUrl, createNewApiHeaders } from '@/lib/newapi'
import { buildQueryString } from '@/lib/utils'
import type {
  PaginatedResponse,
  UsageLog,
  UsageTrendBucket,
  UsageTrendResponse,
} from '@/types/api'

const LOG_PAGE_SIZE = 100
const MAX_LOG_PAGES = 500
const FETCH_BATCH_SIZE = 5

export const ALLOWED_USAGE_TREND_BUCKET_SIZES = new Set([3600, 86400] as const)

type UsageTrendParams = {
  startTimestamp: number
  endTimestamp: number
  bucketSize: 3600 | 86400
  modelName?: string
  tokenName?: string
  requestId?: string
}

async function fetchLogPage(
  page: number,
  startTimestamp: number,
  endTimestamp: number,
  modelName?: string,
  tokenName?: string,
  requestId?: string
) {
  const query = buildQueryString({
    p: page,
    page_size: LOG_PAGE_SIZE,
    start_timestamp: startTimestamp,
    end_timestamp: endTimestamp,
    model_name: modelName,
    token_name: tokenName,
    request_id: requestId,
  })
  const response = await fetch(buildNewApiUrl('/api/log/self', query), {
    headers: await createNewApiHeaders(undefined, '/api/log/self'),
    cache: 'no-store',
  })
  const json = (await response.json()) as PaginatedResponse<UsageLog>

  if (!response.ok || json.success === false) {
    throw new Error(json.message || '趋势数据加载失败')
  }

  return json
}

async function fetchAllLogs(
  startTimestamp: number,
  endTimestamp: number,
  modelName?: string,
  tokenName?: string,
  requestId?: string
) {
  const logs: UsageLog[] = []

  for (let startPage = 1; startPage <= MAX_LOG_PAGES; startPage += FETCH_BATCH_SIZE) {
    const batchPages = Array.from(
      { length: Math.min(FETCH_BATCH_SIZE, MAX_LOG_PAGES - startPage + 1) },
      (_, index) => startPage + index
    )
    const batchResponses = await Promise.all(
      batchPages.map((page) =>
        fetchLogPage(page, startTimestamp, endTimestamp, modelName, tokenName, requestId)
      )
    )

    for (const pageResponse of batchResponses) {
      const items = pageResponse.data?.items ?? []
      if (!items.length) {
        return logs
      }

      logs.push(...items)

      if (items.length < LOG_PAGE_SIZE) {
        return logs
      }
    }
  }

  return logs
}

function buildTrendBuckets(
  logs: UsageLog[],
  startTimestamp: number,
  endTimestamp: number,
  bucketSize: 3600 | 86400
) {
  const bucketLookup = new Map<number, UsageTrendBucket>()
  const points: UsageTrendBucket[] = []

  for (let cursor = startTimestamp; cursor <= endTimestamp; cursor += bucketSize) {
    const point: UsageTrendBucket = {
      timestamp: cursor,
      quota: 0,
      count: 0,
      token_used: 0,
    }
    bucketLookup.set(cursor, point)
    points.push(point)
  }

  for (const log of logs) {
    const createdAt = Number(log.created_at ?? log.createdAt ?? 0)
    if (!Number.isFinite(createdAt) || createdAt < startTimestamp || createdAt > endTimestamp) {
      continue
    }

    const bucketOffset = Math.floor((createdAt - startTimestamp) / bucketSize)
    const bucketTimestamp = startTimestamp + bucketOffset * bucketSize
    const bucket = bucketLookup.get(bucketTimestamp)
    if (!bucket) {
      continue
    }

    bucket.quota += Number(log.quota ?? 0)
    bucket.count += 1
    bucket.token_used +=
      Number(log.prompt_tokens ?? 0) + Number(log.completion_tokens ?? 0)
  }

  return points
}

export async function getUsageTrend({
  startTimestamp,
  endTimestamp,
  bucketSize,
  modelName,
  tokenName,
  requestId,
}: UsageTrendParams): Promise<UsageTrendResponse> {
  const logs = await fetchAllLogs(
    startTimestamp,
    endTimestamp,
    modelName,
    tokenName,
    requestId
  )
  const points = buildTrendBuckets(logs, startTimestamp, endTimestamp, bucketSize)

  return {
    success: true,
    data: {
      start_timestamp: startTimestamp,
      end_timestamp: endTimestamp,
      bucket_size: bucketSize,
      points,
    },
  }
}
