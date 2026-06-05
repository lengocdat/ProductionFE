'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Star, Shield, AlertTriangle, Award, Trophy, Clock, XCircle, Ban, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import EquippedBadge from '@/components/EquippedBadge'

interface PublicProfile {
  user: {
    id: number
    username: string
    avatar_url: string | null
    tier: string
    is_premium: boolean
    equipped_badge: string | null
    created_at: string
  }
  stats: {
    trust_score: number
    cancellation_rate: number
    no_show_count: number
    total_matches: number
    avg_rating: number
    total_ratings: number
  }
  badges: Badge[]
  ratings: RatingInfo[]
  match_history: MatchInfo[]
}

interface Badge {
  id: number
  name: string
  description: string
  icon_url: string
  tier: string
  badge_group: string
  is_unlocked: boolean
}

interface RatingInfo {
  id: number
  stars: number
  review_text: string
  rater_name: string
  created_at: string
}

interface MatchInfo {
  id: number
  title: string
  match_date: string
  status: string
  role: string
}

type Tab = 'badges' | 'ratings' | 'history'
type FriendshipStatus = 'ACCEPTED' | 'PENDING_FROM_ME' | 'PENDING' | 'NONE' | 'SELF'

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = Number(params.id)
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('badges')
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('NONE')
  const [friendshipId, setFriendshipId] = useState<number | null>(null)
  const [friendLoading, setFriendLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return

    Promise.all([
      apiFetch<PublicProfile>(`/users/${userId}/public-profile`),
      apiFetch<{ user: { id: number } }>('/auth/me')
        .then(data => data.user.id)
        .catch(() => null)
    ])
      .then(([profileData, currId]) => {
        setProfile(profileData)
        setCurrentUserId(currId)

        if (currId && currId !== userId) {
          return apiFetch<{ status: FriendshipStatus; friendship_id?: number }>(`/friends/${userId}/status`)
            .then((data) => {
              setFriendshipStatus(data.status)
              setFriendshipId(data.friendship_id ?? null)
            })
            .catch(() => {})
        }
      })
      .catch(() => router.replace('/feed'))
      .finally(() => setLoading(false))
  }, [userId, router])

  const handleFriendAction = async (action: 'add' | 'cancel' | 'accept' | 'unfriend') => {
    setFriendLoading(true)
    try {
      if (action === 'add') {
        await apiFetch(`/friends/request/${userId}`, { method: 'POST' })
        const statusRes = await apiFetch<{ status: FriendshipStatus; friendship_id?: number }>(`/friends/${userId}/status`)
        setFriendshipStatus(statusRes.status)
        setFriendshipId(statusRes.friendship_id ?? null)
        toast.success('Đã gửi lời mời kết bạn!')
      } else if (action === 'cancel') {
        if (friendshipId) {
          await apiFetch(`/friends/${friendshipId}/reject`, { method: 'POST' })
        }
        setFriendshipStatus('NONE')
        setFriendshipId(null)
        toast.success('Đã hủy yêu cầu kết bạn')
      } else if (action === 'accept') {
        if (friendshipId) {
          await apiFetch(`/friends/${friendshipId}/accept`, { method: 'POST' })
          setFriendshipStatus('ACCEPTED')
          toast.success('Chấp nhận kết bạn!')
        }
      } else if (action === 'unfriend') {
        const friends = await apiFetch<{ friends: any[] }>('/friends')
        const friendId = friends.friends.find(f => f.id === userId)?.id
        if (friendId) {
          await apiFetch(`/friends/${friendId}`, { method: 'DELETE' })
          setFriendshipStatus('NONE')
          toast.success('Đã hủy kết bạn')
        }
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra')
    } finally {
      setFriendLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    )
  }

  if (!profile) return null

  const { user, stats, badges, ratings, match_history } = profile
  const isLowTrust = stats.trust_score < 60
  const isOwnProfile = currentUserId === userId

  return (
    <div className="px-4 py-4 pb-24">
      <button onClick={() => router.back()} className="mb-3 flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className={`rounded-2xl p-5 shadow-sm text-center ${isLowTrust ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
        <div className="relative mx-auto mb-3 w-fit">
          <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
            user.equipped_badge ? 'ring-2 ring-amber-400 ring-offset-2' : ''
          } ${user.avatar_url ? '' : 'bg-green-100 text-green-600'}`}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
        </div>
        {user.equipped_badge && (
          <div className="flex justify-center mb-1">
            <EquippedBadge
              iconUrl={badges.find(b => b.is_unlocked && b.name === user.equipped_badge)?.icon_url ?? ''}
              name={user.equipped_badge}
              size="md"
            />
          </div>
        )}

        <h1 className="text-lg font-bold text-gray-900">{user.username}</h1>
        <div className="flex justify-center gap-2 mt-1.5">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
            {user.tier === 'VERIFIED_HOST' ? '✅ Uy tín' : user.tier === 'REGULAR' ? '👍 Thường xuyên' : '🆕 Mới'}
          </span>
          {user.is_premium && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[10px] font-bold text-white">
              ⭐ Premium
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] text-gray-400">Tham gia: {new Date(user.created_at).toLocaleDateString('vi-VN')}</p>

        {isLowTrust && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-red-100 p-2 text-xs text-red-700 font-medium">
            <AlertTriangle size={14} /> Người dùng có điểm uy tín thấp
          </div>
        )}

        {!isOwnProfile && (
          <div className="mt-4">
            {friendshipStatus === 'ACCEPTED' && (
              <button
                onClick={() => handleFriendAction('unfriend')}
                disabled={friendLoading}
                className="w-full rounded-xl bg-green-100 hover:bg-green-200 text-green-700 py-2.5 text-sm font-bold transition disabled:opacity-50"
              >
                {friendLoading ? 'Đang xử lý...' : '✓ Bạn bè (Hủy kết bạn)'}
              </button>
            )}
            {friendshipStatus === 'PENDING_FROM_ME' && (
              <button
                onClick={() => handleFriendAction('cancel')}
                disabled={friendLoading}
                className="w-full rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 py-2.5 text-sm font-bold transition disabled:opacity-50"
              >
                {friendLoading ? 'Đang xử lý...' : '⏳ Hủy yêu cầu'}
              </button>
            )}
            {friendshipStatus === 'PENDING' && (
              <button
                onClick={() => handleFriendAction('accept')}
                disabled={friendLoading}
                className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white py-2.5 text-sm font-bold transition disabled:opacity-50"
              >
                {friendLoading ? 'Đang xử lý...' : '✓ Chấp nhận kết bạn'}
              </button>
            )}
            {friendshipStatus === 'NONE' && (
              <button
                onClick={() => handleFriendAction('add')}
                disabled={friendLoading}
                className="w-full rounded-xl bg-green-500 hover:bg-green-600 text-white py-2.5 text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {friendLoading ? 'Đang xử lý...' : (<><UserPlus size={16} /> Thêm bạn bè</>)}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCard
          icon={<Shield size={16} className={isLowTrust ? 'text-red-500' : 'text-green-500'} />}
          value={String(stats.trust_score)}
          label="Điểm uy tín"
          warning={isLowTrust}
        />
        <StatCard
          icon={<XCircle size={16} className="text-orange-500" />}
          value={`${stats.cancellation_rate.toFixed(1)}%`}
          label="Tỉ lệ hủy"
        />
        <StatCard
          icon={<Ban size={16} className="text-red-400" />}
          value={String(stats.no_show_count)}
          label="Bùng trận"
        />
      </div>

      <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
        <TabButton active={activeTab === 'badges'} onClick={() => setActiveTab('badges')} icon={<Trophy size={14} />} label="Huy hiệu" />
        <TabButton active={activeTab === 'ratings'} onClick={() => setActiveTab('ratings')} icon={<Star size={14} />} label="Đánh giá" />
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock size={14} />} label="Lịch sử" />
      </div>

      <div className="mt-3">
        {activeTab === 'badges' && <BadgesTab badges={badges} />}
        {activeTab === 'ratings' && <RatingsTab ratings={ratings} stats={stats} />}
        {activeTab === 'history' && <HistoryTab matches={match_history} />}
      </div>
    </div>
  )
}

const TIER_LABEL: Record<string, string> = { BRONZE: 'Tập Sự', SILVER: 'Chuyên Nghiệp', GOLD: 'Huyền Thoại' }
const BADGE_GROUP_ORDER = ['hoat_dong', 'bau_so', 'choi_dep', 'thuong_gia', 'premium']
const BADGE_GROUP_LABEL: Record<string, string> = {
  hoat_dong: '⚔️ Hoạt động',
  bau_so: '🏟️ Bầu sô',
  choi_dep: '⭐ Chơi đẹp',
  thuong_gia: '🛒 Thương gia',
  premium: '💎 Premium',
}

function BadgesTab({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) {
    return <EmptyState text="Chưa có huy hiệu nào" />
  }

  const unlocked = badges.filter(b => b.is_unlocked).length
  const grouped = BADGE_GROUP_ORDER.reduce<Record<string, Badge[]>>((acc, g) => {
    acc[g] = badges.filter(b => b.badge_group === g)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-500">Huy hiệu đã mở</span>
        <span className="text-xs font-bold text-green-600">{unlocked} / {badges.length}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all"
          style={{ width: `${badges.length > 0 ? (unlocked / badges.length) * 100 : 0}%` }}
        />
      </div>

      {BADGE_GROUP_ORDER.map((groupKey) => {
        const group = grouped[groupKey]
        if (!group || group.length === 0) return null
        const groupUnlocked = group.filter(b => b.is_unlocked).length
        return (
          <div key={groupKey}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">{BADGE_GROUP_LABEL[groupKey]}</span>
              <div className="flex gap-1">
                {group.map(b => (
                  <span key={b.id} className={`w-2 h-2 rounded-full ${b.is_unlocked ? getTierDot(b.tier) : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {group.map((badge) => (
                <div
                  key={badge.id}
                  className={`rounded-xl p-2.5 text-center transition ${
                    badge.is_unlocked
                      ? 'bg-white shadow-sm border border-gray-100'
                      : 'bg-gray-50 opacity-45 grayscale'
                  }`}
                >
                  <div className="flex justify-center mb-1.5">
                    {badge.icon_url ? (
                      <img src={badge.icon_url} alt={badge.name} className="h-8 w-8" />
                    ) : (
                      <span className="text-xl">{getTierEmoji(badge.tier)}</span>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold text-gray-800 leading-tight line-clamp-2">{badge.name}</p>
                  <span className={`mt-1 inline-block rounded-full px-1.5 py-px text-[8px] font-medium ${getTierColor(badge.tier)}`}>
                    {TIER_LABEL[badge.tier] || badge.tier}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RatingsTab({ ratings, stats }: { ratings: RatingInfo[]; stats: PublicProfile['stats'] }) {
  return (
    <div>
      <div className="mb-3 rounded-xl bg-white p-4 shadow-sm text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-gray-900">
            {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '—'}
          </span>
          <Star size={24} className="text-yellow-400 fill-yellow-400" />
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{stats.total_ratings} lượt đánh giá</p>
        {stats.avg_rating > 0 && (
          <div className="flex justify-center gap-0.5 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={16}
                className={i < Math.round(stats.avg_rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}
              />
            ))}
          </div>
        )}
      </div>

      {(!ratings || ratings.length === 0) ? (
        <EmptyState text="Chưa có đánh giá nào" />
      ) : (
        <div className="space-y-2">
          {ratings.map((r) => (
            <div key={r.id} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                </div>
                <span className="text-[9px] text-gray-400">{new Date(r.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              {r.review_text && <p className="mt-1.5 text-[11px] text-gray-600">{r.review_text}</p>}
              <p className="mt-1 text-[10px] text-gray-400">— {r.rater_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryTab({ matches }: { matches: MatchInfo[] }) {
  if (!matches || matches.length === 0) {
    return <EmptyState text="Chưa có lịch sử trận đấu" />
  }

  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <Link key={`${m.id}-${m.role}`} href={`/matches/${m.id}`}>
          <div className="rounded-xl bg-white p-3 shadow-sm hover:bg-gray-50 transition">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(m.match_date).toLocaleDateString('vi-VN')} • {m.role === 'HOST' ? '🎯 Host' : '🏃 Người chơi'}
                </p>
              </div>
              <StatusBadge status={m.status} />
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}

function StatCard({ icon, value, label, warning }: { icon: React.ReactNode; value: string; label: string; warning?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl p-3 shadow-sm ${warning ? 'bg-red-50 border border-red-200' : 'bg-white'}`}>
      {icon}
      <span className={`mt-1 text-sm font-bold ${warning ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
      <span className="text-[9px] text-gray-500">{label}</span>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-medium transition ${
        active ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon} {label}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    FINISHED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Hoàn thành' },
    OPEN: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đang mở' },
    FULL: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Đã đủ' },
    CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Đã hủy' },
  }
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
      <Award size={32} className="mb-2 opacity-40" />
      <p className="text-xs">{text}</p>
    </div>
  )
}

function getTierEmoji(tier: string) {
  switch (tier) {
    case 'GOLD': return '🥇'
    case 'SILVER': return '🥈'
    case 'BRONZE': return '🥉'
    default: return '🏅'
  }
}

function getTierColor(tier: string) {
  switch (tier) {
    case 'GOLD': return 'bg-amber-100 text-amber-700'
    case 'SILVER': return 'bg-blue-100 text-blue-700'
    case 'BRONZE': return 'bg-orange-100 text-orange-700'
    default: return 'bg-gray-100 text-gray-600'
  }
}

function getTierDot(tier: string) {
  switch (tier) {
    case 'GOLD': return 'bg-amber-400'
    case 'SILVER': return 'bg-blue-400'
    case 'BRONZE': return 'bg-orange-500'
    default: return 'bg-gray-400'
  }
}
