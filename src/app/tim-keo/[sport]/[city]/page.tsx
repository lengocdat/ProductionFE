import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Users } from 'lucide-react'

// --- Slug mappings ---
const SPORT_MAP: Record<string, { type: string; label: string; emoji: string }> = {
  'cau-long':    { type: 'BADMINTON',    label: 'Cầu lông',    emoji: '🏸' },
  'bong-da':     { type: 'FOOTBALL',     label: 'Bóng đá',     emoji: '⚽' },
  'tennis':      { type: 'TENNIS',       label: 'Tennis',      emoji: '🎾' },
  'pickleball':  { type: 'PICKLEBALL',   label: 'Pickleball',  emoji: '🏓' },
  'bong-ro':     { type: 'BASKETBALL',   label: 'Bóng rổ',     emoji: '🏀' },
  'bong-chuyen': { type: 'VOLLEYBALL',   label: 'Bóng chuyền', emoji: '🏐' },
  'bong-ban':    { type: 'TABLE_TENNIS', label: 'Bóng bàn',    emoji: '🏓' },
  'chay-bo':     { type: 'RUNNING',      label: 'Chạy bộ',     emoji: '🏃' },
}

const CITY_MAP: Record<string, string> = {
  'ho-chi-minh': 'Hồ Chí Minh',
  'ha-noi':      'Hà Nội',
  'da-nang':     'Đà Nẵng',
  'can-tho':     'Cần Thơ',
  'binh-duong':  'Bình Dương',
  'dong-nai':    'Đồng Nai',
  'hai-phong':   'Hải Phòng',
  'nha-trang':   'Nha Trang',
  'hue':         'Huế',
  'vung-tau':    'Vũng Tàu',
}

interface Match {
  id: number
  title: string
  address: string
  match_date: string
  start_time: string
  max_slots: number
  filled_slots: number
  price_per_slot: number
  status: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coduyen.net/api'

async function fetchMatches(sport: string, city: string): Promise<Match[]> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/public/matches?sport=${sport}&city=${encodeURIComponent(city)}`,
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
  { params }: { params: { sport: string; city: string } }
): Promise<Metadata> {
  const sportInfo = SPORT_MAP[params.sport]
  const cityName = CITY_MAP[params.city]
  if (!sportInfo || !cityName) return { title: 'CoDuyen' }

  const title = `Tìm kèo ${sportInfo.label} tại ${cityName} | CoDuyen`
  const description = `Khám phá các trận ${sportInfo.label} đang tuyển người tại ${cityName}. Tham gia ngay, chơi ngay hôm nay!`

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
  const sports = Object.keys(SPORT_MAP)
  const cities = Object.keys(CITY_MAP)
  return sports.flatMap(sport => cities.map(city => ({ sport, city })))
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

  const matches = await fetchMatches(sportInfo.type, cityName)

  // All other sport+city combos for internal links
  const relatedSports = Object.entries(SPORT_MAP)
    .filter(([slug]) => slug !== params.sport)
    .slice(0, 4)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 px-4 pt-10 pb-8 text-white">
        <p className="text-green-200 text-xs font-semibold mb-1 uppercase tracking-wider">CoDuyen</p>
        <h1 className="text-2xl font-black leading-tight mb-2">
          {sportInfo.emoji} Tìm kèo {sportInfo.label}<br />tại {cityName}
        </h1>
        <p className="text-green-100 text-sm">
          {matches.length > 0
            ? `Đang có ${matches.length} trận chờ người — tham gia ngay!`
            : 'Chưa có trận nào — hãy là người đầu tiên đăng kèo!'}
        </p>
        <Link
          href={`/register`}
          className="mt-4 inline-flex items-center gap-2 bg-white text-green-700 font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg"
        >
          Tham gia miễn phí →
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Match list */}
        {matches.length > 0 ? (
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              Trận đang tuyển người
            </h2>
            {matches.map(m => (
              <Link key={m.id} href={`/m/${m.id}`}
                className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-semibold text-gray-800 text-sm leading-snug mb-2">{m.title}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin size={11} />{m.address}</span>
                  <span className="flex items-center gap-1"><Clock size={11} />{m.match_date} · {m.start_time}</span>
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
            <p className="text-gray-500 text-sm">Chưa có kèo {sportInfo.label} nào tại {cityName}</p>
            <p className="text-gray-400 text-xs mt-1">Đăng ký và tạo trận đầu tiên!</p>
          </div>
        )}

        {/* CTA box */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-8 text-center">
          <p className="font-bold text-gray-800 mb-1">Bạn muốn tìm người chơi {sportInfo.label}?</p>
          <p className="text-xs text-gray-500 mb-4">Đăng ký miễn phí, tham gia trận trong 60 giây</p>
          <Link href="/register"
            className="inline-block bg-green-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-md shadow-green-200">
            Đăng ký ngay
          </Link>
        </div>

        {/* Internal links to other sports */}
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
