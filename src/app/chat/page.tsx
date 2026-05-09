import { ChatWorkspacePage } from '@/features/chat/components/chat-workspace-page'
import { requireAuth } from '@/lib/auth'
import { getNewApiBaseUrl } from '@/lib/env'
import { buildQueryString } from '@/lib/utils'
import { getStatus, getTokens } from '@/lib/server-fetch'

export default async function ChatPage() {
  await requireAuth()

  const [status, tokens] = await Promise.all([
    getStatus(),
    getTokens(buildQueryString({ p: 1, page_size: 50 })),
  ])

  const apiBaseUrl =
    status.data?.server_address?.trim() || getNewApiBaseUrl().toString().replace(/\/$/, '')

  return <ChatWorkspacePage status={status} tokens={tokens} apiBaseUrl={apiBaseUrl} />
}
