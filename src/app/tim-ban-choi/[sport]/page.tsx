import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Users } from 'lucide-react'
import {
  SPORT_MAP, CITY_MAP, SPORT_CONTENT,
  fetchPublicMatches, type SeoMatch,
} from '@/lib/seo-sports'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coduyen.net/api'

async function fetchAllMatches(sportType: string): Promise<SeoMatch[]> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/public/matches?sport=${encodeURIComponent(sportType)}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.matches || []
  } catch {
    return []
  }
}

export async function generateMetadata(
  { params }: { params: { sport: string } }
): Promise<Metadata> {
  const sportInfo = SPORT_MAP[params.sport]
  if (!sportInfo) return { title: 'CoDuyen' }

  const title = `Tìm bạn chơi ${sportInfo.label} tại Việt Nam — Ghép trận miễn phí | CoDuyen`
  const description = `Tìm ${sportInfo.partner} tại TP.HCM, Hà Nội, Đà Nẵng và 7 thành phố khác. Ghép trận theo trình độ, kết nối cộng đồng ${sportInfo.label} Việt Nam miễn phí trên CoDuyen.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://coduyen.net/tim-ban-choi/${params.sport}`,
      siteName: 'CoDuyen',
      images: [{ url: 'https://coduyen.net/og-match.png', width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://coduyen.net/tim-ban-choi/${params.sport}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(SPORT_MAP).map(sport => ({ sport }))
}

export default async function FindPartnerSportPage(
  { params }: { params: { sport: string } }
) {
  const sportInfo = SPORT_MAP[params.sport]
  if (!sportInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Không tìm thấy trang</p>
      </div>
    )
  }

  const matches: SeoMatch[] = await fetchAllMatches(sportInfo.type)
  const sportContent = SPORT_CONTENT[params.sport]

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Tìm bạn chơi ${sportInfo.label} ở đâu tại Việt Nam?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CoDuyen là nền tảng tìm ${sportInfo.partner} theo vị trí GPS tại 10 thành phố lớn Việt Nam gồm TP.HCM, Hà Nội, Đà Nẵng, Cần Thơ và nhiều tỉnh thành khác. Đăng ký miễn phí và tìm trận phù hợp với trình độ của bạn.`,
        },
      },
      {
        '@type': 'Question',
        name: `App tìm ${sportInfo.partner} nào tốt nhất hiện nay?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CoDuyen là ứng dụng web chuyên tìm ${sportInfo.partner} theo vị trí và trình độ. Không cần tải về, hỗ trợ 8 môn thể thao tại 10 thành phố. Ghép trận, nhắn tin nhóm và đánh giá uy tín host — tất cả miễn phí.`,
        },
      },
      {
        '@type': 'Question',
        name: `Người mới bắt đầu chơi ${sportInfo.label} có dùng được CoDuyen không?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Hoàn toàn có thể. CoDuyen phân loại trận theo trình độ từ Yếu đến Bán chuyên. Người mới hãy chọn trận tag "Yếu" hoặc "Vui vẻ" — các host thường rất chào đón người học mới và tạo không khí thân thiện.`,
        },
      },
    ],
  }

  const cities = Object.entries(CITY_MAP)

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 to-teal-700 px-4 pt-10 pb-8 text-white">
        <p className="text-green-200 text-xs font-semibold mb-1 uppercase tracking-wider">CoDuyen · Toàn quốc</p>
        <h1 className="text-2xl font-black leading-tight mb-1">
          {sportInfo.emoji} Tìm bạn chơi {sportInfo.label}<br />tại Việt Nam
        </h1>
        <p className="text-green-200 text-sm mb-3 font-medium">
          {matches.length > 0 ? `${matches.length} buổi chơi đang mở · 10 thành phố` : '10 thành phố · Miễn phí'}
        </p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-white text-green-700 font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg"
        >
          Tham gia cộng đồng →
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* City grid — the main keyword capture */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-gray-700 mb-3">
            Tìm {sportInfo.partner} theo thành phố
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {cities.map(([slug, name]) => (
              <Link
                key={slug}
                href={`/tim-ban-choi/${params.sport}/${slug}`}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 hover:border-green-300 hover:shadow-sm transition-all group"
              >
                <p className="text-sm font-bold text-gray-800 group-hover:text-green-700">{sportInfo.emoji} {name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Tìm bạn chơi {sportInfo.label}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent national matches */}
        {matches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              Buổi chơi đang mở toàn quốc
            </h2>
            <div className="space-y-3">
              {matches.slice(0, 6).map((m: SeoMatch) => (
                <Link key={m.id} href={`/m/${m.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-semibold text-gray-800 text-sm leading-snug mb-2">{m.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={11} />{m.address}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{m.match_date} · {m.start_time?.slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><Users size={11} />Còn {m.max_slots - m.filled_slots} chỗ</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sport description */}
        {sportContent && (
          <div className="mb-8 space-y-4">
            <h2 className="text-base font-bold text-gray-800">
              Về cộng đồng {sportInfo.label} tại Việt Nam
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{sportContent.intro}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{sportContent.community}</p>
            <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-green-700 mb-1">💡 Mẹo cho người mới</p>
              <p className="text-sm text-green-800 leading-relaxed">{sportContent.tips}</p>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Câu hỏi thường gặp</h2>
          {faqJsonLd.mainEntity.map((item, i) => (
            <details key={i} className="bg-white rounded-2xl border border-gray-100 p-4 group">
              <summary className="text-sm font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center">
                {item.name}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-5 mb-8 text-center">
          <p className="font-bold text-gray-800 mb-1">Sẵn sàng tìm {sportInfo.partner}?</p>
          <p className="text-xs text-gray-500 mb-4">Hoàn toàn miễn phí · 10 thành phố · Không cần tải app</p>
          <Link href="/register"
            className="inline-block bg-green-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md shadow-green-200">
            Đăng ký ngay
          </Link>
        </div>

        {/* Related sports */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tìm bạn chơi môn khác</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SPORT_MAP).filter(([s]) => s !== params.sport).map(([slug, info]) => (
              <Link key={slug} href={`/tim-ban-choi/${slug}`}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-green-300 hover:text-green-700 transition-colors">
                {info.emoji} {info.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
