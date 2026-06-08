'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Radar, Zap, Star, Shield, Users, Check, ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'
import Image from 'next/image'

interface UserMe {
  id: number
  username: string
  is_premium: boolean
  premium_expires_at?: string
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

const PLANS = [
  { id: 'monthly', label: 'Hàng tháng', price: 49000, unit: 'tháng', badge: null },
  { id: 'yearly',  label: 'Hàng năm',   price: 399000, unit: 'năm',   badge: 'Tiết kiệm 32%' },
] as const

const BENEFITS = [
  { icon: <Radar size={20} className="text-amber-400" />,  title: 'Radar Thông Minh',    desc: 'Nhận thông báo ngay khi xuất hiện trận đấu phù hợp.' },
  { icon: <Zap   size={20} className="text-amber-400" />,  title: 'Ưu Tiên Hiển Thị',   desc: 'Tin đăng luôn đầu feed, tăng gấp 3x lượt tiếp cận.' },
  { icon: <Crown size={20} className="text-amber-400" />,  title: 'Crown Badge',          desc: 'Khung vàng độc quyền và huy hiệu ⭐ Premium trên profile.' },
  { icon: <Star  size={20} className="text-amber-400" />,  title: 'Lọc Nâng Cao',        desc: 'Lọc trận theo khoảng cách, giá, giờ chính xác.' },
  { icon: <Shield size={20} className="text-amber-400" />, title: 'Nhãn Tin Cậy',        desc: 'Badge "Premium Member" tăng độ tin tưởng từ đối tác.' },
  { icon: <Users size={20} className="text-amber-400" />,  title: 'Xem Ai Xem Hồ Sơ',  desc: 'Biết ai đã ghé thăm profile trong 30 ngày gần nhất.' },
] as const

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`Đã copy ${label}`))
}

export default function PremiumPage() {
  const router = useRouter()
  const [user, setUser]           = useState<UserMe | null>(null)
  const [loading, setLoading]     = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [step, setStep]           = useState<'plans' | 'payment' | 'done'>('plans')
  const [paying, setPaying]       = useState(false)
  const [payInfo, setPayInfo]     = useState<PaymentInfo | null>(null)
  const [showFaq, setShowFaq]     = useState<number | null>(null)
  const pollRef                   = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    apiFetch<{ user: UserMe }>('/auth/me')
      .then(d => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const plan = PLANS.find(p => p.id === selectedPlan)!
  const isActive = user?.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date()
  const expiryFormatted = user?.premium_expires_at
    ? new Date(user.premium_expires_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  async function handleStartPayment() {
    setPaying(true)
    try {
      const info = await apiFetch<PaymentInfo>('/payment/premium', { method: 'POST' })
      setPayInfo(info)
      setStep('payment')
      // Poll every 4s for up to 15 min
      pollRef.current = setInterval(async () => {
        try {
          const { status } = await apiFetch<{ status: string }>(`/payment/status/${info.order_id}`)
          if (status === 'PAID') {
            clearInterval(pollRef.current!)
            setStep('done')
            setUser(prev => prev ? { ...prev, is_premium: true } : prev)
          }
        } catch { /* ignore */ }
      }, 4000)
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 size={24} className="animate-spin text-amber-400" />
      </div>
    )
  }

  // Already premium
  if (isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div className="rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent border border-amber-500/30 p-6 text-center mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-4">
            <Crown size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Bạn đang là</h1>
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-1.5 rounded-full mb-3">
            <Sparkles size={14} className="text-gray-900" />
            <span className="text-sm font-black text-gray-900">Premium Member</span>
          </div>
          <p className="text-gray-400 text-sm">
            Hiệu lực đến <span className="text-amber-400 font-bold">{expiryFormatted}</span>
          </p>
        </div>
        <div className="space-y-2 mb-6">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-900 border border-amber-500/20 px-4 py-3">
              <div className="shrink-0">{b.icon}</div>
              <span className="text-sm font-medium text-white">{b.title}</span>
              <Check size={14} className="ml-auto text-amber-400 shrink-0" />
            </div>
          ))}
        </div>
        <button onClick={() => router.back()} className="w-full rounded-2xl border border-gray-700 py-3.5 text-sm font-medium text-gray-400 hover:text-white hover:border-gray-500">
          Quay lại hồ sơ
        </button>
      </div>
    )
  }

  // Done
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-6">
          <Crown size={44} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 text-center">Chào mừng Premium!</h1>
        <p className="text-gray-400 text-sm text-center mb-8">Thanh toán thành công. Tận hưởng đầy đủ quyền lợi ngay bây giờ.</p>
        <button onClick={() => router.replace('/profile')} className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-sm font-black text-gray-900 shadow-lg shadow-amber-500/30">
          Về trang hồ sơ
        </button>
      </div>
    )
  }

  // Payment — show VietQR
  if (step === 'payment' && payInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-6">
        <button onClick={() => { setStep('plans'); if (pollRef.current) clearInterval(pollRef.current) }}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
          <ArrowLeft size={16} /> Quay lại
        </button>

        <h2 className="text-lg font-black text-white mb-1">Chuyển khoản thanh toán</h2>
        <p className="text-sm text-gray-500 mb-4">
          Gói <span className="text-amber-400 font-bold">{plan.label}</span> —{' '}
          <span className="text-white font-bold">{payInfo.amount.toLocaleString('vi-VN')}đ</span>
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="rounded-2xl bg-white p-3 shadow-xl">
            <Image src={payInfo.qr_code_url} alt="VietQR" width={200} height={200} className="rounded-xl" unoptimized />
          </div>
        </div>
        <p className="text-center text-xs text-gray-500 mb-5">Quét QR bằng app ngân hàng bất kỳ</p>

        {/* Bank info rows */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5 mb-5 space-y-3">
          {[
            { label: 'Ngân hàng',      value: payInfo.bank_name,       copyLabel: '' },
            { label: 'Số tài khoản',   value: payInfo.account_number,  copyLabel: 'số tài khoản' },
            { label: 'Chủ tài khoản',  value: payInfo.account_holder,  copyLabel: '' },
            { label: 'Số tiền',        value: `${payInfo.amount.toLocaleString('vi-VN')}đ`, copyLabel: '' },
            { label: 'Nội dung CK',    value: payInfo.transfer_content, copyLabel: 'nội dung' },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">{row.label}</span>
              <div className="flex items-center gap-1.5">
                <span className={clsx('text-xs font-semibold', row.label === 'Nội dung CK' ? 'text-amber-400' : 'text-white')}>{row.value}</span>
                {row.copyLabel && (
                  <button onClick={() => copyText(row.value, row.copyLabel)} className="text-gray-600 hover:text-gray-300">
                    <Copy size={11} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Polling indicator */}
        <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 px-4 py-3 mb-4">
          <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" />
          <p className="text-xs text-blue-300">Đang chờ xác nhận thanh toán tự động...</p>
        </div>

        <p className="text-center text-[10px] text-gray-600">
          Nhập đúng nội dung <span className="text-amber-400 font-bold">{payInfo.transfer_content}</span> để hệ thống tự xác nhận
        </p>
      </div>
    )
  }

  // Plans selection
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <div className="text-center mb-7">
        <div className="mx-auto w-[72px] h-[72px] rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4">
          <Crown size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight">
          Nâng tầm thể thao<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">cùng Premium</span>
        </h1>
        <p className="text-sm text-gray-400 mt-2">
          Tham gia <span className="text-amber-400 font-semibold">2.400+ thành viên</span> đang tận hưởng Premium
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-7">
        {BENEFITS.map((b, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-2xl border border-amber-500/15 bg-gray-900/80 p-3.5">
            <div className="shrink-0 mt-0.5">{b.icon}</div>
            <div>
              <p className="text-[12px] font-bold text-white leading-snug">{b.title}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Chọn gói</p>
      <div className="flex gap-3 mb-6">
        {PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlan(p.id)}
            className={clsx(
              'flex-1 rounded-2xl border p-4 text-left transition-all relative',
              selectedPlan === p.id ? 'border-amber-400 bg-amber-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            )}
          >
            {p.badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-400 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-full">
                {p.badge}
              </span>
            )}
            <p className="text-[11px] font-semibold text-gray-400 mb-1">{p.label}</p>
            <p className="text-xl font-black text-white leading-none">
              {p.price.toLocaleString('vi-VN')}<span className="text-xs font-normal text-gray-500">đ</span>
            </p>
            {selectedPlan === p.id && (
              <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center">
                <Check size={10} className="text-gray-900" />
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={handleStartPayment}
        disabled={paying}
        className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-[15px] font-black text-gray-900 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-2 disabled:opacity-60"
      >
        {paying ? <Loader2 size={16} className="animate-spin" /> : <Crown size={18} />}
        {paying ? 'Đang tạo lệnh...' : `Nâng cấp ngay — ${plan.price.toLocaleString('vi-VN')}đ/${plan.unit}`}
      </button>
      <p className="text-center text-[10px] text-gray-600 mb-6">Thanh toán qua chuyển khoản ngân hàng — hoàn toàn miễn phí</p>

      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden mb-4">
        {[
          { q: 'Làm sao để hủy đăng ký?', a: 'Liên hệ support qua Zalo/Email. Tiền không hoàn lại cho gói đang dùng.' },
          { q: 'Premium dùng trên bao nhiêu thiết bị?', a: 'Premium gắn với tài khoản, đăng nhập thiết bị nào cũng dùng được.' },
          { q: 'Radar hoạt động như thế nào?', a: 'Bạn thiết lập tiêu chí (môn, khoảng cách, giờ). Khi có trận mới phù hợp, app thông báo ngay.' },
        ].map((faq, i) => (
          <div key={i} className="border-b border-gray-800 last:border-b-0">
            <button
              onClick={() => setShowFaq(showFaq === i ? null : i)}
              className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium text-gray-300">{faq.q}</span>
              {showFaq === i ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
            </button>
            {showFaq === i && (
              <p className="px-4 pb-4 text-[11px] text-gray-400 leading-relaxed">{faq.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
