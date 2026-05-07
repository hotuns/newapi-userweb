import { isAuthenticated } from '@/lib/auth'
import { getPricing, getUserModels } from '@/lib/server-fetch'
import { ModelsPage } from '@/features/models/components/models-page'

export default async function PublicModelsPage() {
  const authenticated = await isAuthenticated()
  const [pricing, userModelsResponse] = await Promise.all([
    getPricing(),
    authenticated ? getUserModels() : Promise.resolve({ success: true, data: [] }),
  ])

  return (
    <ModelsPage
      pricing={pricing}
      authenticated={authenticated}
      userModels={userModelsResponse.data || []}
    />
  )
}
