import Link from 'next/link'
import { BadgeCheck, CreditCard, KeyRound, LineChart, Sparkles } from 'lucide-react'
import { SiteHeader } from '@/components/shell/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { isAuthenticated } from '@/lib/auth'

const steps = [
  {
    title: '注册并登录',
    description: '创建你的 MoreToken 账号，进入个人控制台。',
    icon: Sparkles,
  },
  {
    title: '创建访问令牌',
    description: '在控制台生成访问令牌，用于你的工具、应用或服务。',
    icon: KeyRound,
  },
  {
    title: '开始使用模型能力',
    description: '选择合适的模型与价格方案，把能力接进你的业务场景。',
    icon: BadgeCheck,
  },
  {
    title: '查看余额和记录',
    description: '在控制台持续查看余额、订阅、账单和使用趋势。',
    icon: LineChart,
  },
]

const faq = [
  {
    question: '第一次使用 MoreToken，先看什么？',
    answer: '建议先浏览模型与价格页，确认可用能力和价格，再进入控制台开始使用。',
  },
  {
    question: '访问令牌是什么？',
    answer: '访问令牌是你在使用 MoreToken 服务时的身份凭据。创建后可以用于应用、工具或系统接入。',
  },
  {
    question: '怎么知道自己花了多少？',
    answer: '控制台会显示余额、订阅剩余、用量趋势和消费记录，账单信息也能随时回看。',
  },
]

export default async function TutorialPage() {
  const authenticated = await isAuthenticated()

  return (
    <div className='min-h-screen'>
      <SiteHeader authenticated={authenticated} />

      <main>
        <section className='mx-auto max-w-7xl px-6 py-6 lg:px-8 lg:py-8'>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {steps.map((step) => {
              const Icon = step.icon
              return (
                <Card key={step.title}>
                  <CardContent className='p-6'>
                    <div className='inline-flex rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent-strong)]'>
                      <Icon className='size-5' />
                    </div>
                    <h2 className='mt-5 text-lg font-semibold text-[var(--foreground)]'>
                      {step.title}
                    </h2>
                    <p className='mt-3 text-sm leading-6 text-[var(--muted)]'>
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-6 py-12 lg:px-8'>
          <div className='grid gap-6 lg:grid-cols-[0.9fr_1.1fr]'>
            <Card>
              <CardContent className='p-8'>
                <p className='text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]'>
                  第一步
                </p>
                <h2 className='mt-4 text-3xl font-semibold text-[var(--foreground)]'>
                  先看模型与价格，再决定怎么开始使用
                </h2>
                <p className='mt-4 text-sm leading-7 text-[var(--muted)]'>
                  MoreToken 官网会先把模型和价格公开展示出来，普通用户不需要先进后台，也不需要理解复杂配置，就能先判断能力是否适合自己。
                </p>
                <div className='mt-6'>
                  <Link href='/models'>
                    <Button variant='secondary'>打开模型与价格</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='p-8'>
                <p className='text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]'>
                  第二步
                </p>
                <h2 className='mt-4 text-3xl font-semibold text-[var(--foreground)]'>
                  进入控制台，管理访问令牌、余额和账单
                </h2>
                <p className='mt-4 text-sm leading-7 text-[var(--muted)]'>
                  登录后，你可以在控制台里查看余额、订阅、使用记录，并生成访问令牌。对普通用户来说，控制台就是最核心的操作入口。
                </p>
                <div className='mt-6 flex flex-wrap gap-3'>
                  <Link href={authenticated ? '/dashboard' : '/login'}>
                    <Button>打开控制台</Button>
                  </Link>
                  <div className='inline-flex items-center gap-2 rounded-full bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--muted-strong)]'>
                    <CreditCard className='size-4 text-[var(--accent)]' />
                    余额、订阅、账单一页可见
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className='mx-auto max-w-7xl px-6 py-12 lg:px-8'>
          <div className='grid gap-4 md:grid-cols-3'>
            {faq.map((item) => (
              <Card key={item.question}>
                <CardContent className='p-6'>
                  <h3 className='text-lg font-semibold text-[var(--foreground)]'>{item.question}</h3>
                  <p className='mt-3 text-sm leading-6 text-[var(--muted)]'>{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
