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
  description: 'MoreToken 把 OpenAI API 能力更便宜地用起来，让同样预算获得更多 token。',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/brand/moretoken-icon.png',
  },
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
