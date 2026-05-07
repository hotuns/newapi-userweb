'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog } from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableHead, TableWrapper, Td, Th } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatDateTime, formatNumber } from '@/lib/utils'
import type { PaginatedResponse, TokenRecord } from '@/types/api'

const tokenFormSchema = z.object({
  name: z.string().min(1, '请输入名称'),
  group: z.string().min(1, '分组不能为空'),
  unlimited_quota: z.boolean(),
  remain_quota: z.coerce.number().min(0, '额度不能小于 0'),
  expires_at: z.string().optional(),
  allow_ips: z.string().optional(),
  model_limits: z.string().optional(),
  cross_group_retry: z.boolean(),
})

type TokenFormValues = z.input<typeof tokenFormSchema>

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

function formatDateTimeLocal(timestamp?: number) {
  const raw = Number(timestamp ?? 0)

  if (!Number.isFinite(raw) || raw <= 0 || raw === -1) {
    return ''
  }

  const date = new Date(raw * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function normalizeModelLimits(value?: string) {
  return (value ?? '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join(',')
}

function buildFormDefaults(token?: TokenRecord): TokenFormValues {
  return {
    name: token?.name ?? '',
    group: token?.group?.trim() || 'default',
    unlimited_quota: token?.unlimited_quota ?? true,
    remain_quota:
      token?.unlimited_quota
        ? 0
        : Number(token?.remain_quota ?? 0),
    expires_at: formatDateTimeLocal(token?.expired_time),
    allow_ips: token?.allow_ips ?? '',
    model_limits: token?.model_limits ?? '',
    cross_group_retry: token?.cross_group_retry ?? false,
  }
}

function buildQuickExpiry(preset: 'never' | 'day' | 'month') {
  if (preset === 'never') {
    return ''
  }

  const date = new Date()

  if (preset === 'day') {
    date.setDate(date.getDate() + 1)
  }

  if (preset === 'month') {
    date.setMonth(date.getMonth() + 1)
  }

  return formatDateTimeLocal(Math.floor(date.getTime() / 1000))
}

export function KeysPage({ tokens }: KeysPageProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingToken, setEditingToken] = useState<TokenRecord | null>(null)
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: buildFormDefaults(),
  })
  const unlimitedQuota = useWatch({
    control: form.control,
    name: 'unlimited_quota',
  })
  const expiresAtValue = useWatch({
    control: form.control,
    name: 'expires_at',
  })
  const isEdit = editingToken !== null

  async function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  function openCreateDialog() {
    setEditingToken(null)
    form.reset(buildFormDefaults())
    setEditorOpen(true)
  }

  function openEditDialog(token: TokenRecord) {
    setEditingToken(token)
    form.reset(buildFormDefaults(token))
    setEditorOpen(true)
  }

  function closeEditorDialog() {
    setEditorOpen(false)
    setEditingToken(null)
    form.reset(buildFormDefaults())
  }

  function applyExpiryPreset(preset: 'never' | 'day' | 'month') {
    form.setValue('expires_at', buildQuickExpiry(preset), {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  async function handleSubmitToken(values: TokenFormValues) {
    try {
      const parsed = tokenFormSchema.parse(values)
      const normalizedModelLimits = normalizeModelLimits(parsed.model_limits)
      const expiresAt = parsed.expires_at?.trim()
      const expiredTime = expiresAt ? Math.ceil(Date.parse(expiresAt) / 1000) : -1

      if (expiresAt && Number.isNaN(expiredTime)) {
        toast.error('过期时间格式不正确')
        return
      }

      const payload = {
        ...(isEdit && editingToken ? { id: editingToken.id } : {}),
        name: parsed.name.trim(),
        group: parsed.group,
        unlimited_quota: parsed.unlimited_quota,
        remain_quota: parsed.unlimited_quota ? 0 : Number(parsed.remain_quota),
        expired_time: expiredTime,
        allow_ips: parsed.allow_ips?.trim() || '',
        model_limits_enabled: normalizedModelLimits.length > 0,
        model_limits: normalizedModelLimits,
        cross_group_retry: parsed.cross_group_retry,
      }

      const response = await fetch('/api/newapi/token', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (!json.success) {
        toast.error(json.message || (isEdit ? '更新失败' : '创建失败'))
        return
      }
      toast.success(isEdit ? '令牌已更新' : '令牌已创建')
      closeEditorDialog()
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isEdit ? '更新失败' : '创建失败')
    }
  }

  async function toggleStatus(token: TokenRecord) {
    try {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '状态更新失败')
    }
  }

  async function removeToken(id: number) {
    try {
      const response = await fetch(`/api/newapi/token/${id}`, {
        method: 'DELETE',
      })
      const json = await response.json()
      if (!json.success) {
        toast.error(json.message || '删除失败')
        return
      }
      toast.success('令牌已删除')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  async function revealKey(id: number) {
    try {
      const response = await fetch(`/api/newapi/token/${id}/key`, {
        method: 'POST',
      })
      const json = await response.json()
      if (!json.success) {
        toast.error(json.message || '读取完整 key 失败')
        return
      }
      setSelectedKey(json.data?.key || null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取完整 key 失败')
    }
  }

  const items = tokens.data?.items ?? []

  return (
    <>
      <Card>
        <CardHeader className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div>
            <CardTitle>令牌列表</CardTitle>
            <CardDescription>支持查看、启停和删除。V1 不做批量操作。</CardDescription>
          </div>
          <Button size='sm' onClick={openCreateDialog}>新增令牌</Button>
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
                          <Button size='sm' variant='secondary' onClick={() => openEditDialog(token)}>
                            编辑
                          </Button>
                          <Button size='sm' variant='secondary' onClick={() => void revealKey(token.id)}>
                            复制
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
              title='还没有令牌'
              description='创建第一个令牌后，这里会显示你的全部令牌。'
              action={
                <Button size='sm' onClick={openCreateDialog}>新增令牌</Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editorOpen}
        onClose={closeEditorDialog}
        title={isEdit ? '编辑令牌' : '新增令牌'}
        description={isEdit ? '修改令牌名称、有效期、额度和模型限制。' : '设置令牌名称、有效期、额度和模型限制。'}
      >
        <div className='p-6'>
          <form className='space-y-6' onSubmit={form.handleSubmit(handleSubmitToken)}>
            <div className='space-y-2'>
              <Label htmlFor='name'>名称</Label>
              <Input id='name' placeholder='例如：主力令牌' {...form.register('name')} />
              <p className='text-xs text-[var(--danger)]'>{form.formState.errors.name?.message}</p>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <Label htmlFor='expires_at'>过期时间</Label>
                <div className='flex flex-wrap gap-2'>
                  {[
                    { key: 'never', label: '永不过期' },
                    { key: 'month', label: '一个月' },
                    { key: 'day', label: '一天' },
                  ].map((preset) => {
                    const active =
                      preset.key === 'never'
                        ? !expiresAtValue
                        : expiresAtValue === buildQuickExpiry(preset.key as 'day' | 'month')

                    return (
                      <button
                        key={preset.key}
                        type='button'
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                          active
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]'
                            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:bg-[var(--surface-strong)]'
                        )}
                        onClick={() => applyExpiryPreset(preset.key as 'never' | 'day' | 'month')}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Input
                id='expires_at'
                type='datetime-local'
                {...form.register('expires_at')}
              />
              <p className='text-xs text-[var(--muted)]'>可以直接选择具体时间，留空表示永不过期。</p>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-3'>
                <Label htmlFor='quota'>额度设置</Label>
                <div className='flex items-center gap-2 text-sm text-[var(--muted-strong)]'>
                  <Controller
                    control={form.control}
                    name='unlimited_quota'
                    render={({ field }) => (
                      <Checkbox
                        id='unlimited_quota'
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                    )}
                  />
                  <Label htmlFor='unlimited_quota' className='cursor-pointer text-sm font-medium'>
                    无限额度
                  </Label>
                </div>
              </div>
              <Input
                id='quota'
                type='number'
                min='0'
                placeholder='请输入额度'
                disabled={unlimitedQuota}
                {...form.register('remain_quota')}
              />
              <p className='text-xs text-[var(--muted)]'>
                {unlimitedQuota ? '当前已设置为无限额度。' : '输入要分配给这个令牌的额度。'}
              </p>
              <p className='text-xs text-[var(--danger)]'>
                {form.formState.errors.remain_quota?.message}
              </p>
            </div>

            <div className='space-y-3'>
              <div>
                <Label htmlFor='limits'>访问限制</Label>
                <p className='mt-1 text-xs text-[var(--muted)]'>用模型限制控制这个令牌可以访问哪些模型。</p>
              </div>
              <Textarea
                id='limits'
                placeholder='例如：gpt-4o,o3-mini，多个模型可用逗号或换行分隔'
                {...form.register('model_limits')}
              />
            </div>

            <div className='flex items-center justify-end gap-3'>
              <Button type='button' variant='secondary' onClick={closeEditorDialog}>
                取消
              </Button>
              <Button disabled={pending}>
                {isEdit ? '保存修改' : '创建令牌'}
              </Button>
            </div>
          </form>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(selectedKey)}
        onClose={() => setSelectedKey(null)}
        title='完整 Key'
        description='该值只在按需查看时展示，请妥善保存。'
      >
        <div className='space-y-4 p-6'>
          <code className='block overflow-x-auto rounded-[var(--radius-md)] bg-[var(--surface-strong)] p-4 text-sm'>
            {selectedKey}
          </code>
          <div className='flex justify-end'>
            <Button type='button' variant='secondary' onClick={() => setSelectedKey(null)}>
              关闭
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
