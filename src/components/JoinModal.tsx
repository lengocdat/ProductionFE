'use client'

import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { apiFetch } from '@/lib/api'

interface SportMatch {
  id: number
  title: string
  address: string
  start_time: string
  end_time: string
  filled_slots: number
  max_slots: number
}

interface Props {
  match: SportMatch
  onClose: () => void
}

export default function JoinModal({ match, onClose }: Props) {
  const [message, setMessage] = useState(
    'Chào bạn, mình muốn đăng ký 1 slot giao lưu hôm nay. Trình độ của mình là Trung bình.'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin() {
    setLoading(true)
    setError('')
    try {
      await apiFetch('/join-requests', {
        method: 'POST',
        json: { match_id: match.id, message },
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-5 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Xác nhận tham gia</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 mb-4 text-sm">
          <p className="font-semibold">{match.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{match.address}</p>
          <p className="text-xs text-gray-600 mt-1">🕐 {match.start_time} - {match.end_time} | 👥 {match.filled_slots}/{match.max_slots}</p>
        </div>

        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tin nhắn gửi Host:</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:border-green-400 outline-none"
        />

        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
            Hủy
          </button>
          <button
            onClick={handleJoin}
            disabled={loading || !message.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            <Send size={14} /> {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </div>
      </div>
    </div>
  )
}
