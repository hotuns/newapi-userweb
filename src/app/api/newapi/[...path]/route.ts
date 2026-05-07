import { NextResponse } from 'next/server'
import { createNewApiHeaders, isAllowedProxyPath } from '@/lib/newapi'
import { getNewApiBaseUrl } from '@/lib/env'

function createProxyResponseHeaders(source: Headers) {
  const headers = new Headers(source)

  // Undici/Next may already decode upstream compressed bodies. If we forward the
  // original encoding metadata unchanged, browsers can try to decode again.
  headers.delete('content-encoding')
  headers.delete('content-length')
  headers.delete('transfer-encoding')

  return headers
}

async function handleProxy(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const pathname = `/${path.join('/')}`
  const apiPath = pathname.startsWith('/api/')
    ? pathname
    : `/api/${path.join('/')}`

  if (!isAllowedProxyPath(apiPath)) {
    return NextResponse.json(
      { success: false, message: 'Proxy path is not allowed' },
      { status: 403 }
    )
  }

  const incomingUrl = new URL(request.url)
  const targetUrl = new URL(apiPath, getNewApiBaseUrl())
  targetUrl.search = incomingUrl.search

  const body =
    request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.text()

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: await createNewApiHeaders(request.headers, apiPath),
    body,
    cache: 'no-store',
  })

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    headers: createProxyResponseHeaders(response.headers),
  })

  return nextResponse
}

export { handleProxy as GET }
export { handleProxy as POST }
export { handleProxy as PUT }
export { handleProxy as DELETE }
