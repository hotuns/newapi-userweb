import { cookies } from 'next/headers'

export const USER_ID_COOKIE = 'newapi_uid'
const DEFAULT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

export async function getUserIdCookie() {
  const store = await cookies()
  return store.get(USER_ID_COOKIE)?.value
}

export async function setUserIdCookie(userId: number | string) {
  const store = await cookies()
  store.set(USER_ID_COOKIE, String(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: DEFAULT_COOKIE_MAX_AGE,
  })
}

export async function clearUserIdCookie() {
  const store = await cookies()
  store.set(USER_ID_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 0,
  })
}
