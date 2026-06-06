import type { Metadata, Viewport } from 'next'
import './globals.css'

const APP_URL = 'https://coduyen.net'
const APP_NAME = 'CoDuyen'
const TITLE = 'CoDuyen – Tìm trận thể thao, kết nối người chơi gần bạn'
const DESCRIPTION =
  'CoDuyen là ứng dụng tìm trận thể thao theo vị trí thực tế tại Việt Nam. ' +
  'Ghép cặp cầu lông, bóng đá, pickleball, tennis, bóng bàn theo trình độ. ' +
  'Tạo trận, xin tham gia, nhắn tin và đánh giá – tất cả trong một app. ' +
  'Đang hoạt động tại TP.HCM và đang mở rộng toàn quốc.'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: TITLE,
    template: `%s | ${APP_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    'tìm trận thể thao', 'kết nối thể thao', 'tìm người chơi cầu lông',
    'tìm trận bóng đá', 'tìm trận pickleball', 'tìm trận tennis',
    'ghép cặp thể thao', 'cộng đồng thể thao Việt Nam',
    'tìm đối thủ thể thao', 'đặt sân thể thao', 'sport matching Vietnam',
    'CoDuyen', 'tìm bạn chơi thể thao', 'TP.HCM thể thao',
  ],
  authors: [{ name: 'CoDuyen Team', url: APP_URL }],
  creator: 'CoDuyen',
  publisher: 'CoDuyen',
  category: 'Sports',
  applicationName: APP_NAME,
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: APP_URL,
    siteName: APP_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'CoDuyen – Tìm trận thể thao gần bạn',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${APP_URL}/og-image.png`],
    creator: '@CoDuyenApp',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.svg',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: APP_URL,
    languages: { 'vi-VN': APP_URL },
  },
  verification: {
    other: { 'zalo-platform-site-verification': 'S-wo9fhj5p5-vQytXP8xONZbl4YKasaUCJCn' },
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${APP_URL}/#webapp`,
      name: APP_NAME,
      url: APP_URL,
      description: DESCRIPTION,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'vi-VN',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'VND',
        description: 'Miễn phí tải và sử dụng cơ bản',
      },
      featureList: [
        'Tìm trận thể thao theo vị trí GPS',
        'Ghép cặp theo trình độ: Yếu, Trung bình, Khá, Bán chuyên',
        'Hỗ trợ: Cầu lông, Bóng đá, Pickleball, Tennis, Bóng bàn, Bóng rổ, Bóng chuyền, Chạy bộ',
        'Tạo trận và quản lý người tham gia',
        'Nhắn tin realtime trong nhóm',
        'Đánh giá và hệ thống uy tín người chơi',
        'Cộng đồng kết bạn người chơi thể thao',
      ],
      availableOnDevice: ['Mobile', 'Desktop'],
      screenshot: `${APP_URL}/og-image.png`,
    },
    {
      '@type': 'Organization',
      '@id': `${APP_URL}/#org`,
      name: APP_NAME,
      url: APP_URL,
      logo: `${APP_URL}/favicon.svg`,
      sameAs: [],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        availableLanguage: 'Vietnamese',
      },
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'CoDuyen là gì?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'CoDuyen là ứng dụng kết nối người yêu thể thao tại Việt Nam. Bạn có thể tìm trận cầu lông, bóng đá, pickleball, tennis gần nhà theo trình độ, tạo trận, xin tham gia và nhắn tin với người chơi.',
          },
        },
        {
          '@type': 'Question',
          name: 'CoDuyen hỗ trợ những môn thể thao nào?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'CoDuyen hỗ trợ cầu lông, bóng đá, pickleball, tennis, bóng bàn, bóng rổ, bóng chuyền và chạy bộ.',
          },
        },
        {
          '@type': 'Question',
          name: 'CoDuyen có miễn phí không?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'CoDuyen miễn phí hoàn toàn cho các tính năng cơ bản. Gói Premium cung cấp thêm bộ lọc nâng cao, xem ai đã ghé thăm hồ sơ và thống kê chuyên sâu.',
          },
        },
      ],
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <div className="mx-auto max-w-md min-h-screen shadow-lg bg-gray-50 relative">
          {children}
        </div>
      </body>
    </html>
  )
}
