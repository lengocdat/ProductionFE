import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coduyen.net/api'

interface Match {
  id: number
  title: string
  sport_type: string
  skill_level: string
  address: string
  match_date: string
  start_time: string
  end_time: string
  max_slots: number
  filled_slots: number
  price_per_slot: number
  status: string
  latitude: number
  longitude: number
  host?: { username: string }
}

const SPORT_ICON: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', BASKETBALL: '🏀',
  VOLLEYBALL: '🏐', TABLE_TENNIS: '🏓', TENNIS: '🎾',
  RUNNING: '🏃', PICKLEBALL: '🏓',
}

const SPORT_LABEL: Record<string, string> = {
  BADMINTON: 'Cầu lông', FOOTBALL: 'Bóng đá', BASKETBALL: 'Bóng rổ',
  VOLLEYBALL: 'Bóng chuyền', TABLE_TENNIS: 'Bóng bàn', TENNIS: 'Tennis',
  RUNNING: 'Chạy bộ', PICKLEBALL: 'Pickleball',
}

const SKILL_LABEL: Record<string, string> = {
  BEGINNER: 'Yếu', LOWER_INTERMEDIATE: 'TB-', INTERMEDIATE: 'Trung bình',
  UPPER_INTERMEDIATE: 'TB+', ADVANCED: 'Khá', SEMI_PRO: 'Bán chuyên',
}

async function getMatch(id: string): Promise<Match | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/public/matches/${id}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.match
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const match = await getMatch(params.id)
  if (!match) {
    return { title: 'Trận đấu | CoDuyen' }
  }

  const sport = SPORT_LABEL[match.sport_type] || match.sport_type
  const icon = SPORT_ICON[match.sport_type] || '🏅'
  const slots = match.max_slots - match.filled_slots
  const price = match.price_per_slot > 0
    ? `${match.price_per_slot.toLocaleString('vi-VN')}đ/người`
    : 'Miễn phí'

  const title = `${icon} ${match.title} | CoDuyen`
  const description = `${sport} · ${match.start_time.slice(0, 5)}–${match.end_time.slice(0, 5)} · ${match.address} · Còn ${slots} slot · ${price}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'CoDuyen — Tìm đối tác thể thao',
      images: [
        {
          url: `https://coduyen.net/og-match.png`,
          width: 1200,
          height: 630,
          alt: match.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function PublicMatchPage({ params }: { params: { id: string } }) {
  const match = await getMatch(params.id)

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-3">🏸</p>
        <h1 className="text-lg font-bold text-gray-800">Không tìm thấy trận</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">Trận đã bị hủy hoặc không tồn tại.</p>
        <Link href="/" className="rounded-xl bg-green-500 px-6 py-2.5 text-sm font-bold text-white">
          Tìm trận khác
        </Link>
      </div>
    )
  }

  const slotsLeft = match.max_slots - match.filled_slots
  const isFull = slotsLeft <= 0
  const isAlmostFull = slotsLeft <= 2
  const sport = SPORT_LABEL[match.sport_type] || match.sport_type
  const icon = SPORT_ICON[match.sport_type] || '🏅'
  const skill = SKILL_LABEL[match.skill_level] || match.skill_level
  const price = match.price_per_slot > 0
    ? `${match.price_per_slot.toLocaleString('vi-VN')}đ/người`
    : 'Miễn phí'
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`
  const loginUrl = `/login?redirect=/matches/${match.id}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <span className="text-base font-bold text-green-600">CoDuyen</span>
        <Link href={loginUrl} className="text-xs font-medium text-gray-500 hover:text-gray-800">
          Đăng nhập
        </Link>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Match card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Sport header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-3xl">{icon}</span>
              <span className="text-white/80 text-sm font-medium">{sport}</span>
            </div>
            <h1 className="text-white text-xl font-bold leading-snug">{match.title}</h1>
            {skill && (
              <span className="mt-1 inline-block bg-white/20 text-white text-[11px] font-medium rounded-full px-2.5 py-0.5">
                Trình độ: {skill}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <Clock size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {match.start_time.slice(0, 5)} – {match.end_time.slice(0, 5)}
                </p>
                <p className="text-xs text-gray-500">{match.match_date}</p>
              </div>
            </div>

            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2.5 hover:opacity-80">
              <MapPin size={16} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 leading-snug">{match.address}</p>
            </a>

            <div className="flex items-center gap-2.5">
              <Users size={16} className={isAlmostFull ? 'text-red-400 shrink-0' : 'text-gray-400 shrink-0'} />
              <div>
                <p className={`text-sm font-bold ${isAlmostFull ? 'text-red-600' : 'text-gray-900'}`}>
                  {isFull ? 'Đã đủ người' : `Còn ${slotsLeft}/${match.max_slots} slot`}
                </p>
                {isAlmostFull && !isFull && (
                  <p className="text-[11px] text-red-500 animate-pulse">⚡ Sắp đầy — tham gia ngay!</p>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">Phí tham gia</span>
              <span className="text-xl font-extrabold text-green-600">{price}</span>
            </div>

            {/* Host */}
            {match.host && (
              <p className="text-xs text-gray-500">
                Tổ chức bởi <span className="font-semibold text-gray-700">{match.host.username}</span>
              </p>
            )}
          </div>
        </div>

        {/* CTA */}
        {!isFull ? (
          <Link
            href={loginUrl}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-green-500 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 active:scale-[0.98] transition-all"
          >
            Tham gia ngay <ChevronRight size={18} />
          </Link>
        ) : (
          <div className="w-full rounded-2xl bg-gray-200 py-4 text-base font-semibold text-gray-500 text-center">
            Trận đã đủ người
          </div>
        )}

        <Link
          href="/register"
          className="block text-center text-sm text-gray-500 hover:text-green-600"
        >
          Chưa có tài khoản? <span className="font-semibold text-green-600">Đăng ký miễn phí</span>
        </Link>

        {/* App promo */}
        <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
          <p className="text-sm font-bold text-green-800 mb-1">🏆 CoDuyen — Tìm đối tác thể thao</p>
          <p className="text-xs text-green-700 mb-3">Cầu lông · Bóng đá · Tennis · Pickleball và nhiều môn khác</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 rounded-xl bg-green-500 px-5 py-2 text-sm font-bold text-white hover:bg-green-600"
          >
            Tải ứng dụng miễn phí
          </Link>
        </div>
      </div>
    </div>
  )
}
