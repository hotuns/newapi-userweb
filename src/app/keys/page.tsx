import { DashboardLayout } from '@/components/shell/dashboard-layout'
import { requireAuth } from '@/lib/auth'
import { buildQueryString } from '@/lib/utils'
import { getTokens } from '@/lib/server-fetch'
import { KeysPage } from '@/features/keys/components/keys-page'

export default async function UserKeysPage() {
  await requireAuth()
  const tokens = await getTokens(buildQueryString({ p: 1, page_size: 20 }))

  return (
    <DashboardLayout
      pathname='/keys'
      title='API Keys'
      description='创建、查看、启停和删除自己的令牌。完整值仅按需展示。'
    >
      <KeysPage tokens={tokens} />
    </DashboardLayout>
  )
}
