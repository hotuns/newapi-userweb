export type ApiResponse<T = unknown> = {
  success: boolean
  message?: string
  data?: T
  vendors?: PricingVendor[]
  group_ratio?: Record<string, number>
  usable_group?: Record<string, string>
}

export type ChatTemplateConfig = Record<string, string>

export type Announcement = {
  id?: number | string
  content: string
  publishDate?: string
  type?: 'default' | 'ongoing' | 'success' | 'warning' | 'error'
  extra?: string
}

export type SystemStatus = {
  version?: string
  system_name?: string
  server_address?: string
  email_verification?: boolean
  turnstile_check?: boolean
  turnstile_site_key?: string
  quota_display_type?: string
  quota_per_unit?: number
  usd_exchange_rate?: number
  custom_currency_symbol?: string
  custom_currency_exchange_rate?: number
  self_use_mode_enabled?: boolean
  user_agreement_enabled?: boolean
  privacy_policy_enabled?: boolean
  chats?: ChatTemplateConfig[]
  announcements_enabled?: boolean
  announcements?: Announcement[]
}

export type LoginResponse = ApiResponse<{
  require_2fa?: boolean
  id?: number
  username?: string
  display_name?: string
  role?: number
  status?: number
  group?: string
}>

export type RegisterPayload = {
  username: string
  password: string
  email?: string
  verification_code?: string
  turnstile?: string
}

export type UserProfile = {
  id: number
  username: string
  display_name: string
  role: number
  status: number
  email?: string
  group: string
  quota: number
  used_quota: number
  request_count: number
  aff_count: number
  aff_quota: number
  aff_history_quota: number
  setting?: string
}

export type TokenRecord = {
  id: number
  name: string
  key: string
  status: number
  remain_quota: number
  used_quota?: number
  unlimited_quota: boolean
  created_time: number
  accessed_time: number
  expired_time: number
  group?: string
  model_limits_enabled?: boolean
  model_limits?: string
  allow_ips?: string
  cross_group_retry?: boolean
}

export type PaginatedResponse<T> = ApiResponse<{
  items: T[]
  total: number
  page: number
  page_size: number
}>

export type UsageLog = {
  id: number
  created_at?: number
  type: number
  model_name?: string
  token_name?: string
  quota: number
  prompt_tokens?: number
  completion_tokens?: number
  request_id?: string
  use_time?: number
  content?: string
  createdAt?: number
}

export type LogStats = {
  quota: number
  rpm: number
  tpm: number
}

export type QuotaDataPoint = {
  id?: number
  user_id?: number
  username?: string
  model_name?: string
  created_at: number
  token_used?: number
  count?: number
  quota?: number
}

export type UsageTrendBucket = {
  timestamp: number
  quota: number
  count: number
  token_used: number
}

export type UsageTrendResponse = ApiResponse<{
  start_timestamp: number
  end_timestamp: number
  bucket_size: 3600 | 86400
  points: UsageTrendBucket[]
}>

export type PricingVendor = {
  id: number
  name: string
  description?: string
  icon?: string
}

export type PricingPreviewItem = {
  model_name: string
  description?: string
  icon?: string
  tags?: string
  vendor_id?: number
  quota_type: number
  model_ratio: number
  model_price: number
  owner_by: string
  completion_ratio: number
  cache_ratio?: number
  create_cache_ratio?: number
  image_ratio?: number
  audio_ratio?: number
  audio_completion_ratio?: number
  enable_groups: string[]
  supported_endpoint_types: string[]
  billing_mode?: string
  billing_expr?: string
  pricing_version?: string
}

export type PricingResponse = {
  success: boolean
  data: PricingPreviewItem[]
  vendors: PricingVendor[]
  group_ratio: Record<string, number>
  usable_group: Record<string, string>
  pricing_version?: string
}

export type TopupInfo = {
  enable_online_topup: boolean
  enable_stripe_topup: boolean
  discount?: Record<number, number>
  pay_methods: Array<{
    name: string
    type: string
    color?: string
    icon?: string
    min_topup?: number | string
  }>
  min_topup: number
  stripe_min_topup: number
  amount_options: number[]
  topup_link?: string
}

export type TopupRecord = {
  id: number
  amount: number
  money: number
  trade_no: string
  payment_method: string
  create_time: number
  complete_time?: number
  status: string
}

export type SubscriptionSummary = {
  billing_preference?: string
  subscriptions?: SubscriptionRecord[]
  all_subscriptions?: SubscriptionRecord[]
}

export type SubscriptionPlan = {
  id: number
  title: string
  subtitle?: string
  price_amount: number
  currency?: string
  duration_unit: 'year' | 'month' | 'day' | 'hour' | 'custom'
  duration_value: number
  custom_seconds?: number
  quota_reset_period?: 'never' | 'daily' | 'weekly' | 'monthly' | 'custom'
  quota_reset_custom_seconds?: number
  total_amount: number
  enabled?: boolean
  sort_order?: number
}

export type UserSubscription = {
  id: number
  user_id: number
  plan_id: number
  status: string
  source?: string
  start_time: number
  end_time: number
  amount_total: number
  amount_used: number
  last_reset_time?: number
  next_reset_time?: number
  upgrade_group?: string
  prev_user_group?: string
}

export type SubscriptionRecord = {
  subscription: UserSubscription
  plan?: SubscriptionPlan
}
