import { DashboardLayout } from '@/components/shell/dashboard-layout'
import { requireAuth } from '@/lib/auth'
import { getSelf } from '@/lib/server-fetch'
import { ProfileSettingsForm } from '@/features/settings/components/profile-settings-form'

export default async function ProfileSettingsPage() {
  await requireAuth()
  const profile = await getSelf()

  if (!profile.data) {
    return null
  }

  return (
    <DashboardLayout
      pathname='/settings/profile'
      title='个人资料'
      description='查看账号基础信息并更新显示名称。'
    >
      <ProfileSettingsForm profile={profile.data} />
    </DashboardLayout>
  )
}
