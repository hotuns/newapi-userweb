import { NextResponse } from 'next/server'
import { setUserIdCookie } from '@/lib/cookies'
import { getNewApiBaseUrl } from '@/lib/env'
import type { LoginResponse } from '@/types/api'

function copySetCookieHeaders(source: Response, target: NextResponse) {
  const setCookie = source.headers.getSetCookie?.() ?? []
  for (const cookie of setCookie) {
    target.headers.append('set-cookie', cookie)
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>
  const url = new URL('/api/user/login/2fa', getNewApiBaseUrl())

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify({ code: payload.code }),
    cache: 'no-store',
  })

  const json = (await response.json()) as LoginResponse
  const nextResponse = NextResponse.json(json, { status: response.status })
  copySetCookieHeaders(response, nextResponse)

  if (json.success && json.data?.id) {
    await setUserIdCookie(json.data.id)
  }

  return nextResponse
}
