import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  metadataBase: new URL('https://kareer.klef.me'),
  title: { default: 'Kareers · KL University Placement Cell', template: '%s · Kareers' },
  description: 'Student career tracking and placement readiness for KL University.',
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
