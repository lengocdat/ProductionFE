'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, AlertTriangle, Calendar, Shield, LogOut, Trophy, Crown, ShoppingBag, LayoutDashboard, ChevronRight, User, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import EquippedBadge from '@/components/EquippedBadge'

interface User { id: number; username: string; email: string; role: string; tier: string; negative_reports: number; no_show_count: number; created_at: string }
interface Rating { id: number; stars: number; is_negative: boolean; review_text: string; created_at: string }
interface BadgeSummary { equipped_badge_name: string; equipped_badge_icon: string; unlocked: number; total: number }

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [badgeSummary, setBadgeSummary] = useState<BadgeSummary | null>(null)

  useEffect(() => {
    apiFetch<{ user: User }>('/auth/me').then((d) => {
      setUser(d.user)
      apiFetch<{ ratings: Rating[] }>(`/ratings/${d.user.id}`).then((r) => setRatings(r.ratings || [])).catch(() => {})
    })
    apiFetch<{ badges: Array<{ name: string; icon_url: string; is_equipped: boolean; is_unlocked: boolean }>; unlocked: number; total: number }>('/badges/my')
      .then((d) => {
        const equipped = d.badges.find(b => b.is_equipped)
        setBadgeSummary({
          equipped_badge_name: equipped?.name ?? '',
          equipped_badge_icon: equipped?.icon_url ?? '',
          unlocked: d.unlocked,
          total: d.total,
        })
      })
      .catch(() => {})
  }, [])

  function logout() {
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('access_token')
    router.replace('/login')
  }

  if (!user) return null
  const avgStars = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : '—'

  return (
    <div className="px-4 py-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm text-center">
        <div className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600 ${badgeSummary?.equipped_badge_icon ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        {badgeSummary?.equipped_badge_name && (
          <div className="flex justify-center mb-2">
            <EquippedBadge iconUrl={badgeSummary.equipped_badge_icon} name={badgeSummary.equipped_badge_name} size="sm" />
          </div>
        )}
        <h1 className="text-lg font-bold text-gray-900">{user.username}</h1>
        <p className="text-xs text-gray-500">{user.email}</p>
        <div className="flex justify-center gap-2 mt-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
            {user.tier === 'VERIFIED_HOST' ? '✅ Uy tín' : user.tier === 'REGULAR' ? '👍 Thường xuyên' : '🆕 Mới'}
          </span>
          {badgeSummary && badgeSummary.total > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
              🏆 {badgeSummary.unlocked}/{badgeSummary.total}
            </span>
          )}
        </div>
        {user.negative_reports > 3 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 p-2 text-xs text-red-700">
            <AlertTriangle size={13} /> {user.negative_reports} phiếu tiêu cực
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        <StatCard icon={<Star size={16} className="text-yellow-500" />} value={avgStars} label="Đánh giá" />
        <StatCard icon={<Shield size={16} className="text-red-400" />} value={String(user.negative_reports)} label="Phiếu xấu" />
        <StatCard icon={<AlertTriangle size={16} className="text-orange-500" />} value={String(user.no_show_count || 0)} label="Bùng trận" />
        <StatCard icon={<Calendar size={16} className="text-green-500" />} value={new Date(user.created_at).toLocaleDateString('vi-VN')} label="Tham gia" />
      </div>

      {/* Quick Menu */}
      <div className="mt-4 rounded-2xl bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <MenuLink href={`/users/${user.id}`} icon={<User size={18} className="text-indigo-500" />} label="Hồ sơ công khai" desc="Xem hồ sơ như người khác thấy" />
        <MenuLink href="/friends" icon={<Users size={18} className="text-blue-500" />} label="Bạn bè" desc="Danh sách bạn và lời mời kết bạn" />
        <MenuLink href="/my-matches" icon={<Calendar size={18} className="text-green-500" />} label="Trận của tôi" desc="Xem lịch, hủy tham gia, lịch sử" />
        <MenuLink href="/profile/achievements" icon={<Trophy size={18} className="text-amber-500" />} label="Thành tựu & Huy hiệu" desc="Xem tiến trình và badge đã đạt" />
        <MenuLink href="/marketplace" icon={<ShoppingBag size={18} className="text-green-500" />} label="Chợ đồ thể thao" desc="Mua bán đồ cũ, tìm deals" />
        <MenuLink href="/profile/premium" icon={<Crown size={18} className="text-yellow-500" />} label="Nâng cấp Premium" desc="Radar tự động, không quảng cáo" premium />
        <MenuLink href="/dashboard/courts" icon={<LayoutDashboard size={18} className="text-blue-500" />} label="Quản lý sân (Chủ sân)" desc="Dashboard booking & lịch sân" />
      </div>

      {ratings.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-2">Đánh giá gần đây</h3>
          <div className="space-y-2">
            {ratings.slice(0, 5).map((r) => (
              <div key={r.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                  ))}
                  {r.is_negative && <span className="ml-1 rounded bg-red-100 px-1 text-[9px] text-red-700">Tiêu cực</span>}
                </div>
                {r.review_text && <p className="mt-1 text-[11px] text-gray-600">{r.review_text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={logout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm text-red-600 hover:bg-red-50">
        <LogOut size={15} /> Đăng xuất
      </button>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white p-3 shadow-sm">
      {icon}
      <span className="mt-1 text-sm font-bold text-gray-900">{value}</span>
      <span className="text-[9px] text-gray-500">{label}</span>
    </div>
  )
}

function MenuLink({ href, icon, label, desc, premium }: { href: string; icon: React.ReactNode; label: string; desc: string; premium?: boolean }) {
  return (
    <a href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {premium && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-1.5 py-px text-[8px] font-bold text-white">PRO</span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 truncate">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </a>
  )
}
