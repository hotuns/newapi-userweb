import { NextResponse } from 'next/server'
import { getNewApiBaseUrl } from '@/lib/env'

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>
  const url = new URL('/api/user/register', getNewApiBaseUrl())
  const turnstile =
    typeof payload.turnstile === 'string' ? payload.turnstile : ''
  if (turnstile) {
    url.searchParams.set('turnstile', turnstile)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const json = await response.json()
  return NextResponse.json(json, { status: response.status })
}
