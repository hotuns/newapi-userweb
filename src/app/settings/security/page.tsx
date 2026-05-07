import { DashboardLayout } from '@/components/shell/dashboard-layout'
import { requireAuth } from '@/lib/auth'
import { SecuritySettingsForm } from '@/features/settings/components/security-settings-form'

export default async function SecuritySettingsPage() {
  await requireAuth()

  return (
    <DashboardLayout
      pathname='/settings/security'
      title='安全设置'
      description='当前版本只支持修改密码，Passkey 和 2FA 管理不纳入首期。'
    >
      <SecuritySettingsForm />
    </DashboardLayout>
  )
}
