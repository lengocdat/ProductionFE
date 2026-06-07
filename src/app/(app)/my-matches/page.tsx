'use client'

import { useState, useEffect } from 'react'
import { Clock, MapPin, Users, Loader2, Ban, MessageSquare, Star } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import PostMatchRatingModal from '@/components/PostMatchRatingModal'

interface MatchInfo {
  id: number
  title: string
  address: string
  match_date: string
  start_time: string
  end_time: string
  filled_slots: number
  max_slots: number
  price_per_slot: number
  cancellation_window_hours: number
  status: string
  court_name?: string
  court_number?: number
  host?: { id: number; username: string }
}

interface PendingRating {
  match_id: number
  match_title: string
  host_id: number
  host_username: string
}

interface MyRequest {
  id: number
  match_id: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  deposit_amount: number
  deposit_status: string
  created_at: string
  match?: MatchInfo
}

const STATUS_BADGE: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-700' },
  ACCEPTED: { label: 'Đã tham gia', class: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Bị từ chối', class: 'bg-red-100 text-red-600' },
  CANCELLED: { label: 'Đã hủy', class: 'bg-gray-100 text-gray-500' },
}

export default function MyMatchesPage() {
  const [requests, setRequests] = useState<MyRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  const [cancelTarget, setCancelTarget] = useState<MyRequest | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([])
  const [ratingModal, setRatingModal] = useState<PendingRating | null>(null)
  const [ratedMatchIds, setRatedMatchIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([
      apiFetch<{ requests: MyRequest[] }>('/join-requests/my'),
      apiFetch<{ pending: PendingRating[] }>('/ratings/pending'),
    ])
      .then(([reqData, ratingData]) => {
        setRequests(reqData.requests || [])
        const pending = ratingData.pending || []
        setPendingRatings(pending)
        // Auto-prompt first pending rating
        if (pending.length > 0) setRatingModal(pending[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const upcoming = requests.filter(
    (r) => (r.status === 'PENDING' || r.status === 'ACCEPTED') && r.match?.status !== 'FINISHED'
  )
  const history = requests.filter(
    (r) => r.status === 'REJECTED' || r.status === 'CANCELLED' || r.match?.status === 'FINISHED'
  )
  const displayed = activeTab === 'upcoming' ? upcoming : history

  function canCancel(req: MyRequest): { allowed: boolean; reason?: string } {
    if (req.status !== 'ACCEPTED' && req.status !== 'PENDING') return { allowed: false, reason: 'Trạng thái không cho phép hủy' }
    if (!req.match) return { allowed: true }

    const match = req.match
    const [y, m, d] = match.match_date.split('-').map(Number)
    const [hh, mm] = match.start_time.slice(0, 5).split(':').map(Number)
    const matchStart = new Date(y, m - 1, d, hh, mm)
    const deadline = new Date(matchStart.getTime() - (match.cancellation_window_hours || 2) * 60 * 60 * 1000)

    if (new Date() > deadline) {
      return { allowed: false, reason: `Đã quá thời gian hủy (trước ${match.cancellation_window_hours}h)` }
    }
    return { allowed: true }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await apiFetch(`/matches/${cancelTarget.match_id}/requests/${cancelTarget.id}/cancel`, { method: 'POST' })
      toast.success('Đã hủy tham gia')
      setRequests((prev) => prev.map((r) => r.id === cancelTarget.id ? { ...r, status: 'CANCELLED' as const } : r))
      setCancelTarget(null)
    } catch (err: any) {
      toast.error(err.message || 'Không thể hủy')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="text-green-500 animate-spin" /></div>
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">🏸 Trận của tôi</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'upcoming' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Sắp diễn ra ({upcoming.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'history' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Lịch sử ({history.length})
        </button>
      </div>

      {/* Match List */}
      {displayed.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-2">{activeTab === 'upcoming' ? '📅' : '📋'}</p>
          <p className="text-sm text-gray-500">{activeTab === 'upcoming' ? 'Chưa tham gia trận nào' : 'Chưa có lịch sử'}</p>
          {activeTab === 'upcoming' && (
            <Link href="/feed" className="inline-block mt-3 text-xs text-green-600 font-medium hover:text-green-700">
              → Tìm trận gần bạn
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((req) => {
            const match = req.match
            const badge = STATUS_BADGE[req.status] || STATUS_BADGE.CANCELLED
            const cancelCheck = canCancel(req)

            return (
              <div key={req.id} className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm">
                {/* Match info */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{match?.title || `Trận #${req.match_id}`}</h3>
                    {match && (
                      <div className="space-y-0.5 mt-1">
                        <p className="text-[11px] text-gray-500 flex items-center gap-1"><MapPin size={10} /> {match.address}</p>
                        {match.court_name && <p className="text-[10px] text-blue-600">🏟️ {match.court_name}{match.court_number ? ` · Sân ${match.court_number}` : ''}</p>}
                        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Clock size={10} /> {match.match_date} · {match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Users size={10} /> {match.filled_slots}/{match.max_slots} slots {match.price_per_slot > 0 && `· ${match.price_per_slot.toLocaleString('vi-VN')}đ`}</p>
                        {match.host && (
                          <p className="text-[10px] text-gray-400">
                            Host:{' '}
                            <Link href={`/users/${match.host.id}`} className="text-green-600 font-medium hover:underline">
                              {match.host.username}
                            </Link>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${badge.class} ${req.status === 'PENDING' ? 'animate-pulse' : ''}`}>{badge.label}</span>
                </div>

                {/* Deposit status indicator */}
                {activeTab === 'upcoming' && req.deposit_amount > 0 && (
                  <div className="mb-2">
                    {req.deposit_status === 'PENDING' && (
                      <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-2.5 py-2">
                        <p className="text-[10px] text-red-700 font-semibold">⚠️ Chưa chuyển cọc ({req.deposit_amount.toLocaleString('vi-VN')}đ)</p>
                        <Link href={`/matches/${req.match_id}`} className="text-[10px] font-bold text-red-600 underline underline-offset-2">Chuyển ngay →</Link>
                      </div>
                    )}
                    {req.deposit_status === 'PENDING_VERIFICATION' && (
                      <p className="text-[10px] text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5">
                        💳 Đã CK {req.deposit_amount.toLocaleString('vi-VN')}đ · Chờ Host xác nhận
                      </p>
                    )}
                    {req.deposit_status === 'PAID' && (
                      <p className="text-[10px] text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">
                        ✅ Cọc {req.deposit_amount.toLocaleString('vi-VN')}đ đã được xác nhận
                      </p>
                    )}
                    {req.deposit_status === 'REFUNDED' && (
                      <p className="text-[10px] text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                        💸 Hoàn cọc {req.deposit_amount.toLocaleString('vi-VN')}đ — kiểm tra tài khoản ngân hàng
                      </p>
                    )}
                  </div>
                )}

                {/* Cancellation deadline / Pending helper */}
                {activeTab === 'upcoming' && match && (
                  <div className="mb-2">
                    {req.status === 'PENDING' && (
                      <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">
                        ⏳ Đang chờ Host duyệt. Hệ thống sẽ tự hủy nếu không được duyệt trước giờ đá 1 tiếng.
                      </p>
                    )}
                    {req.status === 'ACCEPTED' && (() => {
                      const [y, m, d] = match.match_date.split('-').map(Number)
                      const [hh, mm] = match.start_time.slice(0, 5).split(':').map(Number)
                      const matchStart = new Date(y, m - 1, d, hh, mm)
                      const deadline = new Date(matchStart.getTime() - (match.cancellation_window_hours || 2) * 60 * 60 * 1000)
                      const now = new Date()
                      const canStillCancel = now < deadline
                      return canStillCancel ? (
                        <p className="text-[10px] text-green-600 bg-green-50 rounded-lg px-2.5 py-1.5">
                          ✅ Hủy miễn phí trước: <strong>{deadline.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</strong>
                        </p>
                      ) : (
                        <p className="text-[10px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">
                          ⚠️ Đã quá hạn hủy miễn phí. Hủy bây giờ sẽ mất cọc.
                        </p>
                      )
                    })()}
                  </div>
                )}

                {/* Actions */}
                {activeTab === 'upcoming' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {req.status === 'ACCEPTED' && (
                      <Link href={`/matches/${req.match_id}?tab=chat`} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <MessageSquare size={13} /> Nhắn tin
                      </Link>
                    )}
                    {cancelCheck.allowed ? (
                      <button
                        onClick={() => setCancelTarget(req)}
                        className="flex-1 rounded-xl border border-red-200 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Hủy tham gia
                      </button>
                    ) : (
                      <div className="flex-1 rounded-xl bg-gray-100 py-2 text-xs text-gray-400 text-center cursor-not-allowed" title={cancelCheck.reason}>
                        <Ban size={11} className="inline mr-1" />Không thể hủy
                      </div>
                    )}
                  </div>
                )}

                {/* History: rate finished match */}
                {activeTab === 'history' && req.match?.status === 'FINISHED' && req.status === 'ACCEPTED' && match?.host && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {ratedMatchIds.has(req.match_id) ? (
                      <p className="text-[11px] text-green-600 text-center">✅ Đã đánh giá</p>
                    ) : (
                      <button
                        onClick={() => setRatingModal({
                          match_id: req.match_id,
                          match_title: match.title,
                          host_id: match.host!.id,
                          host_username: match.host!.username,
                        })}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-yellow-50 border border-yellow-200 py-2 text-xs font-semibold text-yellow-700 hover:bg-yellow-100"
                      >
                        <Star size={13} className="fill-yellow-400 text-yellow-400" /> Đánh giá Host
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Post-match rating modal */}
      {ratingModal && (
        <PostMatchRatingModal
          matchId={ratingModal.match_id}
          rateeId={ratingModal.host_id}
          rateeUsername={ratingModal.host_username}
          rateeRole="Host"
          onClose={() => setRatingModal(null)}
          onSuccess={() => {
            setRatedMatchIds((prev) => new Set([...prev, ratingModal.match_id]))
            // Show next pending rating if any
            const next = pendingRatings.find(
              (p) => p.match_id !== ratingModal.match_id && !ratedMatchIds.has(p.match_id)
            )
            setRatingModal(next ?? null)
          }}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) setCancelTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hủy tham gia</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn hủy tham gia trận <strong>{cancelTarget?.match?.title}</strong>?
          </p>
          {cancelTarget && cancelTarget.deposit_amount > 0 && (
            (() => {
              const match = cancelTarget.match
              if (!match) return null
              const [y, m, d] = match.match_date.split('-').map(Number)
              const [hh, mm] = match.start_time.slice(0, 5).split(':').map(Number)
              const matchStart = new Date(y, m - 1, d, hh, mm)
              const deadline = new Date(matchStart.getTime() - (match.cancellation_window_hours || 2) * 60 * 60 * 1000)
              const isBeforeDeadline = new Date() < deadline
              return isBeforeDeadline ? (
                <div className="rounded-lg bg-green-50 border border-green-200 p-2.5 text-xs text-green-800">
                  ✅ Trận đấu vẫn trong khung giờ cho phép. Bạn sẽ được hoàn <strong>100% tiền cọc ({cancelTarget.deposit_amount.toLocaleString('vi-VN')}đ)</strong>.
                </div>
              ) : (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-800">
                  ⚠️ Đã quá hạn hủy quy định. Nếu tiếp tục hủy, bạn sẽ <strong>mất 100% tiền cọc ({cancelTarget.deposit_amount.toLocaleString('vi-VN')}đ)</strong>.
                </div>
              )
            })()
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild><Button variant="outline">Quay lại</Button></DialogClose>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
