'use client'

import { useState, useEffect } from 'react'
import { Loader2, ChevronUp, Plus, Lightbulb, X } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface FeatureRequest {
  id: number
  title: string
  description: string
  status: string
  score: number
  vote_count: number
  has_voted: boolean
  author_name?: string
  created_at: string
}

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN:        { label: 'Đang mở',     cls: 'bg-gray-100 text-gray-600' },
  PLANNED:     { label: 'Đã lên kế hoạch', cls: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'Đang làm',    cls: 'bg-amber-100 text-amber-700' },
  DONE:        { label: 'Hoàn thành',  cls: 'bg-green-100 text-green-700' },
  DECLINED:    { label: 'Từ chối',     cls: 'bg-red-50 text-red-600' },
}

export default function FeatureRequestsPage() {
  const [list, setList] = useState<FeatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'top' | 'new'>('top')
  const [showForm, setShowForm] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  function load(s: 'top' | 'new' = sort) {
    setLoading(true)
    apiFetch<{ requests: FeatureRequest[] }>(`/feature-requests?sort=${s}`)
      .then((d) => setList(d.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(sort) /* eslint-disable-next-line */ }, [sort])

  async function vote(id: number) {
    setBusyId(id)
    try {
      const d = await apiFetch<{ request: FeatureRequest }>(`/feature-requests/${id}/vote`, { method: 'POST' })
      setList((prev) => prev.map((r) => (r.id === id ? d.request : r)))
    } catch (err: any) {
      toast.error(err.message || 'Lỗi')
    } finally { setBusyId(null) }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Lightbulb size={20} className="text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900">Đề xuất tính năng</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 rounded-xl bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600">
          <Plus size={14} /> Đề xuất
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">Đề xuất tính năng bạn muốn — nhiều vote & hữu ích thì bên mình sẽ làm. Vote của tài khoản Premium nặng hơn.</p>

      <div className="flex gap-2 mb-4">
        {(['top', 'new'] as const).map((s) => (
          <button key={s} onClick={() => setSort(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${sort === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {s === 'top' ? '🔥 Nhiều vote' : '🆕 Mới nhất'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-green-500" size={22} /></div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">Chưa có đề xuất nào. Hãy là người đầu tiên!</div>
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const st = STATUS[r.status] || STATUS.OPEN
            return (
              <div key={r.id} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-3">
                <button
                  onClick={() => vote(r.id)}
                  disabled={busyId === r.id}
                  className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-xl border py-2 transition-colors ${
                    r.has_voted ? 'border-green-400 bg-green-50 text-green-600' : 'border-gray-200 text-gray-500 hover:border-green-300'
                  }`}
                >
                  <ChevronUp size={18} />
                  <span className="text-sm font-bold">{r.score}</span>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                  </div>
                  {r.description && <p className="text-xs text-gray-600 mt-0.5 line-clamp-3">{r.description}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{r.vote_count} người vote · đề xuất bởi {r.author_name || 'ẩn danh'}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && <NewRequestModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); setSort('new'); load('new') }} />}
    </div>
  )
}

function NewRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (title.trim().length < 5) { toast.error('Tiêu đề cần ít nhất 5 ký tự'); return }
    setSubmitting(true)
    try {
      await apiFetch('/feature-requests', { method: 'POST', json: { title: title.trim(), description: description.trim() } })
      toast.success('Đã gửi đề xuất! 🎉')
      onCreated()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">Đề xuất tính năng mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <label className="text-xs font-medium text-gray-700">Tiêu đề</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150}
          placeholder="VD: Thêm bộ lọc theo giá sân"
          className="mt-1 mb-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400" />
        <label className="text-xs font-medium text-gray-700">Mô tả (tuỳ chọn)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000}
          placeholder="Mô tả tính năng và vì sao nó hữu ích..."
          className="mt-1 mb-4 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-green-400" />
        <button onClick={submit} disabled={submitting}
          className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-50">
          {submitting ? 'Đang gửi...' : 'Gửi đề xuất'}
        </button>
      </div>
    </div>
  )
}
