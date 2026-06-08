'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Crown, Radar, Zap, Star, Shield, Users, Check, ArrowLeft, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'

interface UserMe {
  id: number
  username: string
  is_premium: boolean
  premium_expires_at?: string
}

const PLANS = [
  {
    id: 'monthly',
    label: 'Hàng tháng',
    price: 49000,
    unit: 'tháng',
    badge: null,
    pricePerMonth: 49000,
  },
  {
    id: 'yearly',
    label: 'Hàng năm',
    price: 399000,
    unit: 'năm',
    badge: 'Tiết kiệm 32%',
    pricePerMonth: Math.round(399000 / 12),
  },
] as const

const BENEFITS = [
  {
    icon: <Radar size={20} className="text-amber-400" />,
    title: 'Radar Thông Minh',
    desc: 'Nhận thông báo ngay khi xuất hiện trận đấu hoặc món đồ phù hợp với tiêu chí của bạn. Không bao giờ bỏ lỡ cơ hội.',
    free: false,
    premium: true,
  },
  {
    icon: <Zap size={20} className="text-amber-400" />,
    title: 'Ưu Tiên Hiển Thị',
    desc: 'Tin tuyển người và đăng đồ của bạn luôn xuất hiện đầu feed và marketplace. Tăng gấp 3x lượt tiếp cận.',
    free: false,
    premium: true,
  },
  {
    icon: <Crown size={20} className="text-amber-400" />,
    title: 'Crown Badge & Khung Vàng',
    desc: 'Khung avatar vàng độc quyền, huy hiệu ⭐ Premium trên profile và trong chat. Xây dựng uy tín ngay.',
    free: false,
    premium: true,
  },
  {
    icon: <Star size={20} className="text-amber-400" />,
    title: 'Lọc Nâng Cao',
    desc: 'Lọc trận theo khoảng cách chính xác, khoảng giá sân, giờ bắt đầu. Tìm đúng trận trong vài giây.',
    free: false,
    premium: true,
  },
  {
    icon: <Shield size={20} className="text-amber-400" />,
    title: 'Nhãn Tin Cậy Premium',
    desc: 'Hiển thị badge "Premium Member" giúp đối tác, người mua/bán tin tưởng hơn. Chốt deal nhanh hơn.',
    free: false,
    premium: true,
  },
  {
    icon: <Users size={20} className="text-amber-400" />,
    title: 'Xem Ai Xem Hồ Sơ',
    desc: 'Biết ai đã ghé thăm profile của bạn trong 30 ngày gần nhất. Chủ động kết nối đối tác tiềm năng.',
    free: false,
    premium: true,
  },
] as const

const PAYMENT_METHODS = [
  { id: 'momo', label: 'MoMo', color: 'bg-pink-50 border-pink-200 text-pink-700', icon: '💳' },
  { id: 'banking', label: 'Chuyển khoản', color: 'bg-blue-50 border-blue-200 text-blue-700', icon: '🏦' },
  { id: 'zalopay', label: 'ZaloPay', color: 'bg-sky-50 border-sky-200 text-sky-700', icon: '💙' },
]

const BANK_INFO = {
  bank: 'Vietcombank',
  account: '1234567890',
  holder: 'NGUYEN VAN A',
}

export default function PremiumPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [payMethod, setPayMethod] = useState<string>('banking')
  const [step, setStep] = useState<'plans' | 'payment' | 'done'>('plans')
  const [activating, setActivating] = useState(false)
  const [showFaq, setShowFaq] = useState<number | null>(null)

  useEffect(() => {
    apiFetch<{ user: UserMe }>('/auth/me')
      .then(d => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const plan = PLANS.find(p => p.id === selectedPlan)!
  const isActive = user?.is_premium && user.premium_expires_at && new Date(user.premium_expires_at) > new Date()
  const expiryFormatted = user?.premium_expires_at
    ? new Date(user.premium_expires_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  async function handleActivate() {
    setActivating(true)
    try {
      // Try MoMo payment first
      const result = await apiFetch<{ pay_url: string; qr_code: string }>('/payment/momo/premium', { method: 'POST' })
      if (result.pay_url) {
        // Redirect to MoMo payment page
        window.location.href = result.pay_url
        return
      }
    } catch {
      // MoMo not configured — fall back to manual activation
    }
    try {
      await apiFetch('/premium/activate', { method: 'POST', json: { plan: selectedPlan } })
      setStep('done')
      setUser(prev => prev ? { ...prev, is_premium: true } : prev)
      toast.success('Kích hoạt Premium thành công!')
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 size={24} className="animate-spin text-amber-400" />
      </div>
    )
  }

  // Already premium view
  if (isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft size={16} /> Quay lại
        </button>

        {/* Active banner */}
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
            Tài khoản hiệu lực đến <span className="text-amber-400 font-bold">{expiryFormatted}</span>
          </p>
        </div>

        {/* Active benefits */}
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Quyền lợi đang có</h2>
        <div className="space-y-2 mb-6">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-900 border border-amber-500/20 px-4 py-3">
              <div className="shrink-0">{b.icon}</div>
              <span className="text-sm font-medium text-white">{b.title}</span>
              <Check size={14} className="ml-auto text-amber-400 shrink-0" />
            </div>
          ))}
        </div>

        <button
          onClick={() => router.back()}
          className="w-full rounded-2xl border border-gray-700 py-3.5 text-sm font-medium text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          Quay lại hồ sơ
        </button>
      </div>
    )
  }

  // Done state
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/40 mb-6 animate-pulse">
          <Crown size={44} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 text-center">Chào mừng Premium!</h1>
        <p className="text-gray-400 text-sm text-center mb-8">
          Tài khoản của bạn đã được nâng cấp. Tận hưởng đầy đủ quyền lợi ngay bây giờ.
        </p>
        <div className="w-full space-y-2 mb-8">
          {BENEFITS.map((b, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-900/80 border border-amber-500/20 px-4 py-3">
              <div>{b.icon}</div>
              <span className="text-sm text-white">{b.title}</span>
              <Check size={14} className="ml-auto text-amber-400 shrink-0" />
            </div>
          ))}
        </div>
        <button
          onClick={() => router.replace('/profile')}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-sm font-black text-gray-900 shadow-lg shadow-amber-500/30"
        >
          Về trang hồ sơ
        </button>
      </div>
    )
  }

  // Payment step
  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-6">
        <button onClick={() => setStep('plans')} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
          <ArrowLeft size={16} /> Quay lại
        </button>

        <h2 className="text-lg font-black text-white mb-1">Xác nhận thanh toán</h2>
        <p className="text-sm text-gray-500 mb-5">
          Gói <span className="text-amber-400 font-bold">{plan.label}</span> —{' '}
          <span className="text-white font-bold">{plan.price.toLocaleString('vi-VN')}đ</span>
        </p>

        {/* Payment method */}
        <div className="flex gap-2 mb-5">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => setPayMethod(m.id)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-medium transition-all',
                payMethod === m.id ? m.color : 'bg-gray-900 border-gray-700 text-gray-400'
              )}
            >
              <span className="text-lg">{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Bank info */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900 p-5 mb-5">
          {payMethod === 'banking' && (
            <>
              <p className="text-[11px] text-gray-500 mb-3 uppercase font-semibold tracking-wide">Thông tin chuyển khoản</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Ngân hàng', value: BANK_INFO.bank },
                  { label: 'Số tài khoản', value: BANK_INFO.account },
                  { label: 'Chủ tài khoản', value: BANK_INFO.holder },
                  { label: 'Số tiền', value: `${plan.price.toLocaleString('vi-VN')}đ` },
                  { label: 'Nội dung', value: `PREMIUM ${user?.id} ${plan.id.toUpperCase()}` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">{row.label}</span>
                    <span className="text-xs font-semibold text-white">{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-600 mt-4 leading-relaxed">
                Sau khi chuyển khoản, nhấn "Tôi đã thanh toán" bên dưới. Hệ thống sẽ kích hoạt tài khoản trong vòng 5 phút.
              </p>
            </>
          )}
          {payMethod === 'momo' && (
            <div className="text-center py-4">
              <div className="w-24 h-24 mx-auto bg-pink-100 rounded-2xl flex items-center justify-center text-4xl mb-3">💳</div>
              <p className="text-sm text-white font-bold mb-1">Quét QR MoMo</p>
              <p className="text-xs text-gray-500">Chuyển <span className="text-amber-400">{plan.price.toLocaleString('vi-VN')}đ</span> cho số 0901234567</p>
            </div>
          )}
          {payMethod === 'zalopay' && (
            <div className="text-center py-4">
              <div className="w-24 h-24 mx-auto bg-sky-100 rounded-2xl flex items-center justify-center text-4xl mb-3">💙</div>
              <p className="text-sm text-white font-bold mb-1">Quét QR ZaloPay</p>
              <p className="text-xs text-gray-500">Chuyển <span className="text-amber-400">{plan.price.toLocaleString('vi-VN')}đ</span> cho số 0901234567</p>
            </div>
          )}
        </div>

        <button
          onClick={handleActivate}
          disabled={activating}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-sm font-black text-gray-900 shadow-lg shadow-amber-500/30 disabled:opacity-60 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          {activating ? <Loader2 size={16} className="animate-spin" /> : null}
          {activating ? 'Đang kích hoạt...' : 'Tôi đã thanh toán — Kích hoạt'}
        </button>
        <p className="text-center text-[10px] text-gray-600 mt-3">
          Bằng cách nhấn xác nhận, bạn đồng ý với điều khoản dịch vụ.
        </p>
      </div>
    )
  }

  // Plans selection (default)
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-6">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
        <ArrowLeft size={16} /> Quay lại
      </button>

      {/* Hero */}
      <div className="text-center mb-7">
        <div className="mx-auto w-18 h-18 w-[72px] h-[72px] rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl shadow-amber-500/30 mb-4">
          <Crown size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white leading-tight">
          Nâng tầm thể thao<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-400">cùng Premium</span>
        </h1>
        <p className="text-sm text-gray-400 mt-2">Tham gia {' '}
          <span className="text-amber-400 font-semibold">2.400+ thành viên</span> đang tận hưởng Premium
        </p>
      </div>

      {/* Benefits — compact grid */}
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

      {/* Plan selection */}
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Chọn gói</p>
      <div className="flex gap-3 mb-6">
        {PLANS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPlan(p.id)}
            className={clsx(
              'flex-1 rounded-2xl border p-4 text-left transition-all relative',
              selectedPlan === p.id
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-gray-700 bg-gray-900 hover:border-gray-600'
            )}
          >
            {p.badge && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-amber-400 to-yellow-400 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-full">
                {p.badge}
              </span>
            )}
            <p className="text-[11px] font-semibold text-gray-400 mb-1">{p.label}</p>
            <p className="text-xl font-black text-white leading-none">
              {p.price.toLocaleString('vi-VN')}
              <span className="text-xs font-normal text-gray-500">đ</span>
            </p>
            {p.id === 'yearly' && (
              <p className="text-[10px] text-amber-400 mt-1">
                {p.pricePerMonth.toLocaleString('vi-VN')}đ/tháng
              </p>
            )}
            {selectedPlan === p.id && (
              <div className="absolute top-3 right-3 h-4 w-4 rounded-full bg-amber-400 flex items-center justify-center">
                <Check size={10} className="text-gray-900" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={() => setStep('payment')}
        className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 py-4 text-[15px] font-black text-gray-900 shadow-xl shadow-amber-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-3"
      >
        <Crown size={18} />
        Nâng cấp ngay — {plan.price.toLocaleString('vi-VN')}đ/{plan.unit}
      </button>
      <p className="text-center text-[10px] text-gray-600 mb-6">
        Thanh toán qua MoMo, ZaloPay hoặc chuyển khoản ngân hàng
      </p>

      {/* FAQ */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden mb-4">
        {[
          { q: 'Làm sao để hủy đăng ký?', a: 'Bạn có thể liên hệ support qua Zalo/Email. Tiền không được hoàn lại cho gói đang dùng.' },
          { q: 'Premium có thể dùng trên bao nhiêu thiết bị?', a: 'Premium gắn với tài khoản, bạn đăng nhập trên thiết bị nào cũng dùng được.' },
          { q: 'Radar hoạt động như thế nào?', a: 'Bạn thiết lập tiêu chí (môn thể thao, khoảng cách, giờ). Khi có trận/đồ mới phù hợp, app thông báo ngay cho bạn.' },
        ].map((faq, i) => (
          <button
            key={i}
            onClick={() => setShowFaq(showFaq === i ? null : i)}
            className="w-full text-left px-4 py-3.5 border-b border-gray-800 last:border-b-0 flex items-center justify-between gap-2"
          >
            <span className="text-sm font-medium text-gray-300">{faq.q}</span>
            {showFaq === i ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
            {showFaq === i && (
              <p className="absolute hidden" />
            )}
          </button>
        ))}
        {showFaq !== null && (
          <div className="px-4 pb-4 text-[11px] text-gray-400 leading-relaxed -mt-1">
            {[
              'Bạn có thể liên hệ support qua Zalo/Email. Tiền không được hoàn lại cho gói đang dùng.',
              'Premium gắn với tài khoản, bạn đăng nhập trên thiết bị nào cũng dùng được.',
              'Bạn thiết lập tiêu chí (môn thể thao, khoảng cách, giờ). Khi có trận/đồ mới phù hợp, app thông báo ngay cho bạn.',
            ][showFaq]}
          </div>
        )}
      </div>
    </div>
  )
}
