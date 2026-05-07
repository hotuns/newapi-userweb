import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { USER_ID_COOKIE } from '@/lib/cookies'

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
  const session = store.get('session')?.value
  const userId = store.get(USER_ID_COOKIE)?.value
  return Boolean(session && userId)
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect('/login')
  }
}
