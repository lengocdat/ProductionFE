'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapPin, Clock, Users, CheckCircle, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import JoinModal from '@/components/JoinModal'
import WeeklyCalendarStrip from '@/components/WeeklyCalendarStrip'

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
  google_maps_url?: string
  match_date: string
  start_time: string
  end_time: string
  max_slots: number
  filled_slots: number
  status: string
  distance?: number
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

  // Client-side skill filter
  const filteredMatches = skillFilters.length === 0
    ? matches
    : matches.filter((m) => skillFilters.includes(m.skill_level || 'INTERMEDIATE'))

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
              Trận này yêu cầu trình độ <strong className="text-orange-700">{SKILL_LABEL[mismatchWarning.skill_level || 'INTERMEDIATE']}</strong>,
              trong khi trình độ hiện tại của bạn là <strong className="text-blue-700">{SKILL_LABEL[userSkill]}</strong>.
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
  const isAlmostFull = slotsLeft <= 1

  const dist = match.distance ?? 99
  const distColor = dist < 2 ? 'bg-green-50 text-green-700 border-green-200' :
    dist < 5 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-gray-50 text-gray-600 border-gray-200'

  const mapsUrl = match.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`
  const skillLevel = match.skill_level || 'INTERMEDIATE'
  const sportIcon = SPORT_ICON[match.sport_type] || '🏸'

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title with sport icon */}
          <div className="flex items-center gap-1.5">
            <span className="text-base">{sportIcon}</span>
            <h3 className="font-semibold text-gray-900 text-[15px] leading-snug truncate">{match.title}</h3>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{match.address}</p>
        </div>
        {/* Distance Tag */}
        <span className={`flex-shrink-0 rounded-lg border px-2 py-1 text-xs font-bold ${distColor}`}>
          {dist < 99 ? `${dist.toFixed(1)} km` : '—'}
        </span>
      </div>

      {/* Badges row: Time + Skill */}
      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Clock size={11} className="text-gray-400" />
          <span>{match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)}</span>
        </div>
        {/* Skill Badge */}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SKILL_BADGE_STYLES[skillLevel]}`}
          title={SKILL_DESC[skillLevel] || ''}
        >
          {SKILL_BASED_SPORTS.includes(match.sport_type)
            ? (SKILL_LABEL_RACKET[skillLevel] || skillLevel)
            : (INTENSITY_LABEL[skillLevel] || SKILL_LABEL[skillLevel] || skillLevel)
          }
        </span>
      </div>

      {/* Slot Indicator */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className={`flex items-center gap-1 font-medium ${isAlmostFull ? 'text-red-600' : 'text-gray-600'}`}>
            <Users size={12} />
            {isAlmostFull ? `⚡ Chỉ còn ${slotsLeft} slot!` : `Còn ${slotsLeft}/${match.max_slots} slot`}
          </span>
          <span className="text-gray-400">{match.filled_slots}/{match.max_slots}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${isAlmostFull ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${slotPercent}%` }} />
        </div>
      </div>

      {/* Host Info */}
      {match.host && (
        <div className="flex items-center gap-1.5 mt-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-600">
            {match.host.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-gray-700">{match.host.username}</span>
          {match.host.tier === 'VERIFIED_HOST' && <CheckCircle size={13} className="text-blue-500 fill-blue-50" />}
          {match.host.negative_reports > 3 && (
            <span className="flex items-center gap-0.5 rounded-md bg-red-50 border border-red-200 px-1.5 py-0.5 text-[9px] font-semibold text-red-700">
              <AlertTriangle size={9} /> Uy tín thấp
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 transition-all"
        >
          <MapPin size={13} className="text-gray-500" /> Xem vị trí
        </a>
        <button
          onClick={onJoin}
          className="flex-1 rounded-xl bg-green-500 py-2.5 text-xs font-bold text-white hover:bg-green-600 active:scale-[0.98] transition-all shadow-sm shadow-green-200"
        >
          Tham gia ngay
        </button>
      </div>
    </div>
  )
}
