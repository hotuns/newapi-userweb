'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ExternalLink, KeyRound, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { KeysPage } from '@/features/keys/components/keys-page'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/select'
import { buildGenericChatLaunchUrl, parseGenericChatTemplates } from '@/lib/chat-links'
import {
  clearStoredEmbeddedChatSession,
  readStoredEmbeddedChatSession,
  saveStoredEmbeddedChatSession,
} from '@/lib/embedded-chat-session'
import type { ApiResponse, PaginatedResponse, SystemStatus, TokenRecord } from '@/types/api'

type ChatWorkspacePageProps = {
  status: ApiResponse<SystemStatus>
  tokens: PaginatedResponse<TokenRecord>
  apiBaseUrl: string
}

type EmbeddedChatSession = {
  name: string
  tokenName: string
  tokenId: number
  url: string
}

const EMPTY_TOKENS: TokenRecord[] = []

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init)
  const json = (await response.json()) as T & {
    success?: boolean
    message?: string
  }

  if (!response.ok || json.success === false) {
    throw new Error(json.message || '请求失败')
  }

  return json
}

export function ChatWorkspacePage({
  status,
  tokens,
  apiBaseUrl,
}: ChatWorkspacePageProps) {
  const router = useRouter()
  const systemStatus = status.data
  const dashboardTokens = tokens.data?.items ?? EMPTY_TOKENS
  const genericChatTemplates = useMemo(
    () => parseGenericChatTemplates(systemStatus?.chats),
    [systemStatus?.chats]
  )
  const [selectedChatTemplateName, setSelectedChatTemplateName] = useState('')
  const [revealedKeys, setRevealedKeys] = useState<Record<number, string>>({})
  const [loadingTokenId, setLoadingTokenId] = useState<number | null>(null)
  const [chatToolsOpen, setChatToolsOpen] = useState(false)
  const [chatTargetToken, setChatTargetToken] = useState<TokenRecord | null>(null)
  const [embeddedChatSession, setEmbeddedChatSession] = useState<EmbeddedChatSession | null>(null)
  const [keysOpen, setKeysOpen] = useState(false)

  const selectedToken = dashboardTokens[0] ?? null
  const activeChatTemplateName =
    selectedChatTemplateName &&
    genericChatTemplates.some((template) => template.name === selectedChatTemplateName)
      ? selectedChatTemplateName
      : genericChatTemplates[0]?.name ?? ''
  const activeChatTemplate =
    genericChatTemplates.find((template) => template.name === activeChatTemplateName) ?? null

  const loadFullTokenValue = useCallback(async (tokenId: number) => {
    if (revealedKeys[tokenId]) {
      return revealedKeys[tokenId]
    }

    setLoadingTokenId(tokenId)

    try {
      const json = await fetchJson<ApiResponse<{ key: string }>>(
        `/api/newapi/token/${tokenId}/key`,
        { method: 'POST' }
      )
      const fullKey = json.data?.key ?? ''

      if (fullKey) {
        setRevealedKeys((current) => ({
          ...current,
          [tokenId]: fullKey,
        }))
      }

      return fullKey
    } finally {
      setLoadingTokenId(null)
    }
  }, [revealedKeys])

  async function handleOpenChatTemplate(token: TokenRecord) {
    if (!activeChatTemplate) {
      toast.error('当前没有可用的聊天工具模板')
      return
    }

    try {
      const fullKey = await loadFullTokenValue(token.id)
      if (!fullKey) {
        throw new Error('没有读取到完整令牌')
      }

      const nextSession = {
        name: activeChatTemplate.name,
        tokenName: token.name,
        tokenId: token.id,
        url: buildGenericChatLaunchUrl(activeChatTemplate.template, apiBaseUrl, fullKey),
      }

      setEmbeddedChatSession(nextSession)
      setChatTargetToken(token)
      setSelectedChatTemplateName(activeChatTemplate.name)
      saveStoredEmbeddedChatSession({ name: activeChatTemplate.name, tokenId: token.id })
      setChatToolsOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '打开聊天工具失败')
    }
  }

  function handleOpenToolSelector() {
    if (!selectedToken) {
      setKeysOpen(true)
      toast.error('请先创建一个令牌，再打开聊天工具')
      return
    }

    setChatTargetToken(embeddedChatSession
      ? dashboardTokens.find((item) => item.id === embeddedChatSession.tokenId) ?? selectedToken
      : selectedToken)
    setChatToolsOpen(true)
  }

  function handleCloseChat() {
    clearStoredEmbeddedChatSession()
    setEmbeddedChatSession(null)
    setChatTargetToken(null)
    router.push('/dashboard')
  }

  useEffect(() => {
    const storedSession = readStoredEmbeddedChatSession()
    if (!storedSession) {
      return
    }

    const template = genericChatTemplates.find((item) => item.name === storedSession.name)
    const token = dashboardTokens.find((item) => item.id === storedSession.tokenId)

    if (!template || !token) {
      clearStoredEmbeddedChatSession()
      return
    }

    if (
      embeddedChatSession?.name === template.name &&
      embeddedChatSession.tokenId === token.id
    ) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const fullKey = await loadFullTokenValue(token.id)
        if (cancelled) {
          return
        }

        if (!fullKey) {
          throw new Error('没有读取到完整令牌')
        }

        setChatTargetToken(token)
        setSelectedChatTemplateName(template.name)
        setEmbeddedChatSession({
          name: template.name,
          tokenName: token.name,
          tokenId: token.id,
          url: buildGenericChatLaunchUrl(template.template, apiBaseUrl, fullKey),
        })
      } catch (error) {
        clearStoredEmbeddedChatSession()
        if (!cancelled) {
          setEmbeddedChatSession(null)
          toast.error(error instanceof Error ? error.message : '恢复聊天工具失败')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    apiBaseUrl,
    dashboardTokens,
    embeddedChatSession?.name,
    embeddedChatSession?.tokenId,
    genericChatTemplates,
    loadFullTokenValue,
  ])

  return (
    <>
      <div className='space-y-6'>
        <div className='rounded-[calc(var(--radius-xl)+0.25rem)] border border-[rgba(15,23,42,0.07)] bg-[rgba(255,255,255,0.78)] px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:px-5'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <Link
              href='/dashboard'
              className='inline-flex min-w-0 items-center gap-3 text-[var(--foreground)] sm:max-w-[calc(100%-14rem)]'
            >
              <span className='flex size-10 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface)] ring-1 ring-[rgba(15,23,42,0.08)]'>
                <Image
                  src='/brand/moretoken-icon.png'
                  alt='MoreToken'
                  width={40}
                  height={40}
                  className='size-full object-cover'
                  priority
                />
              </span>
              <span className='truncate text-xl font-semibold tracking-[-0.04em]'>
                MoreToken
              </span>
            </Link>

            <div className='flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap'>
              {embeddedChatSession ? (
                <div className='hidden max-w-[260px] truncate rounded-full border border-[rgba(15,23,42,0.07)] bg-[rgba(255,255,255,0.68)] px-3 py-2 text-sm font-medium text-[var(--muted-strong)] lg:block'>
                  {embeddedChatSession.name} · {embeddedChatSession.tokenName}
                </div>
              ) : null}

              <Button
                size='sm'
                className='w-full shadow-[0_18px_42px_rgba(16,163,127,0.22)] sm:w-auto'
                onClick={handleOpenToolSelector}
              >
                <ExternalLink className='mr-2 size-4' />
                {selectedToken ? (embeddedChatSession ? '切换工具' : '选择工具') : '创建令牌后使用'}
              </Button>
              <Button
                size='sm'
                variant='secondary'
                className='w-full sm:w-auto'
                onClick={handleCloseChat}
              >
                返回控制台
              </Button>
            </div>
          </div>
        </div>

        {embeddedChatSession ? (
          <div className='mx-[calc(50%-50vw)] overflow-hidden bg-white'>
            <iframe
              key={embeddedChatSession.url}
              src={embeddedChatSession.url}
              title={`${embeddedChatSession.name} 工作台`}
              className='h-[calc(100vh-112px)] min-h-[560px] w-screen border-0 bg-white sm:h-[calc(100vh-128px)] sm:min-h-[680px]'
              referrerPolicy='no-referrer'
              sandbox='allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads'
            />
          </div>
        ) : (
          <EmptyState
            title={selectedToken ? '还没有打开聊天工具' : '还没有可用令牌'}
            description={
              selectedToken
                ? '先选择一个聊天工具，聊天页面就会在这里加载。'
                : '先创建一个令牌，然后再选择聊天工具。'
            }
            action={
              selectedToken ? (
                <Button onClick={handleOpenToolSelector}>
                  <ExternalLink className='mr-2 size-4' />
                  选择聊天工具
                </Button>
              ) : (
                <Button onClick={() => setKeysOpen(true)}>
                  <KeyRound className='mr-2 size-4' />
                  创建令牌
                </Button>
              )
            }
          />
        )}
      </div>

      <Dialog
        open={chatToolsOpen}
        onClose={() => setChatToolsOpen(false)}
        title='选择聊天工具'
        description='选择一个工具后会进入当前控制台内的聊天页面，令牌和 API 地址会自动带入。'
      >
        <div className='space-y-4 p-6'>
          {genericChatTemplates.length ? (
            <div className='grid gap-3 md:grid-cols-[minmax(220px,1fr)_auto] md:items-center'>
              <Select
                value={activeChatTemplateName}
                onChange={(event) => setSelectedChatTemplateName(event.target.value)}
                aria-label='选择聊天工具'
              >
                {genericChatTemplates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </Select>
              <Button
                size='sm'
                className='w-full md:w-auto'
                onClick={() => {
                  if (!chatTargetToken) {
                    return
                  }
                  void handleOpenChatTemplate(chatTargetToken)
                }}
                disabled={!chatTargetToken || loadingTokenId === chatTargetToken.id}
              >
                {chatTargetToken && loadingTokenId === chatTargetToken.id ? (
                  <RefreshCw className='mr-2 size-4 animate-spin' />
                ) : (
                  <ExternalLink className='mr-2 size-4' />
                )}
                打开
              </Button>
            </div>
          ) : systemStatus?.chats?.length ? (
            <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]'>
              当前模板暂不支持
              <code className='mx-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-xs text-[var(--foreground)]'>
                {'{address}'}
              </code>
              和
              <code className='mx-1 rounded bg-[var(--surface-strong)] px-1.5 py-0.5 text-xs text-[var(--foreground)]'>
                {'{key}'}
              </code>
              这类通用模板。
            </div>
          ) : (
            <div className='rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]'>
              暂无可用聊天工具模板
            </div>
          )}

          <div className='flex justify-end'>
            <Button size='sm' variant='secondary' onClick={() => setChatToolsOpen(false)}>
              关闭
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={keysOpen}
        onClose={() => setKeysOpen(false)}
        title='令牌管理'
        className='max-w-6xl'
      >
        <div className='p-6'>
          <KeysPage tokens={tokens} />
        </div>
      </Dialog>
    </>
  )
}
