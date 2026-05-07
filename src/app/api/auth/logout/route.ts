import { NextResponse } from 'next/server'
import { clearUserIdCookie } from '@/lib/cookies'
import { getNewApiBaseUrl } from '@/lib/env'

function copySetCookieHeaders(source: Response, target: NextResponse) {
  const setCookie = source.headers.getSetCookie?.() ?? []
  for (const cookie of setCookie) {
    target.headers.append('set-cookie', cookie)
  }
}

export async function POST(request: Request) {
  const response = await fetch(new URL('/api/user/logout', getNewApiBaseUrl()), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: request.headers.get('cookie') ?? '',
    },
    cache: 'no-store',
  })

  const json = await response.json()
  const nextResponse = NextResponse.json(json, { status: response.status })
  copySetCookieHeaders(response, nextResponse)
  await clearUserIdCookie()
  return nextResponse
}
