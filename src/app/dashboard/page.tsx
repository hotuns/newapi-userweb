import { DashboardLayout } from '@/components/shell/dashboard-layout'
import { requireAuth } from '@/lib/auth'
import { getNewApiBaseUrl } from '@/lib/env'
import { buildQueryString } from '@/lib/utils'
import {
  getNotice,
  getStatus,
  getSubscriptionPlans,
  getSubscriptionSelf,
  getSelf,
  getTopupInfo,
  getTopupRecords,
  getUserLogs,
  getUserModels,
  getUserQuotaData,
  getTokens,
} from '@/lib/server-fetch'
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview'

export default async function DashboardPage() {
  await requireAuth()

  const now = new Date()
  const endTimestamp = Math.floor(now.getTime() / 1000)
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const todayStartTimestamp = Math.floor(startOfToday.getTime() / 1000)

  const startOfThreeDays = new Date(startOfToday)
  startOfThreeDays.setDate(startOfThreeDays.getDate() - 2)
  const threeDayStartTimestamp = Math.floor(startOfThreeDays.getTime() / 1000)

  const startOfSevenDays = new Date(startOfToday)
  startOfSevenDays.setDate(startOfSevenDays.getDate() - 6)
  const sevenDayStartTimestamp = Math.floor(startOfSevenDays.getTime() / 1000)

  const initialLogQuery = buildQueryString({
    p: 1,
    page_size: 10,
    start_timestamp: todayStartTimestamp,
    end_timestamp: endTimestamp,
  })

  const [status, notice, profile, userModels, tokens, subscription, subscriptionPlans, topupInfo, topupRecords] =
    await Promise.all([
      getStatus(),
      getNotice(),
      getSelf(),
      getUserModels(),
      getTokens(buildQueryString({ p: 1, page_size: 50 })),
      getSubscriptionSelf(),
      getSubscriptionPlans(),
      getTopupInfo(),
      getTopupRecords(buildQueryString({ p: 1, page_size: 20 })),
    ])

  const [trendToday, trendThreeDays, trendSevenDays, initialLogs] =
    await Promise.all([
      getUserQuotaData(
        buildQueryString({
          start_timestamp: todayStartTimestamp,
          end_timestamp: endTimestamp,
        })
      ),
      getUserQuotaData(
        buildQueryString({
          start_timestamp: threeDayStartTimestamp,
          end_timestamp: endTimestamp,
        })
      ),
      getUserQuotaData(
        buildQueryString({
          start_timestamp: sevenDayStartTimestamp,
          end_timestamp: endTimestamp,
        })
      ),
      getUserLogs(initialLogQuery),
    ])

  const apiBaseUrl =
    status.data?.server_address?.trim() || getNewApiBaseUrl().toString().replace(/\/$/, '')

  return (
    <DashboardLayout
      pathname='/dashboard'
      title='控制台工作台'
      description='在一个页面内查看用量趋势、余额与订阅、默认令牌和消费明细。'
      showPageIntro={false}
    >
      <DashboardOverview
        status={status}
        notice={notice}
        profile={profile}
        userModels={userModels}
        tokens={tokens}
        subscription={subscription}
        subscriptionPlans={subscriptionPlans}
        trendToday={trendToday}
        trendThreeDays={trendThreeDays}
        trendSevenDays={trendSevenDays}
        initialLogs={initialLogs}
        topupInfo={topupInfo}
        topupRecords={topupRecords}
        apiBaseUrl={apiBaseUrl}
        renderedAtMs={now.getTime()}
      />
    </DashboardLayout>
  )
}
