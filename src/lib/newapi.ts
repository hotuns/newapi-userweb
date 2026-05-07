import { getCurrentUserId, getSessionCookieHeader } from '@/lib/auth'
import { getNewApiBaseUrl } from '@/lib/env'

const PUBLIC_PATHS = new Set([
  '/api/status',
  '/api/notice',
  '/api/pricing',
  '/api/verification',
  '/api/reset_password',
  '/api/user-agreement',
  '/api/privacy-policy',
  '/api/subscription/plans',
])

const PROTECTED_PREFIXES = [
  '/api/user/self',
  '/api/user/models',
  '/api/user/token',
  '/api/user/setting',
  '/api/token',
  '/api/log/self',
  '/api/data/self',
  '/api/user/topup/info',
  '/api/user/topup/self',
  '/api/subscription/self',
]

export function isAllowedProxyPath(path: string) {
  if (PUBLIC_PATHS.has(path)) {
    return true
  }

  return PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))
}

export async function createNewApiHeaders(
  initHeaders?: HeadersInit,
  path?: string
) {
  const headers = new Headers(initHeaders)
  headers.set('Accept', 'application/json')

  const cookieHeader = await getSessionCookieHeader()
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader)
  }

  const needsUserHeader =
    path !== undefined &&
    PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix))

  if (needsUserHeader) {
    const userId = await getCurrentUserId()
    if (userId) {
      headers.set('New-Api-User', userId)
    }
  }

  return headers
}

export function buildNewApiUrl(path: string, query?: string) {
  const base = getNewApiBaseUrl()
  const url = new URL(path, base)
  if (query) {
    url.search = query
  }
  return url
}
