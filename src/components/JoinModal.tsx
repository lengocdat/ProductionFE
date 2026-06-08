'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, CreditCard, QrCode, ShieldCheck, ShieldAlert, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
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
  bank_verified?: boolean
  bank_updated_at?: string
}

interface Props {
  match: SportMatch
  onClose: () => void
}

interface PaymentInfo {
  order_id: string
  bank_name: string
  account_number: string
  account_holder: string
  amount: number
  transfer_content: string
  qr_code_url: string
}

export default function JoinModal({ match, onClose }: Props) {
  const [message, setMessage] = useState(
    'Chào bạn, mình muốn đăng ký 1 slot giao lưu. Trình độ của mình là Trung bình.'
  )
  const [waiveDeposit, setWaiveDeposit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPaymentStep, setShowPaymentStep] = useState(false)
  const [requestId, setRequestId] = useState<number | null>(null)
  const [payInfo, setPayInfo] = useState<PaymentInfo | null>(null)
  const [payStatus, setPayStatus] = useState<'pending' | 'paid'>('pending')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCountRef = useRef(0)

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const hasDeposit = (match.price_per_slot ?? 0) > 0
  const hasBankInfo = match.bank_name && match.bank_account_number

  async function handleJoin() {
    setLoading(true)
    try {
      const res = await apiFetch<{ request: { id: number } }>('/join-requests', {
        method: 'POST',
        json: { match_id: match.id, message, waive_deposit: waiveDeposit },
      })
      const reqId = res.request.id
      setRequestId(reqId)

      if (hasDeposit && !waiveDeposit) {
        // Create SePay deposit order and start auto-polling
        try {
          const info = await apiFetch<PaymentInfo>('/payment/deposit', {
            method: 'POST',
            json: { join_request_id: reqId, amount: match.price_per_slot },
          })
          setPayInfo(info)
          // Poll payment status every 4s for up to 5 min (75 polls)
          pollCountRef.current = 0
          pollRef.current = setInterval(async () => {
            pollCountRef.current += 1
            if (pollCountRef.current > 75) { clearInterval(pollRef.current!); return }
            try {
              const { status } = await apiFetch<{ status: string }>(`/payment/status/${info.order_id}`)
              if (status === 'PAID') { clearInterval(pollRef.current!); setPayStatus('paid') }
            } catch { /* ignore */ }
          }, 4000)
        } catch {
          // Deposit API failed — show manual bank info without auto-polling
        }
        setShowPaymentStep(true)
        toast.success('Yêu cầu đã gửi! Vui lòng quét mã QR để đặt cọc.')
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

  // Use SePay-generated QR if available, else build from match bank info
  const vietqrUrl = payInfo?.qr_code_url || (hasBankInfo
    ? `https://img.vietqr.io/image/${match.bank_name}-${match.bank_account_number}-compact2.png?amount=${match.price_per_slot}&addInfo=${encodeURIComponent(`CODEP ${requestId || ''}`)}&accountName=${encodeURIComponent(match.bank_account_holder || '')}`
    : null)
  const transferContent = payInfo?.transfer_content || `CODEP ${requestId || ''}`

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
        ) : payStatus === 'paid' ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 size={18} /> Đặt cọc thành công!</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-sm text-gray-700 font-semibold">Hệ thống đã xác nhận chuyển khoản</p>
              <p className="text-xs text-gray-500 mt-1">Đợi Host duyệt yêu cầu của bạn!</p>
            </div>
            <DialogFooter>
              <Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600">Đóng</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Payment Step */}
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CreditCard size={18} /> Chuyển khoản cọc</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              {/* Bank Info with verification badge */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-blue-600 font-medium">Thông tin chuyển khoản:</p>
                  {match.bank_verified ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={11} /> Đã xác minh
                    </span>
                  ) : match.bank_updated_at && (Date.now() - new Date(match.bank_updated_at).getTime()) < 7 * 24 * 60 * 60 * 1000 ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      <ShieldAlert size={11} /> Mới thay đổi
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={11} /> Chưa xác minh
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-blue-900">
                  {payInfo?.account_holder || match.bank_account_holder}
                </p>
                <p className="text-sm text-blue-800">
                  {payInfo?.bank_name || match.bank_name} · {payInfo?.account_number || match.bank_account_number}
                </p>
                <p className="text-sm font-bold text-blue-900">{match.price_per_slot?.toLocaleString('vi-VN')}đ</p>
                <div className="pt-1.5 border-t border-blue-200 mt-2">
                  <p className="text-[10px] text-blue-600">Nội dung CK (bắt buộc):</p>
                  <p className="text-xs font-mono font-bold text-blue-900 bg-blue-100 rounded px-2 py-1 mt-0.5">
                    {transferContent}
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

              {/* Name-match safety warning */}
              {(payInfo?.account_holder || match.bank_account_holder) && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Kiểm tra trước khi chuyển
                  </p>
                  <p className="text-[11px] text-orange-700 leading-relaxed">
                    Xác nhận tên chủ tài khoản hiển thị là{' '}
                    <span className="font-bold text-orange-900">"{payInfo?.account_holder || match.bank_account_holder}"</span>.
                    Nếu tên không khớp, đừng chuyển và báo cáo ngay.
                  </p>
                </div>
              )}

              {/* Auto-detection status */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
                <Loader2 size={12} className="animate-spin text-green-500" />
                Đang chờ xác nhận tự động từ ngân hàng...
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={onClose} className="w-full">Để sau (đóng)</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
