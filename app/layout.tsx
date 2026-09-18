import type { Metadata, Viewport } from 'next'
import { Inter, Sora } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-sora' })

export const metadata: Metadata = {
  metadataBase: new URL('https://kloop.klef.me'),
  title: { default: 'Kloop · KL University Placements', template: '%s · Kloop' },
  description: 'Kloop — student technical growth and profile strength for the KL University Placements.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#a41c24' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  )
}
