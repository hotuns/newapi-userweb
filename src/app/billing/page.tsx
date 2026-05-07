import { DashboardLayout } from '@/components/shell/dashboard-layout'
import { requireAuth } from '@/lib/auth'
import { buildQueryString } from '@/lib/utils'
import {
  getSubscriptionPlans,
  getSubscriptionSelf,
  getTopupInfo,
  getTopupRecords,
} from '@/lib/server-fetch'
import { BillingPage } from '@/features/billing/components/billing-page'

export default async function UserBillingPage() {
  await requireAuth()
  const [topupInfo, topupRecords, subscription, subscriptionPlans] = await Promise.all([
    getTopupInfo(),
    getTopupRecords(buildQueryString({ p: 1, page_size: 20 })),
    getSubscriptionSelf(),
    getSubscriptionPlans(),
  ])

  return (
    <DashboardLayout
      pathname='/billing'
      title='账单与订阅'
      description='只读展示充值配置、充值记录和订阅概览，不在当前版本发起支付动作。'
    >
      <BillingPage
        topupInfo={topupInfo}
        topupRecords={topupRecords}
        subscription={subscription}
        subscriptionPlans={subscriptionPlans}
      />
    </DashboardLayout>
  )
}
