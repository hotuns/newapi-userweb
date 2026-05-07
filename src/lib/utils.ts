import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  const num = Number(value)
  if (Number.isNaN(num)) {
    return String(value)
  }
  return new Intl.NumberFormat('zh-CN').format(num)
}

export function formatDateTime(
  timestamp: number | string | null | undefined,
  unit: 'seconds' | 'milliseconds' = 'seconds'
) {
  if (!timestamp && timestamp !== 0) {
    return '-'
  }

  const raw = Number(timestamp)
  if (Number.isNaN(raw) || raw <= 0) {
    return '-'
  }

  const date = new Date(unit === 'seconds' ? raw * 1000 : raw)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function buildQueryString(
  params: Record<string, string | number | undefined | null>
) {
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }
  return searchParams.toString()
}
