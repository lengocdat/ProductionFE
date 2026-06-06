'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Radar, Search, MapPin, Trash2, Loader2, Plus, Crown, ChevronDown } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import Link from 'next/link'

interface PremiumRadar {
  id: number
  keyword: string
  category: 'KEO_DAU' | 'DO_CU'
  max_price?: number
  location?: string
  is_active: boolean
  created_at: string
}

const CATEGORY_LABEL = { KEO_DAU: '🏸 Kèo đấu', DO_CU: '🛍️ Đồ cũ' }
const LOCATIONS = ['Toàn quốc', 'Hà Nội', 'TP. HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng']

export default function RadarPage() {
  const router = useRouter()
  const [radars, setRadars] = useState<PremiumRadar[]>([])
  const [loading, setLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<'KEO_DAU' | 'DO_CU'>('KEO_DAU')
  const [maxPrice, setMaxPrice] = useState(500000)
  const [location, setLocation] = useState('Toàn quốc')

  useEffect(() => {
    Promise.all([
      apiFetch<{ user: { is_premium: boolean } }>('/auth/me'),
      apiFetch<{ radars: PremiumRadar[] }>('/premium/radars').catch(() => ({ radars: [] })),
    ]).then(([me, rd]) => {
      setIsPremium(me.user.is_premium)
      setRadars(rd.radars || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!keyword.trim()) { toast.error('Nhập từ khoá tìm kiếm'); return }
    setCreating(true)
    try {
      const d = await apiFetch<{ radar: PremiumRadar }>('/premium/radars', {
        method: 'POST',
        json: { keyword: keyword.trim(), category, max_price: maxPrice, location },
      })
      setRadars(prev => [d.radar, ...prev])
      setKeyword('')
      setShowForm(false)
      toast.success('Đã tạo radar!')
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally { setCreating(false) }
  }

  async function handleToggle(radar: PremiumRadar) {
    const newVal = !radar.is_active
    setRadars(prev => prev.map(r => r.id === radar.id ? { ...r, is_active: newVal } : r))
    try {
      await apiFetch(`/premium/radars/${radar.id}/toggle`, {
        method: 'PATCH',
        json: { is_active: newVal },
      })
    } catch {
      setRadars(prev => prev.map(r => r.id === radar.id ? { ...r, is_active: !newVal } : r))
      toast.error('Không thể cập nhật')
    }
  }

  async function handleDelete(id: number) {
    setRadars(prev => prev.filter(r => r.id !== id))
    try {
      await apiFetch(`/premium/radars/${id}`, { method: 'DELETE' })
      toast.success('Đã xoá radar')
    } catch {
      toast.error('Không thể xoá')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 size={24} className="animate-spin text-amber-400" />
      </div>
    )
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
          <Crown size={28} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Tính năng Premium</h1>
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Radar tự động chỉ dành cho thành viên Premium. Nâng cấp để nhận thông báo ngay khi có kèo đấu hoặc đồ cũ phù hợp với bạn.
        </p>
        <Link
          href="/profile/premium"
          className="rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-3.5 text-sm font-bold text-gray-900"
        >
          Nâng cấp Premium ngay
        </Link>
        <button onClick={() => router.back()} className="mt-4 text-sm text-gray-500">
          Quay lại
        </button>
      </div>
    )
  }

  const activeCount = radars.filter(r => r.is_active).length

  return (
    <div className="min-h-screen bg-gray-950 pb-safe">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-800/60 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Radar size={16} className="text-amber-400" /> Radar Thông Minh
          </h1>
          <p className="text-[10px] text-gray-500">
            {activeCount} đang hoạt động · tối đa 5 radar
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-gray-900"
        >
          <Plus size={13} /> Thêm
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* How it works */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-bold text-amber-400 mb-1">⚡ Hoạt động như thế nào?</p>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Khi có kèo đấu hoặc đồ cũ mới khớp với tiêu chí của bạn, hệ thống sẽ gửi thông báo ngay lập tức. Bạn không cần phải liên tục mở app để kiểm tra.
          </p>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="rounded-2xl border border-amber-500/25 bg-gray-900 p-4 space-y-3">
            <p className="text-xs font-bold text-white mb-1">Tạo radar mới</p>

            {/* Keyword */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 block">Từ khoá</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="VD: Cầu lông trình TB, Giày Nike size 42..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            {/* Category */}
            <div className="flex gap-2">
              {(['KEO_DAU', 'DO_CU'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={clsx(
                    'flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all',
                    category === cat
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  )}
                >
                  {CATEGORY_LABEL[cat]}
                </button>
              ))}
            </div>

            {/* Max Price */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 flex justify-between">
                <span>Giá tối đa</span>
                <span className="text-amber-400 font-medium">{maxPrice.toLocaleString('vi-VN')}đ</span>
              </label>
              <input
                type="range" min={0} max={5000000} step={50000} value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full h-1.5 rounded-full cursor-pointer accent-amber-500"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-[11px] text-gray-500 mb-1.5 block">Khu vực</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full appearance-none pl-9 pr-8 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none"
                >
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-400"
              >
                Huỷ
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-sm font-bold text-gray-900 disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Radar size={14} />}
                {creating ? 'Đang tạo...' : 'Tạo Radar'}
              </button>
            </div>
          </div>
        )}

        {/* Radar list */}
        {radars.length === 0 ? (
          <div className="text-center py-10">
            <Radar size={40} className="text-gray-700 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Chưa có radar nào</p>
            <p className="text-[11px] text-gray-600 mt-1">Nhấn "Thêm" để tạo radar đầu tiên</p>
          </div>
        ) : (
          <div className="space-y-2">
            {radars.map(radar => (
              <div
                key={radar.id}
                className={clsx(
                  'rounded-2xl border p-4 flex items-center gap-3 transition-all',
                  radar.is_active ? 'border-amber-500/20 bg-gray-900' : 'border-gray-800 bg-gray-900/50 opacity-60'
                )}
              >
                <div className={clsx(
                  'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                  radar.is_active ? 'bg-amber-500/15' : 'bg-gray-800'
                )}>
                  <Radar size={16} className={radar.is_active ? 'text-amber-400' : 'text-gray-500'} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{radar.keyword}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {CATEGORY_LABEL[radar.category]}
                    {radar.max_price ? ` · ≤${radar.max_price.toLocaleString('vi-VN')}đ` : ''}
                    {radar.location ? ` · ${radar.location}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(radar)}
                    className={clsx(
                      'relative w-10 h-5 rounded-full transition-colors',
                      radar.is_active ? 'bg-amber-500' : 'bg-gray-700'
                    )}
                  >
                    <span className={clsx(
                      'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                      radar.is_active ? 'left-5' : 'left-0.5'
                    )} />
                  </button>
                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(radar.id)}
                    className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-[10px] text-gray-700">
          Radar sẽ gửi thông báo qua mục Thông báo trong app
        </p>
      </div>
    </div>
  )
}
