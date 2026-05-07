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
  ShieldCheck,
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
    title: '专业交付',
    description: '围绕大模型 API 使用场景设计，适合产品上线、团队协作和长期稳定使用。',
    icon: ShieldCheck,
  },
  {
    title: '高性价比',
    description: '在模型选择、计费方式和使用可见性之间做平衡，把成本控制交还给用户。',
    icon: Coins,
  },
  {
    title: '统一入口',
    description: '一个账户查看模型、余额、套餐、访问令牌和使用记录，体验更连贯。',
    icon: Layers3,
  },
  {
    title: '透明可控',
    description: '价格预览、用量趋势、账单记录和套餐状态都能直接查看，不靠猜测。',
    icon: Gauge,
  },
]

const scenarios = [
  {
    title: 'AI 产品与应用',
    description: '适合需要快速接入大模型能力的产品团队、SaaS 服务和新项目。',
    icon: Blocks,
  },
  {
    title: '企业内部工具',
    description: '把模型能力接进知识库、客服、办公流程或内部助手，同时保持成本可见。',
    icon: Building2,
  },
  {
    title: '自动化与 Agent',
    description: '适合需要稳定调用、清晰计费和多模型可选能力的自动化场景。',
    icon: BrainCircuit,
  },
]

const experienceHighlights = [
  '主流模型统一接入',
  '价格与用量透明',
  '余额与套餐可见',
  '访问令牌独立管理',
]

const faqs = [
  {
    question: 'MoreToken 提供的是什么服务？',
    answer: 'MoreToken 是面向大模型使用场景的 API 服务平台，帮助你更专业地使用、管理和追踪模型能力。',
  },
  {
    question: '为什么强调高性价比？',
    answer: '因为模型能力不仅要能用，还要算得清。MoreToken 把价格预览、用量记录和账单信息放到同一套体验里，方便你控制成本。',
  },
  {
    question: '我可以先看模型和价格吗？',
    answer: '可以。首页和模型页都支持公开浏览模型与价格预览，注册前也能先了解可用能力。',
  },
  {
    question: '注册后可以做什么？',
    answer: '注册后你可以进入 MoreToken 控制台，查看余额、套餐、模型、访问令牌、用量记录和账单概览。',
  },
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
        <section className='mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-22'>
          <div className='space-y-7'>
            <Badge tone='warning'>MoreToken 大模型 API</Badge>

            <div className='space-y-5'>
              <h1 className='max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-[var(--foreground)] md:text-6xl'>
                专业、稳定、高性价比的
                <br />
                大模型 API 服务
              </h1>
              <p className='max-w-2xl text-lg leading-8 text-[var(--muted-strong)]'>
                MoreToken 面向真实使用场景提供大模型 API 能力。你可以在一个更清晰的体系里完成模型选择、额度管理、访问控制和用量追踪，让模型能力真正成为可交付、可持续、可控成本的服务。
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

          <Card className='relative overflow-hidden border-none bg-[linear-gradient(145deg,#0f1720_0%,#102720_38%,#10a37f_100%)] text-white shadow-[0_36px_90px_rgba(15,23,42,0.26)]'>
            <div className='absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(110,231,183,0.18),transparent_38%)]' />
            <CardContent className='relative flex h-full flex-col justify-between gap-8 p-8'>
              <div className='space-y-5'>
                <p className='text-sm uppercase tracking-[0.18em] text-[rgba(236,253,245,0.76)]'>
                  为什么选择 MoreToken
                </p>
                <div className='grid gap-4'>
                  <div className='rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.10)] p-5 backdrop-blur'>
                    <p className='text-sm text-[rgba(236,253,245,0.76)]'>专业能力</p>
                    <p className='mt-2 text-2xl font-semibold'>围绕大模型 API 而设计</p>
                  </div>
                  <div className='rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.08)] p-5 backdrop-blur'>
                    <p className='text-sm text-[rgba(236,253,245,0.76)]'>成本体验</p>
                    <p className='mt-2 text-2xl font-semibold'>价格、余额、账单都看得见</p>
                  </div>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.08)] p-4'>
                  <p className='text-sm text-[rgba(236,253,245,0.76)]'>适合</p>
                  <p className='mt-2 text-lg font-semibold'>产品团队、企业工具、自动化场景</p>
                </div>
                <div className='rounded-[var(--radius-lg)] bg-[rgba(255,255,255,0.08)] p-4'>
                  <p className='text-sm text-[rgba(236,253,245,0.76)]'>重点</p>
                  <p className='mt-2 text-lg font-semibold'>专业交付 + 高性价比 + 透明可控</p>
                </div>
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
              <Badge>适用场景</Badge>
              <h2 className='mt-4 text-3xl font-semibold text-[var(--foreground)]'>
                不只是“能调用模型”，而是把模型能力真正用进业务和产品。
              </h2>
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
              <Badge tone='default'>热门模型与价格</Badge>
              <h2 className='mt-4 text-3xl font-semibold text-[var(--foreground)]'>
                公开浏览热门模型与价格摘要，先判断能力和成本，再开始接入或使用。
              </h2>
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
                title='热门模型价格即将展示'
                description='当前实例还没有返回公开价格数据。模型页结构已经就绪，开放后会自动展示。'
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
              专业、高性价比的大模型 API 服务平台。
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
