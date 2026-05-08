import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  BrainCircuit,
  Building2,
  Coins,
  Gauge,
  Layers3,
  Route,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { SiteHeader } from '@/components/shell/site-header'
import type { PricingPreviewItem, PricingResponse } from '@/types/api'

type MarketingHomeProps = {
  pricing: PricingResponse
  authenticated: boolean
  legal: {
    privacyEnabled: boolean
    termsEnabled: boolean
  }
}

const valueProps = [
  {
    title: '把 OpenAI API 能力搬过来',
    description: '保留你熟悉的大模型 API 使用方式，把调用、密钥和模型选择放进一个更容易管理的入口。',
    icon: ShieldCheck,
  },
  {
    title: '更便宜，预算更耐用',
    description: '核心目标很简单：降低调用成本，让同样的预算覆盖更多请求、更多实验和更长周期。',
    icon: Coins,
  },
  {
    title: '更多 token，少一点心疼',
    description: 'MoreToken 的名字就是承诺：把钱尽量花在模型输出上，而不是被复杂成本悄悄吃掉。',
    icon: Layers3,
  },
  {
    title: '价格和用量都看得见',
    description: '模型价格、余额、用量趋势和账单记录集中展示，知道每次调用大概花在哪里。',
    icon: Gauge,
  },
]

const scenarios = [
  {
    title: '正在做 AI 产品',
    description: '需要频繁调模型、跑功能验证、优化提示词时，更低成本会直接放大迭代速度。',
    icon: Blocks,
  },
  {
    title: '团队内部工具',
    description: '把模型能力接进知识库、客服、办公流程或内部助手，同时让每个阶段的花费可见。',
    icon: Building2,
  },
  {
    title: '自动化与 Agent',
    description: '长链路任务会消耗大量 token。MoreToken 让你更敢测试、更敢跑批量任务。',
    icon: BrainCircuit,
  },
]

const experienceHighlights = [
  'OpenAI API 能力',
  '更低调用成本',
  '更多可用 token',
  '用量账单清楚',
]

const faqs = [
  {
    question: 'MoreToken 提供的是什么服务？',
    answer: 'MoreToken 把 OpenAI API 相关的大模型能力整理成更便宜、更好管理的调用入口，适合需要长期、频繁使用模型的个人和团队。',
  },
  {
    question: '为什么叫 MoreToken？',
    answer: '因为我们希望同样的预算能换到更多 token。对开发、测试、Agent 和批量任务来说，更多 token 就意味着更多尝试空间。',
  },
  {
    question: '我可以先看模型和价格吗？',
    answer: '可以。模型与价格页支持公开浏览，注册前也能先判断可用能力和大致成本。',
  },
  {
    question: '注册后可以做什么？',
    answer: '注册后可以进入控制台管理访问令牌，查看余额、订阅、用量趋势和账单记录，然后把 API 接入你的应用。',
  },
]

const comparisonRows = [
  { label: '接入目标', value: '用熟悉的 API 方式调用大模型能力' },
  { label: '核心优势', value: '更低价格，让预算换到更多 token' },
  { label: '管理方式', value: '密钥、余额、订阅、账单集中在控制台' },
]

function renderPriceSummary(item: PricingPreviewItem) {
  if (item.model_price > 0) {
    return `${item.model_price} / 次或单位`
  }
  if (item.model_ratio > 0) {
    return `倍率 ${item.model_ratio}`
  }
  return '按平台策略计费'
}

export function MarketingHome({
  pricing,
  authenticated,
  legal,
}: MarketingHomeProps) {
  const previewItems = pricing.data.slice(0, 6)
  const primaryCta = authenticated
    ? { href: '/dashboard', label: '进入控制台' }
    : { href: '/register', label: '立即开始使用' }
  const secondaryCta = authenticated
    ? { href: '/models', label: '查看模型与价格' }
    : { href: '/models', label: '浏览模型与价格' }

  return (
    <div className='min-h-screen'>
      <SiteHeader authenticated={authenticated} />
      <main>
        <section className='mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-20'>
          <div className='space-y-7'>
            <Badge tone='warning'>MoreToken = more token</Badge>

            <div className='space-y-5'>
              <h1 className='max-w-4xl text-5xl font-semibold leading-[1.04] text-[var(--foreground)] md:text-6xl'>
                MoreToken，
                <br />
                更便宜地用起来。
              </h1>
              <p className='max-w-2xl text-lg leading-8 text-[var(--muted-strong)]'>
                MoreToken 做的事情很直接：把 OpenAI API 相关的大模型能力搬到一个更省钱、更好管理的入口里。你继续用熟悉的方式接入模型，但同样的预算可以跑更多请求、得到更多 token。
              </p>
            </div>

            <div className='flex flex-col gap-3 sm:flex-row'>
              <Link href={primaryCta.href}>
                <Button size='lg'>
                  {primaryCta.label}
                  <ArrowRight className='ml-2 size-4' />
                </Button>
              </Link>
              <Link href={secondaryCta.href}>
                <Button size='lg' variant='secondary'>
                  {secondaryCta.label}
                </Button>
              </Link>
            </div>

            <div className='flex flex-wrap gap-3'>
              {experienceHighlights.map((item) => (
                <div
                  key={item}
                  className='inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--muted-strong)] shadow-[var(--shadow-card)]'
                >
                  <BadgeCheck className='size-4 text-[var(--accent)]' />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <Card className='relative overflow-hidden border-none bg-[#101815] text-white shadow-[0_36px_90px_rgba(15,23,42,0.26)]'>
            <div className='absolute inset-x-0 top-0 h-1 bg-[var(--accent)]' />
            <CardContent className='relative flex h-full flex-col justify-between gap-8 p-8'>
              <div className='space-y-6'>
                <div className='flex items-center gap-3 text-sm text-[rgba(236,253,245,0.76)]'>
                  <Route className='size-4 text-[#7ddfbd]' />
                  <span>更短的路，更低的成本</span>
                </div>
                <div>
                  <p className='text-sm text-[rgba(236,253,245,0.76)]'>你的应用</p>
                  <div className='mt-3 flex items-center gap-3'>
                    <div className='h-px flex-1 bg-[rgba(236,253,245,0.22)]' />
                    <ArrowRight className='size-5 text-[#7ddfbd]' />
                    <div className='h-px flex-1 bg-[rgba(236,253,245,0.22)]' />
                  </div>
                  <div className='mt-3 rounded-[var(--radius-lg)] border border-[rgba(236,253,245,0.14)] bg-[rgba(255,255,255,0.08)] p-5'>
                    <div className='flex items-center gap-3'>
                      <Sparkles className='size-5 text-[#7ddfbd]' />
                      <p className='text-2xl font-semibold'>MoreToken API</p>
                    </div>
                    <p className='mt-3 text-sm leading-6 text-[rgba(236,253,245,0.78)]'>
                      OpenAI API 能力接入、模型价格预览、密钥管理、余额和用量记录集中处理。
                    </p>
                  </div>
                  <div className='mt-3 flex items-center gap-3'>
                    <div className='h-px flex-1 bg-[rgba(236,253,245,0.22)]' />
                    <ArrowRight className='size-5 text-[#7ddfbd]' />
                    <div className='h-px flex-1 bg-[rgba(236,253,245,0.22)]' />
                  </div>
                  <p className='mt-3 text-sm text-[rgba(236,253,245,0.76)]'>更多输出、更少成本压力</p>
                </div>
              </div>

              <div className='grid gap-3'>
                {comparisonRows.map((row) => (
                  <div
                    key={row.label}
                    className='grid gap-2 rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.08)] p-4 sm:grid-cols-[92px_1fr]'
                  >
                    <p className='text-sm text-[rgba(236,253,245,0.62)]'>{row.label}</p>
                    <p className='text-sm font-semibold leading-6'>{row.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className='mx-auto max-w-7xl px-6 py-8 lg:px-8'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {valueProps.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title}>
                  <CardContent className='p-6'>
                    <div className='inline-flex rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]'>
                      <Icon className='size-5' />
                    </div>
                    <h2 className='mt-5 text-lg font-semibold text-[var(--foreground)]'>
                      {item.title}
                    </h2>
                    <p className='mt-3 text-sm leading-6 text-[var(--muted)]'>
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-6 py-12 lg:px-8'>
          <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
            <div>
              <Badge>什么时候最有感</Badge>
              <h2 className='mt-4 text-3xl font-semibold text-[var(--foreground)]'>
                当 token 消耗开始变大，便宜一点就不只是便宜一点。
              </h2>
              <p className='mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]'>
                开发、测试、上线、批量任务都会反复消耗 token。MoreToken 希望把每一次调用的成本降下来，让模型能力更适合长期使用。
              </p>
            </div>
          </div>

          <div className='mt-8 grid gap-4 lg:grid-cols-3'>
            {scenarios.map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.title}>
                  <CardContent className='p-6'>
                    <div className='inline-flex rounded-2xl bg-[var(--surface-strong)] p-3 text-[var(--accent-strong)]'>
                      <Icon className='size-5' />
                    </div>
                    <h3 className='mt-5 text-xl font-semibold text-[var(--foreground)]'>{item.title}</h3>
                    <p className='mt-3 text-sm leading-6 text-[var(--muted)]'>{item.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-6 py-12 lg:px-8'>
          <div className='flex flex-col gap-3 md:flex-row md:items-end md:justify-between'>
            <div>
              <Badge tone='default'>先看价格，再决定怎么用</Badge>
              <h2 className='mt-4 text-3xl font-semibold text-[var(--foreground)]'>
                模型能力摆在前面，调用成本也摆在前面。
              </h2>
              <p className='mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]'>
                你可以先浏览可用模型和价格摘要，再决定要接入哪个模型、要预留多少预算。
              </p>
            </div>
            <Link href='/models'>
              <Button variant='secondary'>查看完整模型页</Button>
            </Link>
          </div>

          <div className='mt-8'>
            {previewItems.length ? (
              <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
                {previewItems.map((item) => (
                  <Card key={item.model_name}>
                    <CardContent className='p-6'>
                      <div className='flex items-center justify-between gap-3'>
                        <div>
                          <p className='text-lg font-semibold text-[var(--foreground)]'>
                            {item.model_name}
                          </p>
                          <p className='mt-1 text-sm text-[var(--muted)]'>
                            {item.owner_by || '模型提供方'}
                          </p>
                        </div>
                        <Badge>{item.enable_groups?.[0] || 'public'}</Badge>
                      </div>

                      <p className='mt-4 text-sm leading-6 text-[var(--muted)]'>
                        {item.description || '可在模型页查看价格摘要、支持能力和可用范围。'}
                      </p>

                      <div className='mt-5 flex items-end justify-between'>
                        <div>
                          <p className='text-xs uppercase tracking-[0.18em] text-[var(--muted)]'>
                            价格摘要
                          </p>
                          <p className='mt-2 text-xl font-semibold text-[var(--foreground)]'>
                            {renderPriceSummary(item)}
                          </p>
                        </div>
                        <div className='rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]'>
                          <Wallet className='size-5' />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                title='模型价格即将展示'
                description='当前实例还没有返回公开价格数据。开放后，这里会自动展示可用模型和价格摘要。'
                action={
                  <Link href='/models'>
                    <Button variant='secondary'>打开模型页</Button>
                  </Link>
                }
              />
            )}
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-6 py-12 lg:px-8'>
          <div className='grid gap-4 md:grid-cols-2'>
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className='p-6'>
                  <h3 className='text-lg font-semibold text-[var(--foreground)]'>{faq.question}</h3>
                  <p className='mt-3 text-sm leading-6 text-[var(--muted)]'>{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className='border-t border-[var(--border)] bg-[rgba(255,255,255,0.72)]'>
        <div className='mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-center lg:justify-between lg:px-8'>
          <div>
            <p className='text-lg font-semibold text-[var(--foreground)]'>MoreToken</p>
            <p className='mt-2 text-sm text-[var(--muted)]'>
              OpenAI API 能力，更便宜地用起来。
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-4 text-sm text-[var(--muted)]'>
            <Link href='/models'>模型与价格</Link>
            <Link href='/login'>登录</Link>
            <Link href='/register'>注册</Link>
            {legal.termsEnabled ? <Link href='/legal/terms'>服务条款</Link> : null}
            {legal.privacyEnabled ? <Link href='/legal/privacy'>隐私政策</Link> : null}
          </div>
        </div>
      </footer>
    </div>
  )
}
