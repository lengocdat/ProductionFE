'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, AlertTriangle, Calendar, Shield, LogOut } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface User { id: number; username: string; email: string; role: string; tier: string; negative_reports: number; created_at: string }
interface Rating { id: number; stars: number; is_negative: boolean; review_text: string; created_at: string }

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ratings, setRatings] = useState<Rating[]>([])

  useEffect(() => {
    apiFetch<{ user: User }>('/auth/me').then((d) => {
      setUser(d.user)
      apiFetch<{ ratings: Rating[] }>(`/ratings/${d.user.id}`).then((r) => setRatings(r.ratings || [])).catch(() => {})
    })
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
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-600">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-lg font-bold text-gray-900">{user.username}</h1>
        <p className="text-xs text-gray-500">{user.email}</p>
        <div className="flex justify-center gap-2 mt-2">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-medium text-blue-700">
            {user.tier === 'VERIFIED_HOST' ? '✅ Uy tín' : user.tier === 'REGULAR' ? '👍 Thường xuyên' : '🆕 Mới'}
          </span>
        </div>
        {user.negative_reports > 3 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 p-2 text-xs text-red-700">
            <AlertTriangle size={13} /> {user.negative_reports} phiếu tiêu cực
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatCard icon={<Star size={16} className="text-yellow-500" />} value={avgStars} label="Đánh giá" />
        <StatCard icon={<Shield size={16} className="text-red-400" />} value={String(user.negative_reports)} label="Phiếu xấu" />
        <StatCard icon={<Calendar size={16} className="text-green-500" />} value={new Date(user.created_at).toLocaleDateString('vi-VN')} label="Tham gia" />
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
