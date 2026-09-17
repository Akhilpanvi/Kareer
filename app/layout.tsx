import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL('https://kloop.klef.me'),
  title: { default: 'Kloop · KL University Placement Cell', template: '%s · Kloop' },
  description: 'Kloop — student technical growth and profile strength for the KL University Placement Cell.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#a41c24' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
