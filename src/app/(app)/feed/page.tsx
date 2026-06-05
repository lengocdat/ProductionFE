'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Clock, Users, CheckCircle, AlertTriangle, Loader2, ShieldAlert, UserCheck, ArrowUpDown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import JoinModal from '@/components/JoinModal'
import WeeklyCalendarStrip from '@/components/WeeklyCalendarStrip'
import { clsx } from 'clsx'

// --- Types ---
interface Host {
  id: number
  username: string
  tier: string
  negative_reports: number
  is_verified: boolean
}

interface SportMatch {
  id: number
  host_id: number
  title: string
  sport_type: string
  skill_level?: string
  address: string
  latitude: number
  longitude: number
  match_date: string
  start_time: string
  end_time: string
  max_slots: number
  filled_slots: number
  status: string
  distance?: number
  is_friend_host?: boolean
  host?: Host
}

// --- Constants ---
const SPORTS = [
  { value: 'BADMINTON', label: 'Cầu lông', icon: '🏸' },
  { value: 'RUNNING', label: 'Chạy bộ', icon: '🏃' },
  { value: 'PICKLEBALL', label: 'Pickleball', icon: '🏓' },
  { value: 'FOOTBALL', label: 'Bóng đá', icon: '⚽' },
  { value: 'TENNIS', label: 'Tennis', icon: '🎾' },
  { value: 'TABLE_TENNIS', label: 'Bóng bàn', icon: '🏓' },
  { value: 'BASKETBALL', label: 'Bóng rổ', icon: '🏀' },
  { value: 'VOLLEYBALL', label: 'Bóng chuyền', icon: '🏐' },
]

const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Yếu', color: 'bg-gray-100 text-gray-600 border-gray-200', desc: 'Mới chơi 0-6 tháng' },
  { value: 'LOWER_INTERMEDIATE', label: 'TB-', color: 'bg-teal-50 text-teal-700 border-teal-200', desc: 'Chơi 6-12 tháng, cơ bản' },
  { value: 'INTERMEDIATE', label: 'TB', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Chơi 1-2 năm, giao lưu OK' },
  { value: 'UPPER_INTERMEDIATE', label: 'TB+', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', desc: '2-3 năm, có kỹ thuật' },
  { value: 'ADVANCED', label: 'Khá', color: 'bg-orange-50 text-orange-700 border-orange-200', desc: '3-5 năm, thi đấu CLB' },
  { value: 'SEMI_PRO', label: 'Bán chuyên', color: 'bg-red-50 text-red-700 border-red-200', desc: '5+ năm, giải tỉnh/thành' },
]

const SKILL_BADGE_STYLES: Record<string, string> = {
  'BEGINNER': 'bg-green-50 text-green-700',
  'LOWER_INTERMEDIATE': 'bg-teal-50 text-teal-700',
  'INTERMEDIATE': 'bg-blue-50 text-blue-700',
  'UPPER_INTERMEDIATE': 'bg-indigo-50 text-indigo-700',
  'ADVANCED': 'bg-orange-50 text-orange-700',
  'SEMI_PRO': 'bg-red-50 text-red-700',
}

// Smart label: shows skill for racket sports, intensity for team sports
const SKILL_LABEL: Record<string, string> = {
  'BEGINNER': 'Vui vẻ',
  'LOWER_INTERMEDIATE': 'TB Yếu',
  'INTERMEDIATE': 'Nghiêm túc',
  'UPPER_INTERMEDIATE': 'TB+',
  'ADVANCED': 'Thi đấu',
  'SEMI_PRO': 'Bán chuyên',
}

// Detailed label for racket sports (shown on cards when sport is skill-based)
const SKILL_LABEL_RACKET: Record<string, string> = {
  'BEGINNER': 'Yếu',
  'LOWER_INTERMEDIATE': 'TB Yếu',
  'INTERMEDIATE': 'Trung bình',
  'UPPER_INTERMEDIATE': 'TB+',
  'ADVANCED': 'Khá',
  'SEMI_PRO': 'Bán chuyên',
}

// Intensity labels for team sports
const INTENSITY_LABEL: Record<string, string> = {
  'BEGINNER': '😊 Vui vẻ',
  'INTERMEDIATE': '💪 Nghiêm túc',
  'ADVANCED': '🔥 Thi đấu',
}

const SKILL_DESC: Record<string, string> = {
  'BEGINNER': 'Giao lưu nhẹ nhàng / Mới chơi',
  'LOWER_INTERMEDIATE': 'Chơi 6-12 tháng, biết cơ bản',
  'INTERMEDIATE': 'Chơi có chiến thuật / 1-2 năm',
  'UPPER_INTERMEDIATE': '2-3 năm, có kỹ thuật tốt',
  'ADVANCED': 'Cạnh tranh cao / 3-5 năm, thi đấu CLB',
  'SEMI_PRO': '5+ năm, thi đấu giải tỉnh/thành',
}

const SPORT_ICON: Record<string, string> = {
  'BADMINTON': '🏸', 'FOOTBALL': '⚽', 'BASKETBALL': '🏀',
  'VOLLEYBALL': '🏐', 'TABLE_TENNIS': '🏓', 'TENNIS': '🎾',
  'RUNNING': '🏃', 'PICKLEBALL': '🏓',
}

// Sports that use skill-level filter (racket/individual sports)
const SKILL_BASED_SPORTS = ['BADMINTON', 'TABLE_TENNIS', 'TENNIS', 'PICKLEBALL']

// Sports that use intensity filter (team sports / cardio)
const INTENSITY_LEVELS = [
  { value: 'BEGINNER', label: '😊 Vui vẻ', color: 'bg-green-50 text-green-700 border-green-200', desc: 'Giao lưu nhẹ nhàng, ai cũng chơi được' },
  { value: 'INTERMEDIATE', label: '💪 Nghiêm túc', color: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Chơi đàng hoàng, có chiến thuật' },
  { value: 'ADVANCED', label: '🔥 Thi đấu', color: 'bg-red-50 text-red-700 border-red-200', desc: 'Cạnh tranh cao, cần có kinh nghiệm' },
]

const FALLBACK_COORDS = { lat: 10.762622, lng: 106.660172 }

// Skill ranking for mismatch detection
const SKILL_RANK: Record<string, number> = { 'BEGINNER': 1, 'LOWER_INTERMEDIATE': 2, 'INTERMEDIATE': 3, 'UPPER_INTERMEDIATE': 4, 'ADVANCED': 5, 'SEMI_PRO': 6 }

export default function FeedPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<'loading' | 'granted' | 'denied'>('loading')
  const [dateFilter, setDateFilter] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [sportFilter, setSportFilter] = useState('BADMINTON')
  const [skillFilters, setSkillFilters] = useState<string[]>([]) // multi-select
  const [sortBy, setSortBy] = useState<'distance' | 'time' | 'price' | 'slots'>('distance')
  const [matches, setMatches] = useState<SportMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<SportMatch | null>(null)
  const [mismatchWarning, setMismatchWarning] = useState<SportMatch | null>(null)

  // Mock user skill level (in real app, fetch from /auth/me profile)
  const [userSkill] = useState('INTERMEDIATE')

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(FALLBACK_COORDS)
      setGeoStatus('denied')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus('granted') },
      () => { setCoords(FALLBACK_COORDS); setGeoStatus('denied') },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const getDateString = useCallback((filter: string) => {
    return filter
  }, [])

  // Fetch matches
  useEffect(() => {
    if (!coords) return
    setLoading(true)
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      date: getDateString(dateFilter),
      sport: sportFilter,
    })
    apiFetch<{ matches: SportMatch[] }>(`/matches?${params}`)
      .then((data) => setMatches(data.matches || []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [coords, dateFilter, sportFilter, getDateString])

  // Client-side skill filter + sort
  const filteredMatches = useMemo(() => {
    let result = skillFilters.length === 0
      ? [...matches]
      : matches.filter((m) => skillFilters.includes(m.skill_level || 'INTERMEDIATE'))

    result.sort((a, b) => {
      // Friends always first
      if (a.is_friend_host && !b.is_friend_host) return -1
      if (!a.is_friend_host && b.is_friend_host) return 1

      switch (sortBy) {
        case 'time':
          return (a.start_time || '').localeCompare(b.start_time || '')
        case 'price': {
          const pa = (a as any).price_per_slot ?? 0
          const pb = (b as any).price_per_slot ?? 0
          return pa - pb
        }
        case 'slots': {
          const sa = a.max_slots - a.filled_slots
          const sb = b.max_slots - b.filled_slots
          return sb - sa
        }
        default: // distance
          return (a.distance ?? 99) - (b.distance ?? 99)
      }
    })
    return result
  }, [matches, skillFilters, sortBy])

  // Handle join with skill mismatch check
  function handleJoinClick(match: SportMatch) {
    const matchSkill = match.skill_level || 'INTERMEDIATE'
    const userRank = SKILL_RANK[userSkill] || 2
    const matchRank = SKILL_RANK[matchSkill] || 2

    // Show warning if skill gap >= 2 levels
    if (Math.abs(userRank - matchRank) >= 2) {
      setMismatchWarning(match)
    } else {
      setSelectedMatch(match)
    }
  }

  function confirmMismatchJoin() {
    if (mismatchWarning) {
      setSelectedMatch(mismatchWarning)
      setMismatchWarning(null)
    }
  }

  function toggleSkillFilter(skill: string) {
    setSkillFilters((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Geo Status */}
      {geoStatus === 'loading' && (
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 mb-3">
          <Loader2 size={14} className="text-blue-500 animate-spin" />
          <span className="text-xs text-blue-700">Đang xác định vị trí của bạn...</span>
        </div>
      )}
      {geoStatus === 'denied' && (
        <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 mb-3">
          <MapPin size={14} className="text-orange-500" />
          <span className="text-xs text-orange-700">Không thể truy cập GPS. Đang dùng vị trí mặc định. Bật quyền định vị để tìm chính xác hơn.</span>
        </div>
      )}

      {/* Sticky Filter Bar */}
      <div className="sticky top-[57px] z-20 bg-gray-50 pb-3 -mx-4 px-4 pt-1 space-y-3">
        {/* Calendar Strip (30 ngày tới) */}
        <WeeklyCalendarStrip
          days={30}
          selectedDate={dateFilter}
          onSelectDate={setDateFilter}
        />

        {/* Sport Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SPORTS.map((sport) => (
            <button
              key={sport.value}
              onClick={() => { setSportFilter(sport.value); setSkillFilters([]) }}
              className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                sportFilter === sport.value
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <span>{sport.icon}</span> {sport.label}
            </button>
          ))}
        </div>

        {/* Context-aware Level Filter */}
        <div>
          {SKILL_BASED_SPORTS.includes(sportFilter) ? (
            <>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Lọc trình độ</p>
              <div className="flex gap-1.5 flex-wrap">
                {SKILL_LEVELS.map((sk) => (
                  <button
                    key={sk.value}
                    onClick={() => toggleSkillFilter(sk.value)}
                    title={sk.desc}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                      skillFilters.includes(sk.value)
                        ? sk.color + ' border-current shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {sk.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1.5">Cường độ</p>
              <div className="flex gap-1.5 flex-wrap">
                {INTENSITY_LEVELS.map((lv) => (
                  <button
                    key={lv.value}
                    onClick={() => toggleSkillFilter(lv.value)}
                    title={lv.desc}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                      skillFilters.includes(lv.value)
                        ? lv.color + ' border-current shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {lv.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {skillFilters.length > 0 && (
            <button
              onClick={() => setSkillFilters([])}
              className="rounded-full px-2 py-1 text-[10px] text-gray-400 hover:text-gray-600"
            >
              ✕ Bỏ lọc
            </button>
          )}
        </div>

        {/* Sort bar */}
        <div className="flex items-center gap-2 pb-1">
          <ArrowUpDown size={12} className="text-gray-400 shrink-0" />
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {([
              { value: 'distance', label: 'Gần nhất' },
              { value: 'time',     label: 'Sớm nhất' },
              { value: 'price',    label: 'Giá thấp' },
              { value: 'slots',    label: 'Còn nhiều slot' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={clsx(
                  'flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all',
                  sortBy === opt.value
                    ? 'bg-green-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Match List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 size={28} className="text-green-500 animate-spin mb-2" />
          <p className="text-sm text-gray-400">Đang tìm trận gần bạn...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-2">{SPORT_ICON[sportFilter] || '🏸'}</p>
          <p className="text-base text-gray-500">Không có trận nào</p>
          <p className="text-xs text-gray-400 mt-1">Thử đổi bộ lọc hoặc tạo trận mới!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((m) => (
            <MatchCard key={m.id} match={m} onJoin={() => handleJoinClick(m)} />
          ))}
        </div>
      )}

      {/* Join Modal */}
      {selectedMatch && <JoinModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}

      {/* Skill Mismatch Warning Modal */}
      {mismatchWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={22} className="text-orange-500" />
              <h3 className="text-base font-bold text-gray-900">Cảnh báo trình độ</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              Trận này yêu cầu trình độ <strong className="text-orange-700">{
                SKILL_BASED_SPORTS.includes(mismatchWarning.sport_type)
                  ? SKILL_LABEL_RACKET[mismatchWarning.skill_level || 'INTERMEDIATE']
                  : (INTENSITY_LABEL[mismatchWarning.skill_level || 'INTERMEDIATE'] || SKILL_LABEL[mismatchWarning.skill_level || 'INTERMEDIATE'])
              }</strong>,
              trong khi trình độ hiện tại của bạn là <strong className="text-blue-700">{
                SKILL_BASED_SPORTS.includes(mismatchWarning.sport_type)
                  ? SKILL_LABEL_RACKET[userSkill]
                  : (INTENSITY_LABEL[userSkill] || SKILL_LABEL[userSkill])
              }</strong>.
              <br /><br />
              Bạn có chắc chắn muốn xin tham gia không?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setMismatchWarning(null)}
                className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmMismatchJoin}
                className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
              >
                Vẫn tham gia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- MatchCard Component ---
function MatchCard({ match, onJoin }: { match: SportMatch; onJoin: () => void }) {
  const slotsLeft = match.max_slots - match.filled_slots
  const slotPercent = (match.filled_slots / match.max_slots) * 100
  const isAlmostFull = slotsLeft <= 2
  const isFull = slotsLeft <= 0

  const dist = match.distance ?? 99
  const skillLevel = match.skill_level || 'INTERMEDIATE'
  const sportIcon = SPORT_ICON[match.sport_type] || '🏸'
  const price = (match as any).price_per_slot as number
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`

  const skillLabel = SKILL_BASED_SPORTS.includes(match.sport_type)
    ? (SKILL_LABEL_RACKET[skillLevel] || skillLevel)
    : (INTENSITY_LABEL[skillLevel] || SKILL_LABEL[skillLevel] || skillLevel)

  return (
    <div className={`rounded-2xl border bg-white shadow-sm active:scale-[0.99] transition-all ${
      match.is_friend_host ? 'border-green-200' : 'border-gray-100'
    }`}>
      {/* Friend host banner */}
      {match.is_friend_host && (
        <div className="flex items-center gap-1 px-4 pt-2.5 pb-0 text-[11px] font-semibold text-green-700">
          <UserCheck size={11} /> Bạn bè của bạn tổ chức
        </div>
      )}

      <div className="p-4">
        {/* Row 1: Sport icon + Title + Distance */}
        <div className="flex items-start gap-2.5">
          <span className="text-2xl leading-none mt-0.5 shrink-0">{sportIcon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug">{match.title}</h3>
          </div>
          <span className={`shrink-0 text-xs font-semibold rounded-lg px-2 py-0.5 ${
            dist < 2 ? 'bg-green-50 text-green-700' :
            dist < 5 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {dist < 99 ? `${dist.toFixed(1)} km` : '—'}
          </span>
        </div>

        {/* Row 2: Time (primary info) + Skill badge */}
        <div className="flex items-center gap-2 mt-2">
          <Clock size={13} className="text-gray-400 shrink-0" />
          <span className="text-sm font-bold text-gray-900">
            {match.start_time.slice(0, 5)} – {match.end_time.slice(0, 5)}
          </span>
          <span className={`ml-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${SKILL_BADGE_STYLES[skillLevel]}`}
            title={SKILL_DESC[skillLevel] || ''}>
            {skillLabel}
          </span>
        </div>

        {/* Row 3: Address */}
        <div className="flex items-start gap-1.5 mt-1.5">
          <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
          <span className="text-[12px] text-gray-600 leading-snug line-clamp-1">{match.address}</span>
        </div>
        {(match as any).court_name && (
          <p className="text-[11px] text-blue-600 mt-0.5 ml-[18px] truncate">
            🏟️ {(match as any).court_name}{(match as any).court_number ? ` · Sân ${(match as any).court_number}` : ''}
          </p>
        )}

        {/* Row 4: Price + Slots — the two main decision drivers */}
        <div className="flex items-end justify-between mt-3.5">
          <div>
            {price > 0
              ? <>
                  <span className="text-[17px] font-extrabold text-green-600 leading-none">
                    {price.toLocaleString('vi-VN')}đ
                  </span>
                  <span className="text-[11px] text-gray-400 ml-0.5">/người</span>
                </>
              : <span className="text-[17px] font-extrabold text-emerald-500 leading-none">Miễn phí</span>
            }
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className={isAlmostFull ? 'text-red-500' : 'text-gray-400'} />
            <span className={`text-sm font-bold ${isAlmostFull ? 'text-red-600' : 'text-gray-700'}`}>
              {isFull
                ? 'Đủ người'
                : isAlmostFull
                  ? `⚡ Còn ${slotsLeft} slot`
                  : `Còn ${slotsLeft}/${match.max_slots}`}
            </span>
          </div>
        </div>

        {/* Slot progress bar */}
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden mt-1.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-gray-400' : isAlmostFull ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${slotPercent}%` }}
          />
        </div>

        {/* Host row — secondary info, clean and minimal */}
        {match.host && (
          <Link href={`/users/${match.host_id}`} className="flex items-center gap-1.5 mt-2.5 w-fit">
            <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600 shrink-0">
              {match.host.username.charAt(0).toUpperCase()}
            </div>
            <span className="text-[11px] text-gray-500">{match.host.username}</span>
            {match.host.tier === 'VERIFIED_HOST' && (
              <CheckCircle size={12} className="text-blue-500" />
            )}
            {match.host.negative_reports > 3 && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-red-500">
                <AlertTriangle size={10} /> Uy tín thấp
              </span>
            )}
          </Link>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            <MapPin size={12} /> Bản đồ
          </a>
          {!isFull ? (
            <button
              onClick={onJoin}
              className="flex-1 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98] transition-all shadow-sm shadow-green-200"
            >
              Tham gia ngay
            </button>
          ) : (
            <div className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-400 text-center cursor-not-allowed">
              Đã đủ người
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
