'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Crown, BarChart2, Zap, Star, Users, Trophy, TrendingUp, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { clsx } from 'clsx'

interface SportCount { sport: string; count: number }
interface CoPlayer  { user_id: number; username: string; count: number }
interface MyStats {
  total_matches: number
  hosted_matches: number
  joined_matches: number
  avg_rating_given: number
  avg_rating_received: number
  sport_breakdown: SportCount[]
  most_active_hour: number
  weekly_streak: number
  top_co_players: CoPlayer[]
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

export default function StatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<MyStats | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ user: { is_premium: boolean } }>('/auth/me')
      .then(d => setIsPremium(d.user.is_premium))
      .catch(() => {})

    apiFetch<{ stats: MyStats }>('/premium/my-stats')
      .then(d => setStats(d.stats))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!loading && !isPremium) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-gray-50">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center mb-4 shadow-xl shadow-amber-300/30">
          <Crown size={36} className="text-white" />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Thống kê nâng cao</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Nâng cấp Premium để xem phân tích chuyên sâu về hoạt động thể thao của bạn.
        </p>
        <Link href="/profile/premium"
          className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-3.5 text-sm font-black text-gray-900 shadow-lg shadow-amber-300/30">
          Nâng cấp ngay
        </Link>
        <button onClick={() => router.back()} className="mt-4 text-xs text-gray-400">Quay lại</button>
      </div>
    )
  }

  return (
    <div className="px-4 py-5 max-w-md mx-auto pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-500 hover:text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
            <BarChart2 size={18} className="text-purple-500" /> Thống kê của tôi
          </h1>
          <p className="text-xs text-gray-500">Phân tích hoạt động thể thao · Premium</p>
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4">

          {/* Overview cards */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={<Trophy size={16} className="text-amber-500" />} value={String(stats.total_matches)} label="Tổng trận" color="amber" />
            <StatCard icon={<Zap size={16} className="text-blue-500" />} value={String(stats.hosted_matches)} label="Chủ trận" color="blue" />
            <StatCard icon={<Users size={16} className="text-green-500" />} value={String(stats.joined_matches)} label="Tham gia" color="green" />
          </div>

          {/* Rating */}
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">⭐ Đánh giá</p>
            <div className="flex gap-4">
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-gray-900">{stats.avg_rating_received.toFixed(1)}</p>
                <p className="text-[11px] text-gray-500">Nhận được</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={10} className={s <= Math.round(stats.avg_rating_received) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
              </div>
              <div className="w-px bg-gray-100" />
              <div className="flex-1 text-center">
                <p className="text-2xl font-black text-gray-900">{stats.avg_rating_given.toFixed(1)}</p>
                <p className="text-[11px] text-gray-500">Đã cho</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={10} className={s <= Math.round(stats.avg_rating_given) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sport breakdown */}
          {stats.sport_breakdown && stats.sport_breakdown.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🏅 Môn thể thao</p>
              <div className="space-y-2.5">
                {stats.sport_breakdown.map((s, i) => {
                  const maxCount = stats.sport_breakdown[0].count
                  const pct = Math.round((s.count / maxCount) * 100)
                  return (
                    <div key={s.sport} className="flex items-center gap-2">
                      <span className="text-lg w-6 text-center">{SPORT_ICON[s.sport] || '🏃'}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[11px] font-medium text-gray-700">{SPORT_LABEL[s.sport] || s.sport}</span>
                          <span className="text-[11px] text-gray-500">{s.count} trận</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={clsx('h-full rounded-full transition-all', i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-blue-400' : 'bg-gray-300')}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Streak + Active hour */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center">
              <TrendingUp size={20} className="text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900">{stats.weekly_streak}</p>
              <p className="text-[11px] text-gray-500 leading-tight">tuần liên tiếp có trận</p>
              {stats.weekly_streak >= 4 && <p className="text-[10px] text-orange-500 font-bold mt-1">🔥 Đang streak!</p>}
            </div>
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 text-center">
              <Clock size={20} className="text-indigo-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-gray-900">{stats.most_active_hour}:00</p>
              <p className="text-[11px] text-gray-500 leading-tight">giờ hoạt động nhiều nhất</p>
              <p className="text-[10px] text-indigo-500 font-medium mt-1">
                {stats.most_active_hour < 8 ? '🌅 Sáng sớm' : stats.most_active_hour < 12 ? '☀️ Buổi sáng' : stats.most_active_hour < 18 ? '🌤️ Buổi chiều' : '🌙 Buổi tối'}
              </p>
            </div>
          </div>

          {/* Top co-players */}
          {stats.top_co_players && stats.top_co_players.length > 0 && (
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">🤝 Đồng đội thường gặp</p>
              <div className="space-y-2">
                {stats.top_co_players.map((cp, i) => (
                  <Link key={cp.user_id} href={`/users/${cp.user_id}`}
                    className="flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2 py-1.5 -mx-2 transition-colors">
                    <span className={clsx(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black',
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'
                    )}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{cp.username}</p>
                      <p className="text-[10px] text-gray-400">{cp.count} trận cùng nhau</p>
                    </div>
                    <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full"
                        style={{ width: `${Math.round((cp.count / stats.top_co_players[0].count) * 100)}%` }} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-400 pb-4">
            Dữ liệu được tính từ tất cả trận đã hoàn thành
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  const bg = color === 'amber' ? 'bg-amber-50' : color === 'blue' ? 'bg-blue-50' : 'bg-green-50'
  return (
    <div className={clsx('rounded-2xl border border-gray-100 p-3 text-center shadow-sm', bg)}>
      <div className="flex justify-center mb-1">{icon}</div>
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}
