'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Clock, Users, CheckCircle, AlertTriangle, Loader2, ShieldAlert, UserCheck, ArrowUpDown, Radar, Crown, Lock, SlidersHorizontal, X, Zap, Search, Share2, RefreshCw, Flame } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import JoinModal from '@/components/JoinModal'
import WeeklyCalendarStrip from '@/components/WeeklyCalendarStrip'
import SportIcon from '@/components/SportIcon'
import { clsx } from 'clsx'

// --- Types ---
interface Host {
  id: number
  username: string
  tier: string
  negative_reports: number
  is_verified: boolean
  status?: string
  completed_matches_count?: number
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
  price_per_slot?: number
  status: string
  distance?: number
  is_friend_host?: boolean
  is_boosted?: boolean
  host_is_premium?: boolean
  host?: Host
  court_name?: string
  court_number?: number
  google_maps_url?: string
  is_recurring?: boolean
  recurrence_type?: string
}

interface AdvancedFilters {
  maxDist: string
  minPrice: string
  maxPrice: string
  startAfter: string
  startBefore: string
}

// --- Constants ---
const SPORTS = [
  { value: 'BADMINTON', label: 'Cầu lông', icon: '🏸' },
  { value: 'RUNNING', label: 'Chạy bộ', icon: '🏃' },
  { value: 'PICKLEBALL', label: 'Pickleball', icon: '' },
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
  const [userSkill, setUserSkill] = useState('INTERMEDIATE')
  const [isPremium, setIsPremium] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [newUserDismissed, setNewUserDismissed] = useState(false)
  const [showAdvFilters, setShowAdvFilters] = useState(false)
  const [advFilters, setAdvFilters] = useState<AdvancedFilters>({ maxDist: '', minPrice: '', maxPrice: '', startAfter: '', startBefore: '' })
  const [advFiltersActive, setAdvFiltersActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilterRow, setShowFilterRow] = useState(false)

  // Load user profile for skill level + premium status
  useEffect(() => {
    const dismissed = localStorage.getItem('new_user_banner_dismissed')
    if (dismissed) setNewUserDismissed(true)
    apiFetch<{ user: { skill_level: string; is_premium: boolean; completed_matches_count: number } }>('/auth/me')
      .then(d => {
        if (d.user.skill_level) setUserSkill(d.user.skill_level)
        setIsPremium(d.user.is_premium)
        if ((d.user.completed_matches_count ?? 0) === 0) setIsNewUser(true)
      })
      .catch(() => {})
  }, [])

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
    if (advFiltersActive) {
      if (advFilters.maxDist) params.set('max_dist', advFilters.maxDist)
      if (advFilters.minPrice) params.set('min_price', advFilters.minPrice)
      if (advFilters.maxPrice) params.set('max_price', advFilters.maxPrice)
      if (advFilters.startAfter) params.set('start_after', advFilters.startAfter)
      if (advFilters.startBefore) params.set('start_before', advFilters.startBefore)
    }
    apiFetch<{ matches: SportMatch[] }>(`/matches?${params}`)
      .then((data) => setMatches(data.matches || []))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [coords, dateFilter, sportFilter, getDateString, advFiltersActive, advFilters])

  // Client-side skill filter + search + sort
  const filteredMatches = useMemo(() => {
    let result = skillFilters.length === 0
      ? [...matches]
      : matches.filter((m) => skillFilters.includes(m.skill_level || 'INTERMEDIATE'))

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((m) =>
        m.title.toLowerCase().includes(q) || m.address.toLowerCase().includes(q)
      )
    }

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
    <div className="px-4 pt-3 pb-20">
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

      {/* New user welcome banner */}
      {isNewUser && !newUserDismissed && (
        <div className="mb-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 text-6xl opacity-10 -mt-2 -mr-1">🏸</div>
          <button
            onClick={() => { setNewUserDismissed(true); localStorage.setItem('new_user_banner_dismissed', '1') }}
            className="absolute top-2 right-2 text-white/60 hover:text-white text-lg leading-none"
          >×</button>
          <p className="text-xs font-bold text-green-100 mb-0.5">👋 Chào mừng đến CoDuyen!</p>
          <p className="text-sm font-bold mb-3">Tìm trận đầu tiên của bạn</p>
          <div className="flex gap-2">
            <Link href="/matches/create"
              className="flex-1 text-center rounded-xl bg-white/20 border border-white/30 py-2 text-xs font-bold hover:bg-white/30 transition-colors"
            >
              ⚡ Tạo trận
            </Link>
            <Link href="/onboarding"
              className="flex-1 text-center rounded-xl bg-white text-green-700 py-2 text-xs font-bold hover:bg-green-50 transition-colors"
            >
              Hoàn thiện hồ sơ
            </Link>
          </div>
        </div>
      )}

      {/* Sticky Filter Bar */}
      <div className="sticky top-[57px] z-20 bg-gray-50 pb-2 -mx-4 px-4 pt-1 space-y-1.5">
        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm trận, địa chỉ..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-8 text-sm outline-none focus:border-green-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Calendar Strip */}
        <WeeklyCalendarStrip days={30} selectedDate={dateFilter} onSelectDate={setDateFilter} />

        {/* Sport Chips + Filter toggle */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 pb-0.5">
            {SPORTS.map((sport) => (
              <button
                key={sport.value}
                onClick={() => { setSportFilter(sport.value); setSkillFilters([]) }}
                className={`flex-shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all ${
                  sportFilter === sport.value
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <SportIcon sport={sport.value} size={13} /> {sport.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilterRow(v => !v)}
            className={clsx(
              'shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all',
              (showFilterRow || skillFilters.length > 0 || sortBy !== 'distance' || advFiltersActive)
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-600 border-gray-200'
            )}
          >
            <SlidersHorizontal size={12} />
            {(skillFilters.length + (sortBy !== 'distance' ? 1 : 0) + (advFiltersActive ? 1 : 0)) > 0 && (
              <span className="text-[10px] font-bold">
                {skillFilters.length + (sortBy !== 'distance' ? 1 : 0) + (advFiltersActive ? 1 : 0)}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible: Skill + Sort + Advanced */}
        {(showFilterRow || skillFilters.length > 0 || sortBy !== 'distance' || advFiltersActive) && (
          <div className="space-y-1.5 pb-0.5">
            {/* Skill/Intensity chips */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {(SKILL_BASED_SPORTS.includes(sportFilter) ? SKILL_LEVELS : INTENSITY_LEVELS).map((sk) => (
                <button
                  key={sk.value}
                  onClick={() => toggleSkillFilter(sk.value)}
                  title={sk.desc}
                  className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${
                    skillFilters.includes(sk.value)
                      ? sk.color + ' border-current shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {sk.label}
                </button>
              ))}
              {skillFilters.length > 0 && (
                <button onClick={() => setSkillFilters([])} className="flex-shrink-0 rounded-full px-2 py-1 text-[10px] text-gray-400">
                  ✕ Bỏ lọc
                </button>
              )}
            </div>

            {/* Sort + Advanced */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <ArrowUpDown size={11} className="text-gray-400 shrink-0" />
              {([
                { value: 'distance', label: 'Gần nhất' },
                { value: 'time',     label: 'Sớm nhất' },
                { value: 'price',    label: 'Giá thấp' },
                { value: 'slots',    label: 'Nhiều slot' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={clsx(
                    'flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all',
                    sortBy === opt.value ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600'
                  )}
                >
                  {opt.label}
                </button>
              ))}
              <button
                onClick={() => setShowAdvFilters(v => !v)}
                className={clsx(
                  'shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border',
                  advFiltersActive ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white border-gray-200 text-gray-600'
                )}
              >
                <SlidersHorizontal size={10} /> Nâng cao
              </button>
            </div>
          </div>
        )}

        {/* Advanced filters panel */}
        {showAdvFilters && (
          <div className="rounded-2xl border border-indigo-100 bg-white p-4 mb-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-indigo-700">⚙️ Lọc nâng cao</span>
              <button onClick={() => setShowAdvFilters(false)}><X size={14} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <label className="flex flex-col gap-1">
                <span className="text-gray-500 font-medium">Khoảng cách tối đa (km)</span>
                <input type="number" placeholder="VD: 5" value={advFilters.maxDist}
                  onChange={e => setAdvFilters(f => ({ ...f, maxDist: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500 font-medium">Giá tối đa (VNĐ)</span>
                <input type="number" placeholder="VD: 50000" value={advFilters.maxPrice}
                  onChange={e => setAdvFilters(f => ({ ...f, maxPrice: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500 font-medium">Bắt đầu sau</span>
                <input type="time" value={advFilters.startAfter}
                  onChange={e => setAdvFilters(f => ({ ...f, startAfter: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500 font-medium">Bắt đầu trước</span>
                <input type="time" value={advFilters.startBefore}
                  onChange={e => setAdvFilters(f => ({ ...f, startBefore: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-400" />
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { setAdvFilters({ maxDist: '', minPrice: '', maxPrice: '', startAfter: '', startBefore: '' }); setAdvFiltersActive(false); setShowAdvFilters(false) }}
                className="flex-1 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-500"
              >Xoá lọc</button>
              <button
                onClick={() => { setAdvFiltersActive(true); setShowAdvFilters(false) }}
                className="flex-1 rounded-xl bg-indigo-500 py-2 text-xs font-bold text-white"
              >Áp dụng</button>
            </div>
          </div>
        )}
        {advFiltersActive && (
          <div className="flex items-center gap-1.5 pb-0.5">
            <span className="text-[10px] text-indigo-600 font-medium">Đang lọc nâng cao</span>
            <button onClick={() => { setAdvFiltersActive(false); setAdvFilters({ maxDist: '', minPrice: '', maxPrice: '', startAfter: '', startBefore: '' }) }}
              className="text-[10px] text-red-500 flex items-center gap-0.5"><X size={9} /> Xoá</button>
          </div>
        )}
      </div>

      {/* Match List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 size={28} className="text-green-500 animate-spin mb-2" />
          <p className="text-sm text-gray-400">Đang tìm trận gần bạn...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-14">
          <div className="flex justify-center mb-3"><SportIcon sport={sportFilter} size={52} /></div>
          <p className="text-base font-semibold text-gray-700">Chưa có trận nào hôm nay</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Đổi ngày, bỏ bộ lọc, hoặc tự tổ chức trận!</p>
          <Link
            href="/matches/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-green-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-green-200 hover:bg-green-600 active:scale-[0.98] transition-all"
          >
            ⚡ Tạo trận ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((m) => (
            <MatchCard key={m.id} match={m} userSkill={userSkill} isPremium={isPremium} onJoin={() => handleJoinClick(m)} />
          ))}
        </div>
      )}

      {/* Radar FAB */}
      <Link
        href={isPremium ? '/profile/radar' : '/profile/premium'}
        className={clsx(
          'fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full shadow-lg py-3 px-4 text-sm font-bold transition-all active:scale-95',
          isPremium
            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 shadow-amber-300/40'
            : 'bg-gray-900 text-amber-400 border border-amber-500/30 shadow-black/20'
        )}
      >
        <Radar size={16} className={isPremium ? '' : 'animate-pulse'} />
        {isPremium ? 'Radar' : 'Mở Radar'}
        {!isPremium && <Crown size={12} className="text-amber-400" />}
      </Link>

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

// Calculate match compatibility score (0-100) based on skill level and distance
function calcMatchScore(match: SportMatch, userSkill: string): number {
  const skillRank = SKILL_RANK[userSkill] || 3
  const matchRank = SKILL_RANK[match.skill_level || 'INTERMEDIATE'] || 3
  const skillDiff = Math.abs(skillRank - matchRank)
  const skillScore = skillDiff === 0 ? 100 : skillDiff === 1 ? 72 : skillDiff === 2 ? 44 : 15

  const dist = match.distance ?? 0
  const distScore = dist <= 1 ? 100 : dist <= 2 ? 85 : dist <= 3 ? 70 : dist <= 5 ? 52 : dist <= 10 ? 35 : 15

  const slotsLeft = match.max_slots - match.filled_slots
  const urgency = slotsLeft <= 2 ? 10 : 0

  return Math.min(99, Math.round(0.55 * skillScore + 0.35 * distScore + 0.1 * urgency + urgency))
}

const RECURRENCE_LABEL: Record<string, string> = { WEEKLY: 'Hàng tuần', BIWEEKLY: '2 tuần/lần' }

// --- MatchCard Component ---
function MatchCard({ match, userSkill, isPremium, onJoin }: { match: SportMatch; userSkill: string; isPremium: boolean; onJoin: () => void }) {
  const slotsLeft = match.max_slots - match.filled_slots
  const slotPercent = (match.filled_slots / match.max_slots) * 100
  const isAlmostFull = slotsLeft <= 2
  const isLastSlot = slotsLeft === 1
  const isFull = slotsLeft <= 0

  const dist = match.distance ?? 99
  const skillLevel = match.skill_level || 'INTERMEDIATE'
  // sportIcon rendered via <SportIcon> component below
  const price = match.price_per_slot ?? 0
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${match.latitude},${match.longitude}`
  const hostPremium = match.host_is_premium ?? false

  const skillLabel = SKILL_BASED_SPORTS.includes(match.sport_type)
    ? (SKILL_LABEL_RACKET[skillLevel] || skillLevel)
    : (INTENSITY_LABEL[skillLevel] || SKILL_LABEL[skillLevel] || skillLevel)

  const matchScore = calcMatchScore(match, userSkill)
  const scoreColor = matchScore >= 80 ? 'text-green-600' : matchScore >= 60 ? 'text-amber-600' : 'text-gray-500'

  return (
    <div className={clsx(
      'rounded-2xl border bg-white shadow-sm active:scale-[0.99] transition-all',
      match.is_boosted ? 'border-indigo-200 shadow-indigo-100' :
      match.is_friend_host ? 'border-green-200' :
      hostPremium ? 'border-amber-200/70' : 'border-gray-100'
    )}>
      {/* Banners */}
      {match.is_boosted && (
        <div className="flex items-center gap-1 px-4 pt-2 pb-0 text-[11px] font-bold text-indigo-600">
          <Zap size={11} className="fill-indigo-500" /> Nổi bật
        </div>
      )}
      {match.is_friend_host && (
        <div className="flex items-center gap-1 px-4 pt-2.5 pb-0 text-[11px] font-semibold text-green-700">
          <UserCheck size={11} /> Bạn bè của bạn tổ chức
        </div>
      )}
      {hostPremium && !match.is_friend_host && !match.is_boosted && (
        <div className="flex items-center gap-1 px-4 pt-2.5 pb-0 text-[11px] font-semibold text-amber-600">
          <Crown size={11} /> Premium Host · Uy tín cao
        </div>
      )}
      {match.host?.status === 'SUSPENDED' && (
        <div className="flex items-center gap-1 px-4 pt-2.5 pb-0 text-[11px] font-bold text-red-600">
          <ShieldAlert size={11} /> ⚠️ Tài khoản host đang bị tạm khóa — không nên tham gia
        </div>
      )}
      {isLastSlot && (
        <div className="flex items-center gap-1 px-4 pt-2.5 pb-0 text-[11px] font-bold text-red-600 animate-pulse">
          <Flame size={11} className="fill-red-500" /> Còn đúng 1 slot cuối — tham gia ngay!
        </div>
      )}
      {match.is_recurring && match.recurrence_type && !isLastSlot && (
        <div className="flex items-center gap-1 px-4 pt-2.5 pb-0 text-[11px] font-semibold text-purple-600">
          <RefreshCw size={10} /> {RECURRENCE_LABEL[match.recurrence_type] || match.recurrence_type}
        </div>
      )}

      <div className="p-4">
        {/* Row 1: Sport icon + Title + Match Score + Distance */}
        <div className="flex items-start gap-2.5">
          <SportIcon sport={match.sport_type} size={28} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-bold text-gray-900 leading-snug">{match.title}</h3>
          </div>
          {/* Match Score — visible for premium, locked teaser for free */}
          <Link
            href={isPremium ? '#' : '/profile/premium'}
            onClick={e => isPremium && e.preventDefault()}
            className={clsx(
              'shrink-0 flex items-center gap-0.5 rounded-lg px-2 py-0.5 text-xs font-bold transition-all',
              isPremium
                ? `${scoreColor} bg-gray-50`
                : 'bg-gray-100 text-gray-400 relative overflow-hidden'
            )}
          >
            {isPremium ? (
              <>🎯 {matchScore}%</>
            ) : (
              <span className="flex items-center gap-0.5 select-none">
                <Lock size={9} className="text-gray-400" />
                <span className="blur-[3px]">{matchScore}%</span>
              </span>
            )}
          </Link>
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
        {match.court_name && (
          <p className="text-[11px] text-blue-600 mt-0.5 ml-[18px] truncate">
            🏟️ {match.court_name}{match.court_number ? ` · Sân ${match.court_number}` : ''}
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
            {(match.host.completed_matches_count ?? 0) > 0 && (
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-1.5 py-0.5">
                ✓ {match.host.completed_matches_count} trận
              </span>
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
          <button
            onClick={() => {
              const url = `${window.location.origin}/m/${match.id}`
              if (navigator.share) {
                navigator.share({ title: match.title, text: `${match.title} lúc ${match.start_time.slice(0,5)} tại ${match.address}`, url })
              } else {
                navigator.clipboard.writeText(url)
              }
            }}
            className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            <Share2 size={12} />
          </button>
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
