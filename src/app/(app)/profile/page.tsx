'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, AlertTriangle, Calendar, Shield, LogOut, Trophy, Crown, ShoppingBag, LayoutDashboard, ChevronRight, User, Users, Eye, BarChart2, Zap, Check, Copy, Gift, Phone, Pencil, Lightbulb } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import EquippedBadge from '@/components/EquippedBadge'
import { toast } from 'sonner'

interface User { id: number; username: string; email: string; role: string; tier: string; skill_level: string; negative_reports: number; no_show_count: number; completed_matches_count: number; is_premium: boolean; premium_expires_at?: string; current_streak: number; max_streak: number; created_at: string; phone_number?: string }
interface Rating { id: number; stars: number; is_negative: boolean; review_text: string; created_at: string }
interface BadgeSummary { equipped_badge_name: string; equipped_badge_icon: string; unlocked: number; total: number }
interface ReferralInfo { code: string; count: number }

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])
  const [badgeSummary, setBadgeSummary] = useState<BadgeSummary | null>(null)
  const [referral, setReferral] = useState<ReferralInfo | null>(null)
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)

  async function savePhone() {
    const trimmed = phoneInput.trim().replace(/\s/g, '')
    if (!/^(0|\+84)[3-9]\d{8}$/.test(trimmed)) {
      toast.error('Số điện thoại không hợp lệ (VD: 0912345678)')
      return
    }
    setSavingPhone(true)
    try {
      await apiFetch('/auth/profile', { method: 'PATCH', json: { phone_number: trimmed } })
      localStorage.setItem('user_phone', trimmed)
      setUser(u => u ? { ...u, phone_number: trimmed } : u)
      setEditingPhone(false)
      toast.success('Đã cập nhật số điện thoại')
    } catch {
      toast.error('Không lưu được, thử lại sau')
    } finally {
      setSavingPhone(false)
    }
  }

  useEffect(() => {
    apiFetch<{ user: User }>('/auth/me').then((d) => {
      setUser(d.user)
      localStorage.setItem('user_phone', d.user.phone_number || '')
      setPhoneInput(d.user.phone_number || '')
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
    apiFetch<ReferralInfo>('/auth/referral').then(setReferral).catch(() => {})
  }, [])

  function logout() {
    fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {})
    localStorage.removeItem('access_token')
    router.replace('/login')
  }

  if (!user) return null
  const avgStars = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1) : '—'

  const isNewUser = (user.completed_matches_count ?? 0) === 0
  const completionSteps = [
    { done: !!user.username, label: 'Tạo tên người dùng', href: null as string | null },
    { done: (user.completed_matches_count ?? 0) > 0, label: 'Tham gia trận đầu tiên', href: '/feed' },
    { done: ratings.length > 0, label: 'Nhận đánh giá đầu tiên', href: '/feed' },
  ]
  const completedSteps = completionSteps.filter(s => s.done).length

  return (
    <div className="px-4 py-5">
      {/* New user checklist */}
      {isNewUser && (
        <div className="mb-4 rounded-2xl overflow-hidden border border-green-200 bg-white shadow-sm">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-100">Bắt đầu hành trình</p>
              <p className="text-sm font-extrabold text-white">{completedSteps}/{completionSteps.length} hoàn thành</p>
            </div>
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="white" strokeWidth="3"
                  strokeDasharray={`${(completedSteps / completionSteps.length) * 100} 100`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {Math.round((completedSteps / completionSteps.length) * 100)}%
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {completionSteps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-green-500' : 'bg-gray-100'}`}>
                  {s.done && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
                <span className={`flex-1 text-xs ${s.done ? 'text-gray-400 line-through' : 'text-gray-700 font-medium'}`}>{s.label}</span>
                {!s.done && s.href && (
                  <a href={s.href} className="text-[10px] font-bold text-green-600 shrink-0">Đi ngay →</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streak banner */}
      {(user.current_streak ?? 0) > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-4 py-3">
          <span className="text-2xl">🔥</span>
          <div className="flex-1">
            <p className="text-sm font-black text-orange-700">{user.current_streak} ngày liên tiếp!</p>
            <p className="text-[11px] text-orange-500">Kỷ lục: {user.max_streak} ngày · Mở app mỗi ngày để giữ streak</p>
          </div>
          {user.current_streak >= 7 && (
            <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
              {user.current_streak >= 30 ? '👑' : user.current_streak >= 14 ? '⚔️' : '🏅'}
            </span>
          )}
        </div>
      )}

      <div className={`rounded-2xl bg-white p-5 shadow-sm text-center ${user.is_premium ? 'ring-2 ring-amber-400/60' : ''}`}>
        <div className="relative mx-auto mb-2 w-16 h-16">
          <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600 ${user.is_premium ? 'ring-2 ring-amber-400 ring-offset-2' : badgeSummary?.equipped_badge_icon ? 'ring-2 ring-amber-400 ring-offset-2' : ''}`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          {user.is_premium && (
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
              <Crown size={12} className="text-white" />
            </div>
          )}
        </div>
        {badgeSummary?.equipped_badge_name && (
          <div className="flex justify-center mb-2">
            <EquippedBadge iconUrl={badgeSummary.equipped_badge_icon} name={badgeSummary.equipped_badge_name} size="sm" />
          </div>
        )}
        <h1 className="text-lg font-bold text-gray-900 flex items-center justify-center gap-1.5">
          {user.username}
          {user.is_premium && (
            <span className="text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-500 text-gray-900 px-1.5 py-0.5 rounded-full">PRO</span>
          )}
        </h1>
        <p className="text-xs text-gray-500">{user.email}</p>

        {/* Phone number — inline editor */}
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {editingPhone ? (
            <>
              <Phone size={12} className="text-green-500 shrink-0" />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') setEditingPhone(false) }}
                placeholder="0912 345 678"
                maxLength={12}
                autoFocus
                className="w-32 rounded-lg border border-green-300 bg-white px-2 py-0.5 text-xs outline-none focus:border-green-500 text-center"
              />
              <button onClick={savePhone} disabled={savingPhone} className="text-[10px] font-bold text-green-600 hover:text-green-700 disabled:opacity-50">
                {savingPhone ? '...' : 'Lưu'}
              </button>
              <button onClick={() => setEditingPhone(false)} className="text-[10px] text-gray-400 hover:text-gray-600">Hủy</button>
            </>
          ) : (
            <button
              onClick={() => { setPhoneInput(user.phone_number || ''); setEditingPhone(true) }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors group"
            >
              <Phone size={12} className="shrink-0" />
              <span>{user.phone_number || 'Thêm số điện thoại'}</span>
              <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}
        </div>

        <div className="flex justify-center flex-wrap gap-1.5 mt-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
            {user.tier === 'VERIFIED_HOST' ? '✅ Uy tín' : user.tier === 'REGULAR' ? '👍 Thường xuyên' : '🆕 Mới'}
          </span>
          {badgeSummary && badgeSummary.total > 0 && (
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
              🏆 {badgeSummary.unlocked}/{badgeSummary.total}
            </span>
          )}
          {user.is_premium && user.premium_expires_at && (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-medium text-amber-700">
              👑 HSD {new Date(user.premium_expires_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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

      {/* Referral Card */}
      {referral && referral.code && (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-4 shadow-md text-white">
          <div className="flex items-center gap-2 mb-2">
            <Gift size={16} className="text-green-100" />
            <p className="text-xs font-bold text-green-100">Giới thiệu bạn bè</p>
          </div>
          <p className="text-[11px] text-green-100 mb-3">
            Mỗi người đăng ký bằng mã của bạn → cả hai nhận <strong className="text-white">7 ngày Premium</strong> miễn phí!
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-center">
              <p className="text-lg font-black tracking-widest text-white">{referral.code}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(referral.code)
                toast.success('Đã copy mã giới thiệu!')
              }}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <Copy size={13} /> Copy
            </button>
            <button
              onClick={() => {
                const url = `${window.location.origin}/register?ref=${referral.code}`
                if (navigator.share) {
                  navigator.share({ title: 'CoDuyen', text: `Tham gia CoDuyen với mã ${referral.code}`, url })
                } else {
                  navigator.clipboard.writeText(url)
                  toast.success('Đã copy link mời!')
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 border border-white/30 px-3 py-2 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
            >
              <Zap size={13} /> Chia sẻ
            </button>
          </div>
          {referral.count > 0 && (
            <p className="text-[11px] text-green-100 mt-2">
              🎉 Bạn đã giới thiệu <strong className="text-white">{referral.count} người</strong>
            </p>
          )}
        </div>
      )}

      {/* Quick Menu */}
      <div className="mt-4 rounded-2xl bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        <MenuLink href={`/users/${user.id}`} icon={<User size={18} className="text-indigo-500" />} label="Hồ sơ công khai" desc="Xem hồ sơ như người khác thấy" />
        <MenuLink href="/friends" icon={<Users size={18} className="text-blue-500" />} label="Bạn bè" desc="Danh sách bạn và lời mời kết bạn" />
        <MenuLink href="/my-matches" icon={<Calendar size={18} className="text-green-500" />} label="Trận của tôi" desc="Xem lịch, hủy tham gia, lịch sử" />
        <MenuLink href="/profile/achievements" icon={<Trophy size={18} className="text-amber-500" />} label="Thành tựu & Huy hiệu" desc="Xem tiến trình và badge đã đạt" />
        <MenuLink href="/feature-requests" icon={<Lightbulb size={18} className="text-amber-500" />} label="Đề xuất tính năng" desc="Góp ý & vote tính năng bạn muốn bên mình làm" />
        <MenuLink href="/marketplace" icon={<ShoppingBag size={18} className="text-green-500" />} label="Chợ đồ thể thao" desc="Mua bán đồ cũ, tìm deals" />
        <MenuLink href="/profile/premium" icon={<Crown size={18} className="text-yellow-500" />} label={user.is_premium ? 'Premium đang hoạt động' : 'Nâng cấp Premium'} desc={user.is_premium ? 'Radar, ưu tiên hiển thị, crown badge' : 'Radar tự động, ưu tiên hiển thị, badge Crown'} premium={!user.is_premium} active={user.is_premium} />
        {user.is_premium && (
          <MenuLink href="/profile/radar" icon={<span className="text-lg">🎯</span>} label="Radar của tôi" desc="Quản lý radar tự động tìm trận" />
        )}
        <MenuLink href="/profile/views" icon={<Eye size={18} className="text-indigo-500" />} label="Ai đã xem hồ sơ bạn" desc={user.is_premium ? '30 ngày gần nhất · Premium' : 'Xem số lượt xem · chi tiết cần Premium'} />
        <MenuLink href="/profile/stats" icon={<BarChart2 size={18} className="text-purple-500" />} label="Thống kê của tôi" desc={user.is_premium ? 'Phân tích chuyên sâu hoạt động thể thao' : 'Tổng quan miễn phí · phân tích đầy đủ cần Premium'} />
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

function MenuLink({ href, icon, label, desc, premium, active }: { href: string; icon: React.ReactNode; label: string; desc: string; premium?: boolean; active?: boolean }) {
  return (
    <a href={href} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors ${active ? 'bg-amber-50/50' : ''}`}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {premium && (
            <span className="rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-1.5 py-px text-[8px] font-bold text-gray-900">PRO</span>
          )}
          {active && (
            <span className="rounded-full bg-amber-100 border border-amber-300 px-1.5 py-px text-[8px] font-bold text-amber-700">👑 ACTIVE</span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 truncate">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-gray-300 shrink-0" />
    </a>
  )
}
