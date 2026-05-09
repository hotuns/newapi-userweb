import type { PricingPreviewItem } from '@/types/api'

export type PricingDetail = {
  label: string
  value: string
}

type PricingDisplayOptions = {
  fallbackSummary?: string
}

const usdFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

function formatUsdAmount(value: number) {
  return `$${usdFormatter.format(value)}`
}

function formatPerTokenPrice(value: number) {
  return `${formatUsdAmount(value)} / 1M Tokens`
}

function formatPerRequestPrice(value: number) {
  return `${formatUsdAmount(value)} / 次`
}

function hasDefinedNumber(value: number | undefined | null): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function getPricingSummary(
  item: PricingPreviewItem,
  options: PricingDisplayOptions = {}
) {
  const fallbackSummary = options.fallbackSummary ?? '按平台策略计费'

  if (item.quota_type === 1 && item.model_price >= 0) {
    return `按次 ${formatPerRequestPrice(item.model_price)}`
  }

  if (item.model_ratio > 0) {
    return `输入 ${formatPerTokenPrice(item.model_ratio)}`
  }

  return fallbackSummary
}

export function getPricingDetails(item: PricingPreviewItem): PricingDetail[] {
  if (item.quota_type === 1) {
    return item.model_price >= 0
      ? [{ label: '按次', value: formatPerRequestPrice(item.model_price) }]
      : []
  }

  const details: PricingDetail[] = []

  if (item.completion_ratio > 0) {
    details.push({
      label: '补全',
      value: formatPerTokenPrice(item.model_ratio * item.completion_ratio),
    })
  }

  if (hasDefinedNumber(item.cache_ratio)) {
    details.push({
      label: '缓存读取',
      value: formatPerTokenPrice(item.model_ratio * item.cache_ratio),
    })
  }

  if (hasDefinedNumber(item.create_cache_ratio)) {
    details.push({
      label: '缓存写入',
      value: formatPerTokenPrice(item.model_ratio * item.create_cache_ratio),
    })
  }

  if (!details.length && (item.model_ratio > 0 || item.model_ratio === 0)) {
    details.push({ label: '输入', value: formatPerTokenPrice(item.model_ratio) })
  }

  return details
}
