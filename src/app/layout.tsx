import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import './globals.css'

const APP_URL = 'https://coduyen.net'
const APP_NAME = 'Chunk English'
const TITLE = 'Chunk English – Học nói tiếng Anh theo phương pháp shadowing'
const DESCRIPTION =
  'Chunk English dạy tiếng Anh giao tiếp theo quy trình Input → Shadow → Chunk → Speak. ' +
  'Nghe audio người bản xứ, nhại theo từng câu, học các cụm collocations và luyện nói. ' +
  'Dành cho Developer và Product Owner muốn giao tiếp tự nhiên trong công việc.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'học tiếng Anh giao tiếp', 'shadowing tiếng Anh', 'luyện nói tiếng Anh',
    'English for developers', 'English for product managers', 'collocations',
    'chunk English', 'luyện nghe tiếng Anh', 'phương pháp shadowing',
  ],
  applicationName: APP_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: APP_URL,
    siteName: APP_NAME,
    title: TITLE,
    description: DESCRIPTION,
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: APP_URL,
    languages: { 'vi-VN': APP_URL },
  },
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <div className="mx-auto max-w-md min-h-screen shadow-lg bg-gray-50 relative">
          {children}
        </div>
      </body>
    </html>
  )
}
