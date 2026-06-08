'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

const SPORTS = [
  { value: 'BADMINTON', label: '🏸 Cầu lông' },
  { value: 'FOOTBALL', label: '⚽ Bóng đá' },
  { value: 'TENNIS', label: '🎾 Tennis' },
  { value: 'PICKLEBALL', label: '🏓 Pickleball' },
  { value: 'BASKETBALL', label: '🏀 Bóng rổ' },
  { value: 'VOLLEYBALL', label: '🏐 Bóng chuyền' },
  { value: 'TABLE_TENNIS', label: '🏓 Bóng bàn' },
  { value: 'RUNNING', label: '🏃 Chạy bộ' },
]

export default function CreateClubPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '', sport_type: 'BADMINTON', description: '', city: '', is_public: true,
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await apiFetch<{ club: { id: number } }>('/clubs', {
        method: 'POST', json: form,
      })
      toast.success('Tạo CLB thành công!')
      router.push(`/clubs/${data.club.id}`)
    } catch (err: any) {
      toast.error(err.message || 'Tạo CLB thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 pt-3 pb-20 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/clubs" className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Tạo CLB mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Tên CLB *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required minLength={2} maxLength={100}
            placeholder="VD: CLB Cầu lông Quận 7"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Môn thể thao *</label>
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map(s => (
              <button key={s.value} type="button"
                onClick={() => setForm(f => ({ ...f, sport_type: s.value }))}
                className={`rounded-xl border px-3 py-2.5 text-xs font-medium text-left transition-all ${
                  form.sport_type === s.value
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Thành phố</label>
          <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="VD: Hồ Chí Minh"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400" />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Mô tả CLB</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="Giới thiệu về CLB, lịch tập, trình độ thành viên..."
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400 resize-none" />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 cursor-pointer hover:border-green-300">
          <input type="checkbox" checked={form.is_public}
            onChange={e => setForm(f => ({ ...f, is_public: e.target.checked }))}
            className="w-4 h-4 accent-green-500" />
          <div>
            <p className="text-sm font-medium text-gray-800">CLB công khai</p>
            <p className="text-[11px] text-gray-500">Ai cũng có thể tìm thấy và tham gia</p>
          </div>
        </label>

        <button type="submit" disabled={loading || !form.name}
          className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-green-200">
          {loading ? <Loader2 size={16} className="animate-spin" /> : '🏆 Tạo CLB'}
        </button>
      </form>
    </div>
  )
}
