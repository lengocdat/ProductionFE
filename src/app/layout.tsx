import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SportMatch - Tìm trận thể thao',
  description: 'Ứng dụng tìm trận thể thao gần bạn',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="mx-auto max-w-md min-h-screen shadow-lg bg-gray-50 relative">
          {children}
        </div>
      </body>
    </html>
  )
}
