'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableHead, TableWrapper, Td, Th } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatDateTime, formatNumber } from '@/lib/utils'
import type { PaginatedResponse, TokenRecord } from '@/types/api'

const tokenSchema = z.object({
  name: z.string().min(1, '请输入名称'),
  group: z.string().min(1, '请输入分组'),
  unlimited_quota: z.boolean(),
  remain_quota: z.coerce.number().min(0, '额度不能小于 0'),
  expired_time: z.coerce.number().default(-1),
  allow_ips: z.string().optional(),
  model_limits_enabled: z.boolean(),
  model_limits: z.string().optional(),
  cross_group_retry: z.boolean(),
})

type TokenFormValues = z.input<typeof tokenSchema>

type KeysPageProps = {
  tokens: PaginatedResponse<TokenRecord>
}

function statusTone(status: number): 'success' | 'warning' | 'default' {
  if (status === 1) return 'success'
  if (status === 2) return 'default'
  return 'warning'
}

function statusLabel(status: number) {
  if (status === 1) return '启用中'
  if (status === 2) return '已禁用'
  return '已过期'
}

export function KeysPage({ tokens }: KeysPageProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenSchema),
    defaultValues: {
      name: '',
      group: 'default',
      unlimited_quota: true,
      remain_quota: 0,
      expired_time: -1,
      allow_ips: '',
      model_limits_enabled: false,
      model_limits: '',
      cross_group_retry: false,
    },
  })

  async function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function handleCreate(values: TokenFormValues) {
    const parsed = tokenSchema.parse(values)
    const response = await fetch('/api/newapi/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
    const json = await response.json()
    if (!json.success) {
      toast.error(json.message || '创建失败')
      return
    }
    toast.success('Key 创建成功')
    form.reset()
    await refresh()
  }

  async function toggleStatus(token: TokenRecord) {
    const nextStatus = token.status === 1 ? 2 : 1
    const response = await fetch('/api/newapi/token?status_only=true', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: token.id, status: nextStatus }),
    })
    const json = await response.json()
    if (!json.success) {
      toast.error(json.message || '状态更新失败')
      return
    }
    toast.success('状态已更新')
    await refresh()
  }

  async function removeToken(id: number) {
    const response = await fetch(`/api/newapi/token/${id}`, {
      method: 'DELETE',
    })
    const json = await response.json()
    if (!json.success) {
      toast.error(json.message || '删除失败')
      return
    }
    toast.success('Key 已删除')
    await refresh()
  }

  async function revealKey(id: number) {
    const response = await fetch(`/api/newapi/token/${id}/key`, {
      method: 'POST',
    })
    const json = await response.json()
    if (!json.success) {
      toast.error(json.message || '读取完整 key 失败')
      return
    }
    setSelectedKey(json.data?.key || null)
  }

  const items = tokens.data?.items ?? []

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <CardTitle>创建新的 API Key</CardTitle>
          <CardDescription>V1 先支持最常用字段，满足普通用户的日常使用。</CardDescription>
        </CardHeader>
        <CardContent>
          <form className='grid gap-4 md:grid-cols-2' onSubmit={form.handleSubmit(handleCreate)}>
            <div className='space-y-2'>
              <Label htmlFor='name'>名称</Label>
              <Input id='name' {...form.register('name')} />
              <p className='text-xs text-[var(--danger)]'>{form.formState.errors.name?.message}</p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='group'>分组</Label>
              <Input id='group' {...form.register('group')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='quota'>额度</Label>
              <Input id='quota' type='number' {...form.register('remain_quota')} />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='expired'>过期时间戳</Label>
              <Input id='expired' type='number' {...form.register('expired_time')} />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='ips'>允许 IP 列表</Label>
              <Textarea id='ips' placeholder='一行一个 IP，留空表示不限制' {...form.register('allow_ips')} />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label htmlFor='limits'>模型限制</Label>
              <Textarea id='limits' placeholder='例如：gpt-4o,o3-mini' {...form.register('model_limits')} />
            </div>
            <div className='flex flex-wrap gap-4 md:col-span-2'>
              <label className='flex items-center gap-2 text-sm text-[var(--muted-strong)]'>
                <input type='checkbox' {...form.register('unlimited_quota')} />
                无限额度
              </label>
              <label className='flex items-center gap-2 text-sm text-[var(--muted-strong)]'>
                <input type='checkbox' {...form.register('model_limits_enabled')} />
                启用模型限制
              </label>
              <label className='flex items-center gap-2 text-sm text-[var(--muted-strong)]'>
                <input type='checkbox' {...form.register('cross_group_retry')} />
                允许跨分组重试
              </label>
            </div>
            <div className='md:col-span-2'>
              <Button disabled={pending}>创建 Key</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {selectedKey ? (
        <Card>
          <CardHeader>
            <CardTitle>完整 Key</CardTitle>
            <CardDescription>该值只在按需查看时展示，请妥善保存。</CardDescription>
          </CardHeader>
          <CardContent>
            <code className='block overflow-x-auto rounded-[var(--radius-md)] bg-[var(--surface-strong)] p-4 text-sm'>
              {selectedKey}
            </code>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>已有 Key 列表</CardTitle>
          <CardDescription>支持查看、启停和删除。V1 不做批量操作。</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <Th>名称</Th>
                    <Th>状态</Th>
                    <Th>Key</Th>
                    <Th>额度</Th>
                    <Th>创建时间</Th>
                    <Th>操作</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {items.map((token) => (
                    <tr key={token.id}>
                      <Td>{token.name}</Td>
                      <Td>
                        <Badge tone={statusTone(token.status)}>{statusLabel(token.status)}</Badge>
                      </Td>
                      <Td className='font-mono text-xs'>{token.key}</Td>
                      <Td>{token.unlimited_quota ? '无限' : formatNumber(token.remain_quota)}</Td>
                      <Td>{formatDateTime(token.created_time)}</Td>
                      <Td>
                        <div className='flex flex-wrap gap-2'>
                          <Button size='sm' variant='secondary' onClick={() => revealKey(token.id)}>
                            查看完整值
                          </Button>
                          <Button size='sm' variant='ghost' onClick={() => toggleStatus(token)}>
                            {token.status === 1 ? '禁用' : '启用'}
                          </Button>
                          <Button size='sm' variant='danger' onClick={() => removeToken(token.id)}>
                            删除
                          </Button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          ) : (
            <EmptyState
              title='还没有 API Key'
              description='创建第一个令牌后，这里会出现你的所有 Key。'
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
