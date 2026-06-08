'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Users, Trophy } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface Club {
  id: number
  name: string
  sport_type: string
  description: string
  city: string
  member_count: number
  my_role: string
  is_public: boolean
}

const SPORT_ICON: Record<string, string> = {
  BADMINTON: '🏸', FOOTBALL: '⚽', BASKETBALL: '🏀',
  VOLLEYBALL: '🏐', TABLE_TENNIS: '🏓', TENNIS: '🎾',
  RUNNING: '🏃', PICKLEBALL: '🏓',
}

const SPORTS = [
  { value: '', label: 'Tất cả' },
  { value: 'BADMINTON', label: 'Cầu lông' },
  { value: 'FOOTBALL', label: 'Bóng đá' },
  { value: 'TENNIS', label: 'Tennis' },
  { value: 'PICKLEBALL', label: 'Pickleball' },
  { value: 'RUNNING', label: 'Chạy bộ' },
]

export default function ClubsPage() {
  const [tab, setTab] = useState<'discover' | 'my'>('discover')
  const [clubs, setClubs] = useState<Club[]>([])
  const [myClubs, setMyClubs] = useState<Club[]>([])
  const [sport, setSport] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (sport) params.set('sport', sport)
    if (city) params.set('city', city)
    apiFetch<{ clubs: Club[] }>(`/clubs?${params}`)
      .then(d => setClubs(d.clubs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sport, city])

  useEffect(() => {
    apiFetch<{ clubs: Club[] }>('/clubs/my')
      .then(d => setMyClubs(d.clubs || []))
      .catch(() => {})
  }, [])

  const displayed = tab === 'my' ? myClubs : clubs

  return (
    <div className="px-4 pt-3 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">CLB Thể thao</h1>
        <Link href="/clubs/create"
          className="flex items-center gap-1 rounded-xl bg-green-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-green-200">
          <Plus size={14} /> Tạo CLB
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 rounded-xl bg-gray-100 p-1">
        {(['discover', 'my'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>
            {t === 'discover' ? '🔍 Khám phá' : '⭐ CLB của tôi'}
          </button>
        ))}
      </div>

      {tab === 'discover' && (
        <div className="space-y-2 mb-4">
          {/* City search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={city} onChange={e => setCity(e.target.value)}
              placeholder="Tìm theo thành phố..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-8 pr-4 text-sm outline-none focus:border-green-400" />
          </div>
          {/* Sport filter */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {SPORTS.map(s => (
              <button key={s.value} onClick={() => setSport(s.value)}
                className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                  sport === s.value ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-600 border-gray-200'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-14">
          <Trophy size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-semibold text-gray-600">
            {tab === 'my' ? 'Bạn chưa tham gia CLB nào' : 'Chưa có CLB nào'}
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {tab === 'my' ? 'Khám phá và tham gia CLB ngay!' : 'Hãy tạo CLB đầu tiên trong khu vực!'}
          </p>
          <Link href="/clubs/create"
            className="inline-flex items-center gap-1 rounded-xl bg-green-500 px-5 py-2 text-sm font-bold text-white">
            <Plus size={14} /> Tạo CLB
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(club => (
            <Link key={club.id} href={`/clubs/${club.id}`}
              className="block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:border-green-200 transition-all active:scale-[0.99]">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-2xl shrink-0">
                  {SPORT_ICON[club.sport_type] || '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-900 truncate">{club.name}</h3>
                    {club.my_role && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5 shrink-0">
                        {club.my_role === 'OWNER' ? 'Chủ' : 'Thành viên'}
                      </span>
                    )}
                  </div>
                  {club.city && <p className="text-[11px] text-gray-500 mt-0.5">📍 {club.city}</p>}
                  {club.description && (
                    <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{club.description}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    <Users size={11} className="text-gray-400" />
                    <span className="text-[11px] text-gray-500">{club.member_count} thành viên</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
