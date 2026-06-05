'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, Star, Phone, Search, Car, Droplets, Lightbulb, Waves, Clock, ChevronRight, CalendarDays, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCourts, Court } from '@/lib/court-api'
import { clsx } from 'clsx'

const SPORT_FILTERS = [
  { v: '', l: 'Tất cả', i: '🏟️' },
  { v: 'BADMINTON', l: 'Cầu lông', i: '🏸' },
  { v: 'FOOTBALL', l: 'Bóng đá', i: '⚽' },
  { v: 'BASKETBALL', l: 'Bóng rổ', i: '🏀' },
  { v: 'TENNIS', l: 'Tennis', i: '🎾' },
  { v: 'VOLLEYBALL', l: 'Bóng chuyền', i: '🏐' },
]

const SPORT_EMOJI: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', BASKETBALL: '🏀', TENNIS: '🎾', VOLLEYBALL: '🏐',
}

const AMENITY_INFO: Record<string, { icon: React.ReactNode; label: string }> = {
  parking:  { icon: <Car size={10} />,       label: 'Bãi xe' },
  shower:   { icon: <Droplets size={10} />,   label: 'Phòng tắm' },
  lighting: { icon: <Lightbulb size={10} />,  label: 'Đèn' },
  water:    { icon: <Waves size={10} />,       label: 'Nước' },
}

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ' }

export default function CourtsPage() {
  const router = useRouter()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [sport, setSport] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    getCourts(sport || undefined)
      .then(d => setCourts(d.courts || []))
      .catch(() => setCourts([]))
      .finally(() => setLoading(false))
  }, [sport])

  const filtered = useMemo(() => {
    if (!search.trim()) return courts
    const q = search.toLowerCase()
    return courts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    )
  }, [courts, search])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-base font-bold text-gray-900">🏟️ Đặt sân</h1>
          <Link
            href="/courts/my-bookings"
            className="flex items-center gap-1.5 rounded-xl bg-green-50 border border-green-200 px-3 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-100"
          >
            <CalendarDays size={12} /> Lịch của tôi
          </Link>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm sân theo tên, địa chỉ..."
            className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')}><X size={13} className="text-gray-400" /></button>
          )}
        </div>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide bg-white border-b">
        {SPORT_FILTERS.map(s => (
          <button
            key={s.v}
            onClick={() => setSport(s.v)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium border whitespace-nowrap transition-all',
              sport === s.v
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
            )}
          >
            {s.i} {s.l}
          </button>
        ))}
      </div>

      {/* Count */}
      {!loading && (
        <div className="px-4 py-2">
          <p className="text-[11px] text-gray-500">
            {filtered.length} sân{search && <span className="text-green-600"> · "{search}"</span>}
          </p>
        </div>
      )}

      {/* Court list */}
      <div className="px-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white shadow-sm overflow-hidden animate-pulse">
              <div className="h-36 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-400">
            <span className="text-4xl mb-3">🏟️</span>
            <p className="text-sm font-medium">Không tìm thấy sân nào</p>
          </div>
        ) : (
          filtered.map(court => (
            <CourtCard key={court.id} court={court} onClick={() => router.push(`/courts/${court.id}`)} />
          ))
        )}
      </div>
    </div>
  )
}

function CourtCard({ court, onClick }: { court: Court; onClick: () => void }) {
  const coverImg = court.images?.[0]
  const [imgError, setImgError] = useState(false)

  return (
    <div
      onClick={onClick}
      className="rounded-2xl bg-white shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
    >
      {/* Cover image */}
      <div className="relative h-40 bg-gradient-to-br from-green-100 to-emerald-50 overflow-hidden">
        {coverImg && !imgError ? (
          <img
            src={coverImg}
            alt={court.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl opacity-30">{SPORT_EMOJI[court.sport_type] || '🏟️'}</span>
          </div>
        )}
        {/* Price badge */}
        <div className="absolute bottom-2 right-2 rounded-xl bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-bold text-white">
          {fmt(court.price_per_hour)}<span className="font-normal opacity-80">/giờ</span>
        </div>
        {/* Sport badge */}
        <div className="absolute top-2 left-2 rounded-lg bg-white/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-gray-700">
          {SPORT_EMOJI[court.sport_type]} {court.sport_type === 'BADMINTON' ? 'Cầu lông' : court.sport_type === 'FOOTBALL' ? 'Bóng đá' : court.sport_type === 'BASKETBALL' ? 'Bóng rổ' : court.sport_type}
        </div>
        {/* Multiple courts badge */}
        {court.total_courts > 1 && (
          <div className="absolute top-2 right-2 rounded-lg bg-green-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            {court.total_courts} sân
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-gray-900 flex-1">{court.name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-gray-700">{court.rating_avg.toFixed(1)}</span>
            <span className="text-[10px] text-gray-400">({court.rating_count})</span>
          </div>
        </div>

        <p className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
          <MapPin size={10} className="shrink-0" />
          <span className="truncate">{court.address}</span>
        </p>

        <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
          <Clock size={10} />
          <span>{court.operating_hours_start?.slice(0, 5)} – {court.operating_hours_end?.slice(0, 5)}</span>
          {court.phone_number && (
            <>
              <span className="text-gray-300">·</span>
              <Phone size={10} />
              <span>{court.phone_number}</span>
            </>
          )}
        </div>

        {/* Amenities */}
        {court.amenities?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {court.amenities.slice(0, 4).map(a => {
              const info = AMENITY_INFO[a]
              return info ? (
                <span key={a} className="flex items-center gap-0.5 rounded-md bg-gray-50 border border-gray-100 px-1.5 py-0.5 text-[9px] text-gray-600">
                  {info.icon} {info.label}
                </span>
              ) : null
            })}
          </div>
        )}

        <button
          onClick={onClick}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-xs font-bold text-white hover:bg-green-600 transition-colors active:scale-[0.98]"
        >
          Xem và đặt sân <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
