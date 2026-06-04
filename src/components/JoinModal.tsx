'use client'

import { useState } from 'react'
import { Send, CreditCard, QrCode } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SportMatch {
  id: number
  title: string
  address: string
  start_time: string
  end_time: string
  filled_slots: number
  max_slots: number
  price_per_slot?: number
  cancellation_window_hours?: number
  bank_name?: string
  bank_account_number?: string
  bank_account_holder?: string
}

interface Props {
  match: SportMatch
  onClose: () => void
}

export default function JoinModal({ match, onClose }: Props) {
  const [message, setMessage] = useState(
    'Chào bạn, mình muốn đăng ký 1 slot giao lưu. Trình độ của mình là Trung bình.'
  )
  const [waiveDeposit, setWaiveDeposit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPaymentStep, setShowPaymentStep] = useState(false)
  const [requestId, setRequestId] = useState<number | null>(null)

  const hasDeposit = (match.price_per_slot ?? 0) > 0
  const hasBankInfo = match.bank_name && match.bank_account_number

  async function handleJoin() {
    setLoading(true)
    try {
      const res = await apiFetch<{ request: { id: number } }>('/join-requests', {
        method: 'POST',
        json: { match_id: match.id, message, waive_deposit: waiveDeposit },
      })
      setRequestId(res.request.id)

      if (hasDeposit && !waiveDeposit && hasBankInfo) {
        // Show payment step
        setShowPaymentStep(true)
        toast.success('Yêu cầu đã gửi! Vui lòng chuyển khoản cọc.')
      } else {
        toast.success('Đăng ký thành công! 🎉 Đợi Host duyệt.')
        onClose()
      }
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  async function handlePaymentConfirm() {
    if (!requestId) return
    setLoading(true)
    try {
      await apiFetch(`/join-requests/${requestId}/submit-payment`, {
        method: 'POST',
        json: { proof_url: '' },
      })
      toast.success('Đã xác nhận chuyển khoản! Chờ Host kiểm tra.')
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Lỗi')
    } finally {
      setLoading(false)
    }
  }

  // VietQR link: https://img.vietqr.io/image/{bank}-{stk}-compact2.png?amount={amount}&addInfo={content}
  const transferContent = `APP ${requestId || 'NEW'} CODEP`
  const vietqrUrl = hasBankInfo
    ? `https://img.vietqr.io/image/${match.bank_name}-${match.bank_account_number}-compact2.png?amount=${match.price_per_slot}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(match.bank_account_holder || '')}`
    : null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        {!showPaymentStep ? (
          <>
            <DialogHeader>
              <DialogTitle>Xác nhận tham gia</DialogTitle>
            </DialogHeader>

            <div className="rounded-xl bg-gray-50 p-3 text-sm">
              <p className="font-semibold">{match.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{match.address}</p>
              <p className="text-xs text-gray-600 mt-1">🕐 {match.start_time.slice(0, 5)} - {match.end_time.slice(0, 5)} | 👥 {match.filled_slots}/{match.max_slots}</p>
            </div>

            {/* Deposit Warning + Waive Option */}
            {hasDeposit && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800">💰 Phí tham gia: {match.price_per_slot!.toLocaleString('vi-VN')}đ</p>
                <p className="text-[10px] text-amber-700">
                  {match.cancellation_window_hours
                    ? `Hủy sau ${match.cancellation_window_hours}h trước giờ đá → mất cọc.`
                    : 'Hủy sau thời hạn quy định → mất cọc.'}
                </p>
                
                {/* Waive deposit toggle */}
                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waiveDeposit}
                    onChange={(e) => setWaiveDeposit(e.target.checked)}
                    className="rounded border-amber-300 text-amber-500 focus:ring-amber-200"
                  />
                  <span className="text-[11px] text-amber-800">Xin tham gia không cọc (dựa trên uy tín)</span>
                </label>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tin nhắn gửi Host:</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:border-green-400 outline-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1">Hủy</Button>
              </DialogClose>
              <Button
                onClick={handleJoin}
                disabled={loading || !message.trim()}
                className="flex-1 bg-green-500 hover:bg-green-600"
              >
                <Send size={14} className="mr-1" /> {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Payment Step */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CreditCard size={18} /> Chuyển khoản cọc</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Bank Info */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1.5">
                <p className="text-xs text-blue-600 font-medium">Thông tin chuyển khoản:</p>
                <p className="text-sm font-semibold text-blue-900">{match.bank_account_holder}</p>
                <p className="text-sm text-blue-800">{match.bank_name} · {match.bank_account_number}</p>
                <p className="text-sm font-bold text-blue-900">{match.price_per_slot?.toLocaleString('vi-VN')}đ</p>
                <div className="pt-1.5 border-t border-blue-200 mt-2">
                  <p className="text-[10px] text-blue-600">Nội dung CK:</p>
                  <p className="text-xs font-mono font-bold text-blue-900 bg-blue-100 rounded px-2 py-1 mt-0.5">
                    APP {requestId} CODEP
                  </p>
                </div>
              </div>

              {/* VietQR */}
              {vietqrUrl && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1.5 flex items-center justify-center gap-1"><QrCode size={11} /> Quét mã QR:</p>
                  <img src={vietqrUrl} alt="VietQR" className="mx-auto w-48 h-48 rounded-lg border" />
                </div>
              )}

              <p className="text-[10px] text-gray-500 text-center">Sau khi chuyển khoản xong, bấm xác nhận bên dưới</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Để sau</Button>
              <Button onClick={handlePaymentConfirm} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600">
                {loading ? 'Đang xử lý...' : '✅ Tôi đã chuyển khoản'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
