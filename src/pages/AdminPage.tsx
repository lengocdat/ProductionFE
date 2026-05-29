import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Users, Heart, MessageCircle, Crown, ShieldCheck, UserPlus, Calendar, TrendingUp, Trash2, ArrowLeft, X } from 'lucide-react'

interface Stats {
  total_users: number
  today_users: number
  week_users: number
  month_users: number
  total_matches: number
  total_messages: number
  premium_users: number
  verified_users: number
}

interface DailyStat {
  date: string
  count: number
}

interface UserInfo {
  id: string
  email: string
  full_name: string | null
  gender: string | null
  school: string | null
  looking_for: string | null
  bio: string | null
  verified_status: string
  is_premium: boolean
  created_at: string
}

interface UserDetail {
  id: string
  email: string
  full_name: string | null
  gender: string | null
  birth_date: string | null
  school: string | null
  major: string | null
  bio: string | null
  mbti: string | null
  looking_for: string | null
  verified_status: string
  is_premium: boolean
  coin_balance: number
  created_at: string
  swipe_count: number
  match_count: number
  message_count: number
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)

  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats')
      return data.stats as Stats
    },
  })

  const { data: dailyStats } = useQuery({
    queryKey: ['admin-daily-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/daily-stats')
      return data.daily_stats as DailyStat[]
    },
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users')
      return data.users as UserInfo[]
    },
  })

  const { data: userDetail } = useQuery({
    queryKey: ['admin-user', selectedUser],
    queryFn: async () => {
      const { data } = await api.get(`/admin/users/${selectedUser}`)
      return data.user as UserDetail
    },
    enabled: !!selectedUser,
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setSelectedUser(null)
    },
  })

  if (statsError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-destructive">Bạn không có quyền truy cập trang này.</p>
      </div>
    )
  }

  if (statsLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải...</div>
  }

  const stats = statsData!

  // User detail modal
  if (selectedUser && userDetail) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <button onClick={() => setSelectedUser(null)} className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div className="rounded-2xl border border-border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">{userDetail.full_name || 'Chưa có tên'}</h2>
            <button
              onClick={() => { if (confirm('Xóa user này?')) deleteMutation.mutate(userDetail.id) }}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-600 hover:bg-red-100"
            >
              <Trash2 size={14} className="inline mr-1" />Xóa
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Email" value={userDetail.email} />
            <Info label="Giới tính" value={userDetail.gender === 'male' ? 'Nam' : userDetail.gender === 'female' ? 'Nữ' : '—'} />
            <Info label="Ngày sinh" value={userDetail.birth_date || '—'} />
            <Info label="Trường" value={userDetail.school || '—'} />
            <Info label="Ngành" value={userDetail.major || '—'} />
            <Info label="MBTI" value={userDetail.mbti || '—'} />
            <Info label="Muốn tìm" value={userDetail.looking_for === 'male' ? 'Nam' : userDetail.looking_for === 'female' ? 'Nữ' : '—'} />
            <Info label="Xác minh" value={userDetail.verified_status} />
            <Info label="Premium" value={userDetail.is_premium ? 'Có' : 'Không'} />
            <Info label="Xu" value={String(userDetail.coin_balance)} />
            <Info label="Ngày tạo" value={new Date(userDetail.created_at).toLocaleDateString('vi-VN')} />
          </div>
          {userDetail.bio && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Bio</p>
              <p className="text-sm mt-1">{userDetail.bio}</p>
            </div>
          )}
          <div className="mt-4 flex gap-4 text-sm">
            <span className="text-muted-foreground">Swipes: <strong>{userDetail.swipe_count}</strong></span>
            <span className="text-muted-foreground">Matches: <strong>{userDetail.match_count}</strong></span>
            <span className="text-muted-foreground">Messages: <strong>{userDetail.message_count}</strong></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">Quản trị CơDuyên</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={<Users size={20} />} label="Tổng người dùng" value={stats.total_users} />
        <StatCard icon={<UserPlus size={20} />} label="Hôm nay" value={stats.today_users} color="text-green-600" />
        <StatCard icon={<Calendar size={20} />} label="7 ngày qua" value={stats.week_users} />
        <StatCard icon={<TrendingUp size={20} />} label="30 ngày qua" value={stats.month_users} />
        <StatCard icon={<Heart size={20} />} label="Tổng matches" value={stats.total_matches} color="text-pink-500" />
        <StatCard icon={<MessageCircle size={20} />} label="Tổng tin nhắn" value={stats.total_messages} />
        <StatCard icon={<Crown size={20} />} label="Premium" value={stats.premium_users} color="text-amber-500" />
        <StatCard icon={<ShieldCheck size={20} />} label="Đã xác minh" value={stats.verified_users} color="text-blue-500" />
      </div>

      {/* Daily Chart */}
      {dailyStats && dailyStats.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold">Đăng ký theo ngày (30 ngày)</h3>
          <div className="flex items-end gap-1 h-24">
            {dailyStats.map((d) => {
              const max = Math.max(...dailyStats.map((x) => x.count), 1)
              const height = (d.count / max) * 100
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[9px] text-muted-foreground">{d.count || ''}</span>
                  <div
                    className="w-full rounded-t bg-primary/70 min-h-[2px]"
                    style={{ height: `${height}%` }}
                    title={`${d.date}: ${d.count} users`}
                  />
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">{dailyStats[0]?.date.slice(5)}</span>
            <span className="text-[9px] text-muted-foreground">{dailyStats[dailyStats.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      )}

      {/* Users List */}
      <h2 className="mb-3 text-lg font-semibold">Người dùng ({usersData?.length || 0})</h2>
      <div className="space-y-2">
        {usersData?.map((u) => (
          <div
            key={u.id}
            onClick={() => setSelectedUser(u.id)}
            className="flex items-center justify-between rounded-xl border border-border bg-white p-3 cursor-pointer hover:border-primary/30 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">{u.full_name || u.email}</p>
              <p className="text-xs text-muted-foreground">
                {u.email} · {u.gender === 'male' ? 'Nam' : u.gender === 'female' ? 'Nữ' : '—'}
                {u.school && ` · ${u.school}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {u.is_premium && <span className="text-xs">👑</span>}
              {u.verified_status !== 'pending' && <span className="text-xs text-blue-500">✓</span>}
              <span className="text-[10px] text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className={`mb-1 ${color || 'text-primary'}`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
