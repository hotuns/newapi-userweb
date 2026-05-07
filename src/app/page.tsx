import { isAuthenticated } from '@/lib/auth'
import { getPricing, getStatus } from '@/lib/server-fetch'
import { MarketingHome } from '@/features/marketing/components/marketing-home'

export default async function HomePage() {
  const [statusResponse, pricing, authenticated] = await Promise.all([
    getStatus(),
    getPricing(),
    isAuthenticated(),
  ])

  const status = statusResponse.data || {}

  return (
    <MarketingHome
      pricing={pricing}
      authenticated={authenticated}
      legal={{
        privacyEnabled: Boolean(status.privacy_policy_enabled),
        termsEnabled: Boolean(status.user_agreement_enabled),
      }}
    />
  )
}
