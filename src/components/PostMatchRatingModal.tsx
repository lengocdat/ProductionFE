'use client'

import { useState } from 'react'
import { X, Star, AlertTriangle, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'

const NEGATIVE_REASONS = [
  { id: 'cancel_late', label: 'Hủy trận sát giờ (< 2 tiếng)' },
  { id: 'no_show', label: 'Không đến sân và không thông báo' },
  { id: 'toxic', label: 'Thái độ phi thể thao / gây gổ' },
  { id: 'other', label: 'Khác' },
]

interface Props {
  matchId: number
  rateeId: number
  rateeUsername: string
  rateeRole: 'Host' | 'Người chơi'
  onClose: () => void
  onSuccess?: () => void
}

export default function PostMatchRatingModal({ matchId, rateeId, rateeUsername, rateeRole, onClose, onSuccess }: Props) {
  const [stars, setStars] = useState(0)
  const [hoverStar, setHoverStar] = useState(0)
  const [isNegative, setIsNegative] = useState(false)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [reviewText, setReviewText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleToggleNegative() {
    const next = !isNegative
    setIsNegative(next)
    if (next) {
      setStars(1) // Lock to 1 star when reporting
    } else {
      setStars(0)
      setSelectedReasons([])
      setReviewText('')
    }
  }

  function handleReasonToggle(reasonId: string) {
    setSelectedReasons((prev) =>
      prev.includes(reasonId) ? prev.filter((r) => r !== reasonId) : [...prev, reasonId]
    )
  }

  async function handleSubmit() {
    // Validation
    if (!isNegative && stars === 0) {
      setError('Vui lòng chọn số sao đánh giá')
      return
    }
    if (isNegative && selectedReasons.length === 0) {
      setError('Vui lòng chọn ít nhất 1 lý do báo cáo')
      return
    }
    if (isNegative && reviewText.trim().length < 10) {
      setError('Vui lòng mô tả chi tiết (ít nhất 10 ký tự)')
      return
    }

    setLoading(true)
    setError('')

    const review = isNegative
      ? `[${selectedReasons.map((r) => NEGATIVE_REASONS.find((n) => n.id === r)?.label).join(', ')}] ${reviewText}`
      : reviewText

    try {
      await apiFetch('/ratings', {
        method: 'POST',
        json: {
          match_id: matchId,
          ratee_id: rateeId,
          stars: isNegative ? 1 : stars,
          is_negative: isNegative,
          review_text: review.trim(),
        },
      })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const displayStars = isNegative ? 1 : (hoverStar || stars)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">Đánh giá sau trận</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Target User */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
              {rateeUsername.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Đánh giá {rateeRole} {rateeUsername}</p>
              <p className="text-[11px] text-gray-500">Trận #{matchId}</p>
            </div>
          </div>

          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Chất lượng trải nghiệm</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isNegative}
                  onMouseEnter={() => !isNegative && setHoverStar(s)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => !isNegative && setStars(s)}
                  className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed"
                >
                  <Star
                    size={28}
                    className={`transition-colors ${
                      s <= displayStars
                        ? isNegative
                          ? 'text-red-400 fill-red-400'
                          : 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-medium text-gray-500">
                {displayStars > 0 ? `${displayStars}/5` : '—'}
              </span>
            </div>
            {isNegative && (
              <p className="text-[10px] text-red-500 mt-1">⚠️ Đánh giá tự động giảm về 1 sao khi báo cáo tiêu cực</p>
            )}
          </div>

          {/* Toxic Behavior Toggle */}
          <div className="rounded-xl border border-gray-200 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className={isNegative ? 'text-red-500' : 'text-gray-400'} />
                <span className="text-sm font-medium text-gray-700">Báo cáo hành vi tiêu cực</span>
              </div>
              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleNegative}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
                  isNegative ? 'bg-red-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isNegative ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Bùng trận, thái độ tệ, không đến sân...</p>
          </div>

          {/* Conditional: Negative Report Details */}
          {isNegative && (
            <div className="space-y-3 animate-in slide-in-from-top-2">
              {/* Reason Checklist */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Lý do báo cáo <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {NEGATIVE_REASONS.map((reason) => (
                    <label
                      key={reason.id}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all ${
                        selectedReasons.includes(reason.id)
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReasons.includes(reason.id)}
                        onChange={() => handleReasonToggle(reason.id)}
                        className="h-4 w-4 rounded border-gray-300 text-red-500 focus:ring-red-400"
                      />
                      <span className="text-xs text-gray-700">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Mandatory Feedback */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Mô tả chi tiết <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  placeholder="Mô tả cụ thể tình huống xảy ra (tối thiểu 10 ký tự)..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-red-300 focus:ring-1 focus:ring-red-100"
                />
                <p className="text-[10px] text-gray-400 mt-0.5 text-right">{reviewText.length} ký tự</p>
              </div>
            </div>
          )}

          {/* Optional review for positive ratings */}
          {!isNegative && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Nhận xét (tùy chọn)</label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={2}
                placeholder="Chia sẻ trải nghiệm của bạn..."
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg py-2">{error}</p>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-2 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-50 ${
              isNegative
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isNegative ? (
              '⚠️ Gửi báo cáo'
            ) : (
              '✅ Gửi đánh giá'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
