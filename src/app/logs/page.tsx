import { DashboardLayout } from '@/components/shell/dashboard-layout'
import { requireAuth } from '@/lib/auth'
import { buildQueryString } from '@/lib/utils'
import { getUserLogStats, getUserLogs } from '@/lib/server-fetch'
import { LogsPage } from '@/features/logs/components/logs-page'

export default async function UserLogsPage() {
  await requireAuth()
  const query = buildQueryString({ p: 1, page_size: 20 })
  const [logs, stats] = await Promise.all([
    getUserLogs(query),
    getUserLogStats(),
  ])

  return (
    <DashboardLayout
      pathname='/logs'
      title='消费日志'
      description='查看自己的模型调用记录、token 使用情况和统计摘要。'
    >
      <LogsPage logs={logs} stats={stats} />
    </DashboardLayout>
  )
}
