import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { Users, Heart, MessageCircle, Crown, ShieldCheck, UserPlus, Calendar, TrendingUp } from 'lucide-react'

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

interface UserInfo {
  id: string
  email: string
  full_name: string | null
  gender: string | null
  school: string | null
  verified_status: string
  is_premium: boolean
  created_at: string
}

export default function AdminPage() {
  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats')
      return data.stats as Stats
    },
  })

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get('/admin/users')
      return data.users as UserInfo[]
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">Quản trị CơDuyên</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard icon={<Users size={20} />} label="Tổng người dùng" value={stats.total_users} />
        <StatCard icon={<UserPlus size={20} />} label="Hôm nay" value={stats.today_users} color="text-green-600" />
        <StatCard icon={<Calendar size={20} />} label="7 ngày qua" value={stats.week_users} />
        <StatCard icon={<TrendingUp size={20} />} label="30 ngày qua" value={stats.month_users} />
        <StatCard icon={<Heart size={20} />} label="Tổng matches" value={stats.total_matches} color="text-pink-500" />
        <StatCard icon={<MessageCircle size={20} />} label="Tổng tin nhắn" value={stats.total_messages} />
        <StatCard icon={<Crown size={20} />} label="Premium" value={stats.premium_users} color="text-amber-500" />
        <StatCard icon={<ShieldCheck size={20} />} label="Đã xác minh" value={stats.verified_users} color="text-blue-500" />
      </div>

      {/* Users List */}
      <h2 className="mb-3 text-lg font-semibold">Người dùng gần đây</h2>
      {usersLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="space-y-2">
          {usersData?.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-3">
              <div>
                <p className="text-sm font-medium">{u.full_name || u.email}</p>
                <p className="text-xs text-muted-foreground">
                  {u.email} · {u.gender === 'male' ? 'Nam' : u.gender === 'female' ? 'Nữ' : '—'}
                  {u.school && ` · ${u.school}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {u.is_premium && <span className="text-xs text-amber-500">👑</span>}
                {u.verified_status !== 'pending' && <span className="text-xs text-blue-500">✓</span>}
                <span className="text-[10px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
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
