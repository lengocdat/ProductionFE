'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics'

const BANK_BIN = '970436' // Vietcombank
const ACCOUNT_NO = '1018096384'
const ACCOUNT_NAME = 'LE NGOC DAT'
const BANK_LABEL = 'Vietcombank'
const PRESET_AMOUNTS = [20000, 50000, 100000]

function vietQrUrl(amount?: number) {
  const params = new URLSearchParams({ accountName: ACCOUNT_NAME, addInfo: 'Ung ho CoDuyen' })
  if (amount) params.set('amount', String(amount))
  return `https://img.vietqr.io/image/${BANK_BIN}-${ACCOUNT_NO}-compact2.png?${params.toString()}`
}

interface DonateCardProps {
  variant?: 'inline' | 'modal'
  title?: string
  message?: string
  onClose?: () => void
}

export default function DonateCard({ variant = 'inline', title, message, onClose }: DonateCardProps) {
  const [amount, setAmount] = useState<number | undefined>(undefined)
  const [copied, setCopied] = useState(false)

  function selectAmount(a: number) {
    const next = amount === a ? undefined : a
    setAmount(next)
    trackEvent('donate_amount_select', { amount: next ?? 0 })
  }

  function copyAccount() {
    navigator.clipboard.writeText(ACCOUNT_NO).then(() => {
      setCopied(true)
      toast.success('Đã copy số tài khoản')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const content = (
    <>
      <p className="text-lg font-extrabold text-gray-900 mb-1.5">{title || '☕ Ủng hộ mình duy trì app'}</p>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">
        {message ||
          'Mình làm app này một mình để tự học tiếng Anh rồi chia sẻ miễn phí cho mọi người. Nếu app giúp ích cho bạn, một ly cà phê nhỏ sẽ giúp mình trả tiền server và làm thêm bài học mới mỗi tuần 🙏'}
      </p>

      <div className="flex justify-center mb-4">
        <Image
          key={amount ?? 'default'}
          src={vietQrUrl(amount)}
          alt="Quét mã VietQR để ủng hộ"
          width={224}
          height={224}
          unoptimized
          className="w-56 h-auto rounded-2xl border border-gray-100"
        />
      </div>

      <div className="flex gap-2 justify-center mb-4">
        {PRESET_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => selectAmount(a)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
              amount === a ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-200 text-gray-600'
            }`}
          >
            {a / 1000}k
          </button>
        ))}
      </div>

      <button
        onClick={copyAccount}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-xs text-gray-500"
      >
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
        {ACCOUNT_NO} · {BANK_LABEL} · {ACCOUNT_NAME}
      </button>
    </>
  )

  if (variant === 'inline') {
    return <div className="rounded-3xl bg-white border border-gray-100 p-6 shadow-sm">{content}</div>
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end mb-1">
          <button onClick={onClose} aria-label="Đóng" className="text-gray-400 p-1">
            <X size={20} />
          </button>
        </div>
        {content}
        <button
          onClick={onClose}
          className="w-full mt-4 rounded-2xl bg-gray-900 py-3.5 text-sm font-bold text-white active:scale-[0.98] transition-transform"
        >
          Tiếp tục học →
        </button>
      </div>
    </div>
  )
}
