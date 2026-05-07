import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TableBody, TableHead, TableWrapper, Td, Th } from '@/components/ui/table'
import { formatDateTime, formatNumber } from '@/lib/utils'
import type { ApiResponse, LogStats, PaginatedResponse, UsageLog } from '@/types/api'

type LogsPageProps = {
  logs: PaginatedResponse<UsageLog>
  stats: ApiResponse<LogStats>
}

export function LogsPage({ logs, stats }: LogsPageProps) {
  const items = logs.data?.items ?? []

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardContent className='p-5'>
            <p className='text-sm text-[var(--muted)]'>总额度消耗</p>
            <p className='mt-3 text-2xl font-semibold'>{formatNumber(stats.data?.quota ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-5'>
            <p className='text-sm text-[var(--muted)]'>RPM</p>
            <p className='mt-3 text-2xl font-semibold'>{formatNumber(stats.data?.rpm ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-5'>
            <p className='text-sm text-[var(--muted)]'>TPM</p>
            <p className='mt-3 text-2xl font-semibold'>{formatNumber(stats.data?.tpm ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>消费日志</CardTitle>
          <CardDescription>V1 暂不做前端高级筛选 UI，先展示后端返回的默认分页结果。</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length ? (
            <TableWrapper>
              <Table>
                <TableHead>
                  <tr>
                    <Th>时间</Th>
                    <Th>模型</Th>
                    <Th>Token</Th>
                    <Th>请求 ID</Th>
                    <Th>额度</Th>
                    <Th>提示词 Tokens</Th>
                    <Th>输出 Tokens</Th>
                  </tr>
                </TableHead>
                <TableBody>
                  {items.map((log) => (
                    <tr key={log.id}>
                      <Td>{formatDateTime(log.created_at, 'seconds')}</Td>
                      <Td>{log.model_name || '-'}</Td>
                      <Td>{log.token_name || '-'}</Td>
                      <Td className='font-mono text-xs'>{log.request_id || '-'}</Td>
                      <Td>{formatNumber(log.quota)}</Td>
                      <Td>{formatNumber(log.prompt_tokens ?? 0)}</Td>
                      <Td>{formatNumber(log.completion_tokens ?? 0)}</Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </TableWrapper>
          ) : (
            <EmptyState
              title='暂无日志'
              description='你还没有产生可展示的消费日志。开始调用模型后，这里会显示详细记录。'
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
