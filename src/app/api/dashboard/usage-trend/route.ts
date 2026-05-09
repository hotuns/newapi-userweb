import { NextRequest, NextResponse } from 'next/server'
import {
  ALLOWED_USAGE_TREND_BUCKET_SIZES,
  getUsageTrend,
} from '@/lib/dashboard-usage-trend'
import type { UsageTrendResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

function createErrorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  )
}

function parseRequiredInt(value: string | null, key: string) {
  const parsed = Number.parseInt(value ?? '', 10)

  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} 无效`)
  }

  return parsed
}

function getOptionalParam(value: string | null) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startTimestamp = parseRequiredInt(searchParams.get('start_timestamp'), 'start_timestamp')
    const endTimestamp = parseRequiredInt(searchParams.get('end_timestamp'), 'end_timestamp')
    const bucketSize = parseRequiredInt(searchParams.get('bucket_size'), 'bucket_size')
    const modelName = getOptionalParam(searchParams.get('model_name'))
    const tokenName = getOptionalParam(searchParams.get('token_name'))
    const requestId = getOptionalParam(searchParams.get('request_id'))

    if (startTimestamp <= 0 || endTimestamp <= 0 || endTimestamp < startTimestamp) {
      return createErrorResponse('时间范围无效')
    }

    if (!ALLOWED_USAGE_TREND_BUCKET_SIZES.has(bucketSize as 3600 | 86400)) {
      return createErrorResponse('bucket_size 仅支持 3600 或 86400')
    }

    const body: UsageTrendResponse = await getUsageTrend({
      startTimestamp,
      endTimestamp,
      bucketSize: bucketSize as 3600 | 86400,
      modelName,
      tokenName,
      requestId
    })

    return NextResponse.json(body)
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : '趋势数据加载失败',
      500
    )
  }
}
