import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE, USER_ID_COOKIE } from '@/lib/cookies'
import { getNewApiBaseUrl } from '@/lib/env'

export async function getSessionCookieHeader() {
  const store = await cookies()
  return store
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')
}

export async function getCurrentUserId() {
  const store = await cookies()
  return store.get(USER_ID_COOKIE)?.value ?? null
}

export async function isAuthenticated() {
  const store = await cookies()
  const session = store.get(SESSION_COOKIE)?.value
  const userId = store.get(USER_ID_COOKIE)?.value

  if (!session || !userId) {
    return false
  }

  const response = await fetch(new URL('/api/user/self', getNewApiBaseUrl()), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: `${SESSION_COOKIE}=${session}`,
      'New-Api-User': userId,
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    return false
  }

  const json = (await response.json()) as { success?: boolean }

  if (json.success === false) {
    return false
  }

  return true
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect('/login')
  }
}
