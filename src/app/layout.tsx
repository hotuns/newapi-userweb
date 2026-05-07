import type { Metadata } from 'next'
import { DM_Sans, IBM_Plex_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { AppProviders } from '@/components/providers/app-providers'
import './globals.css'

const sans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
})

const mono = IBM_Plex_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: {
    default: 'MoreToken',
    template: '%s | MoreToken',
  },
  description: 'MoreToken 是专业、高性价比的大模型 API 服务平台。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang='zh-CN'
      className={`${sans.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className='min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased'
        suppressHydrationWarning
      >
        <AppProviders>
          {children}
          <Toaster richColors position='top-right' />
        </AppProviders>
      </body>
    </html>
  )
}
