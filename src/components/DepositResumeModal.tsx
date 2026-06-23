'use client'

import { useEffect, useRef, useState } from 'react'
import { CreditCard, QrCode, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PaymentInfo {
  order_id: string
  bank_name: string
  account_number: string
  account_holder: string
  amount: number
  transfer_content: string
  qr_code_url: string
}

interface DepositInfo {
  request_id: number
  deposit_status: string
  deposit_amount: number
  payment?: PaymentInfo
}

interface Props {
  requestId: number
  onClose: () => void
  onPaid?: () => void
}

// DepositResumeModal lets a player reopen an unpaid deposit (e.g. after tapping "để sau"),
// fetching fresh transfer/QR details from the backend and polling for auto-confirmation.
export default function DepositResumeModal({ requestId, onClose, onPaid }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<DepositInfo | null>(null)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiFetch<DepositInfo>(`/join-requests/${requestId}/deposit-info`)
      .then((d) => {
        if (cancelled) return
        setInfo(d)
        if (d.deposit_status === 'PAID' || d.deposit_status === 'WAIVED_APPROVED') {
          setPaid(true)
          return
        }
        // P2P: deposit goes straight to the host's bank — there is no platform auto-detection.
        // Confirmation is manual (player taps "Tôi đã chuyển" → host approves).
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Không tải được thông tin thanh toán') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [requestId, onPaid])

  const pay = info?.payment

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-md">
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-green-500" size={24} /></div>
        ) : error ? (
          <>
            <DialogHeader><DialogTitle>Không thể thanh toán</DialogTitle></DialogHeader>
            <p className="text-sm text-red-600">{error}</p>
            <DialogFooter><Button onClick={onClose} className="w-full">Đóng</Button></DialogFooter>
          </>
        ) : paid ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 size={18} /> Cọc đã được xác nhận!</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-sm text-gray-700 font-semibold">Hệ thống đã xác nhận khoản cọc của bạn</p>
              <p className="text-xs text-gray-500 mt-1">Đợi Host duyệt yêu cầu nhé!</p>
            </div>
            <DialogFooter><Button onClick={onClose} className="w-full bg-green-500 hover:bg-green-600">Đóng</Button></DialogFooter>
          </>
        ) : !pay ? (
          <>
            <DialogHeader><DialogTitle>Không cần thanh toán</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600">Khoản cọc này không còn cần thanh toán (trạng thái: {info?.deposit_status}).</p>
            <DialogFooter><Button onClick={onClose} className="w-full">Đóng</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><CreditCard size={18} /> Tiếp tục chuyển cọc</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1.5">
                <p className="text-xs text-blue-600 font-medium">Thông tin chuyển khoản:</p>
                <p className="text-sm font-semibold text-blue-900">{pay.account_holder}</p>
                <p className="text-sm text-blue-800">{pay.bank_name} · {pay.account_number}</p>
                <p className="text-sm font-bold text-blue-900">{pay.amount.toLocaleString('vi-VN')}đ</p>
                <div className="pt-1.5 border-t border-blue-200 mt-2">
                  <p className="text-[10px] text-blue-600">Nội dung CK (bắt buộc):</p>
                  <p className="text-xs font-mono font-bold text-blue-900 bg-blue-100 rounded px-2 py-1 mt-0.5">{pay.transfer_content}</p>
                </div>
              </div>

              {pay.qr_code_url && (
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 mb-1.5 flex items-center justify-center gap-1"><QrCode size={11} /> Quét mã QR:</p>
                  <img src={pay.qr_code_url} alt="VietQR" className="mx-auto w-48 h-48 rounded-lg border" />
                </div>
              )}

              <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5"><AlertTriangle size={13} /> Kiểm tra trước khi chuyển</p>
                <p className="text-[11px] text-orange-700 leading-relaxed mt-0.5">
                  Xác nhận tên chủ tài khoản là <span className="font-bold text-orange-900">"{pay.account_holder}"</span>. Nếu không khớp, đừng chuyển và báo cáo ngay.
                </p>
              </div>

              <div className="text-center text-[11px] text-gray-500">
                Sau khi chuyển vào tài khoản Host, bấm <span className="font-semibold text-gray-700">"Tôi đã chuyển"</span> để Host xác nhận.
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  // Mark as transferred so the host can verify even if auto-detection misses it.
                  try {
                    await apiFetch(`/join-requests/${requestId}/submit-payment`, { method: 'POST', json: { proof_url: '' } })
                    toast.success('Đã báo Host kiểm tra chuyển khoản')
                    onPaid?.()
                    onClose()
                  } catch (err: any) {
                    toast.error(err.message || 'Lỗi')
                  }
                }}
              >
                Tôi đã chuyển
              </Button>
              <Button variant="outline" className="flex-1" onClick={onClose}>Để sau</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
