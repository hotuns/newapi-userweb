type DashboardLayoutProps = {
  pathname?: string
  title: string
  description: string
  showPageIntro?: boolean
  children: React.ReactNode
}

export async function DashboardLayout({
  title,
  description,
  showPageIntro = true,
  children,
}: DashboardLayoutProps) {
  return (
    <div className='mx-auto w-full max-w-7xl px-6 py-8 lg:px-8'>
      <div className='space-y-6'>
        {showPageIntro ? (
          <div className='flex flex-col justify-between gap-4 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[rgba(255,253,247,0.84)] p-6 shadow-[var(--shadow-soft)] md:flex-row md:items-end'>
            <div>
              <p className='text-sm text-[var(--muted)]'>用户控制台</p>
              <h1 className='mt-2 text-3xl font-semibold text-[var(--foreground)]'>{title}</h1>
              <p className='mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]'>
                {description}
              </p>
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
