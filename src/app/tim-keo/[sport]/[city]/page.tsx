import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Users } from 'lucide-react'
import {
  SPORT_MAP, CITY_MAP, SPORT_CONTENT, CITY_CONTENT,
  fetchPublicMatches, buildFaqJsonLd, type SeoMatch,
} from '@/lib/seo-sports'

export async function generateMetadata(
  { params }: { params: { sport: string; city: string } }
): Promise<Metadata> {
  const sportInfo = SPORT_MAP[params.sport]
  const cityName = CITY_MAP[params.city]
  if (!sportInfo || !cityName) return { title: 'CoDuyen' }

  const title = `Tìm người chơi ${sportInfo.label} tại ${cityName} — Ghép trận theo trình độ | CoDuyen`
  const description = `Tìm ${sportInfo.partner} tại ${cityName} miễn phí. Xem các trận đang tuyển người, lọc theo trình độ, tham gia ngay hôm nay trên CoDuyen.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://coduyen.net/tim-keo/${params.sport}/${params.city}`,
      siteName: 'CoDuyen',
      images: [{ url: 'https://coduyen.net/og-match.png', width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://coduyen.net/tim-keo/${params.sport}/${params.city}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(SPORT_MAP).flatMap(sport =>
    Object.keys(CITY_MAP).map(city => ({ sport, city }))
  )
}

export default async function SEOMatchPage(
  { params }: { params: { sport: string; city: string } }
) {
  const sportInfo = SPORT_MAP[params.sport]
  const cityName = CITY_MAP[params.city]

  if (!sportInfo || !cityName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Không tìm thấy trang</p>
      </div>
    )
  }

  const matches: SeoMatch[] = await fetchPublicMatches(sportInfo.type, cityName)
  const sportContent = SPORT_CONTENT[params.sport]
  const cityContent = CITY_CONTENT[params.city]
  const faqJsonLd = buildFaqJsonLd(sportInfo.label, cityName, sportInfo.partner, `https://coduyen.net/tim-keo/${params.sport}/${params.city}`)

  const relatedSports = Object.entries(SPORT_MAP)
    .filter(([slug]) => slug !== params.sport)
    .slice(0, 4)

  const relatedCities = Object.entries(CITY_MAP)
    .filter(([slug]) => slug !== params.city)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-4 pt-10 pb-8 text-white">
        <p className="text-green-200 text-xs font-semibold mb-1 uppercase tracking-wider">CoDuyen · {cityName}</p>
        <h1 className="text-2xl font-black leading-tight mb-1">
          {sportInfo.emoji} Tìm người chơi {sportInfo.label}<br />tại {cityName}
        </h1>
        <p className="text-green-200 text-sm mb-0.5 font-medium">Ghép trận theo trình độ · Tham gia miễn phí</p>
        <p className="text-green-100 text-sm">
          {matches.length > 0
            ? `Đang có ${matches.length} trận mở — tham gia ngay!`
            : 'Chưa có trận nào — hãy là người đầu tiên tạo kèo!'}
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-green-700 font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg"
          >
            Tham gia miễn phí →
          </Link>
          <Link
            href={`/tim-ban-choi/${params.sport}/${params.city}`}
            className="inline-flex items-center gap-2 bg-green-500/40 border border-white/30 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl"
          >
            Tìm bạn chơi thường xuyên
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Match list */}
        {matches.length > 0 ? (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              Trận đang tuyển người tại {cityName}
            </h2>
            {matches.map((m: SeoMatch) => (
              <Link key={m.id} href={`/m/${m.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-semibold text-gray-800 text-sm leading-snug mb-2">{m.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={11} />{m.address}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{m.match_date} · {m.start_time?.slice(0, 5)}</span>
                  <span className="flex items-center gap-1"><Users size={11} />Còn {m.max_slots - m.filled_slots}/{m.max_slots} chỗ</span>
                </div>
                {m.price_per_slot > 0 && (
                  <p className="text-xs text-green-600 font-semibold mt-1.5">
                    {m.price_per_slot.toLocaleString('vi-VN')}đ/người
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 mb-8">
            <p className="text-4xl mb-2">{sportInfo.emoji}</p>
            <p className="text-gray-500 text-sm">Chưa có trận {sportInfo.label} nào tại {cityName}</p>
            <p className="text-gray-400 text-xs mt-1">Đăng ký và tạo trận đầu tiên!</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-8 text-center">
          <p className="font-bold text-gray-800 mb-1">Tìm {sportInfo.partner} tại {cityName}?</p>
          <p className="text-xs text-gray-500 mb-4">Đăng ký miễn phí · Ghép trận theo trình độ · Tham gia trong 60 giây</p>
          <Link href="/register"
            className="inline-block bg-green-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md shadow-green-200">
            Đăng ký ngay
          </Link>
        </div>

        {/* Static content */}
        {sportContent && (
          <div className="mb-8 space-y-4">
            <h2 className="text-base font-bold text-gray-800">
              {sportInfo.emoji} {sportInfo.label} tại {cityName}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{sportContent.intro}</p>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-1">💡 Mẹo tìm trận</p>
              <p className="text-sm text-blue-800 leading-relaxed">{sportContent.tips}</p>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{sportContent.community}</p>
            {cityContent && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 mb-2">Thể thao tại {cityName}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{cityContent}</p>
              </div>
            )}
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

        {/* Related cities */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">{sportInfo.label} ở thành phố khác</p>
          <div className="flex flex-wrap gap-2">
            {relatedCities.map(([slug, name]) => (
              <Link key={slug} href={`/tim-keo/${params.sport}/${slug}`}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-green-300 hover:text-green-700 transition-colors">
                {sportInfo.emoji} {name}
              </Link>
            ))}
          </div>
        </div>

        {/* Related sports */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Môn khác tại {cityName}</p>
          <div className="flex flex-wrap gap-2">
            {relatedSports.map(([slug, info]) => (
              <Link key={slug} href={`/tim-keo/${slug}/${params.city}`}
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
