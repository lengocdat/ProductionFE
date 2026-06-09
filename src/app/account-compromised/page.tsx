'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldAlert, Loader2, CheckCircle, ArrowLeft, Mail, KeyRound } from 'lucide-react'

type Step = 'email' | 'otp' | 'done'

export default function AccountCompromisedPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/report-compromised/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error('Lỗi hệ thống, thử lại sau.')
      setStep('otp')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  async function handleLock(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/report-compromised', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Mã xác nhận không đúng hoặc đã hết hạn.')
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi không xác định')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/login" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-6">
          <ArrowLeft size={13} /> Quay lại đăng nhập
        </Link>

        {step === 'done' ? (
          <div className="rounded-2xl bg-white border border-green-200 p-6 text-center shadow-sm space-y-3">
            <CheckCircle size={40} className="text-green-500 mx-auto" />
            <h1 className="text-lg font-bold text-gray-900">Tài khoản đã được khoá</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Tất cả phiên đăng nhập đã bị thu hồi và các trận đang mở đã bị huỷ.
            </p>
            <p className="text-xs text-gray-400">
              Admin sẽ liên hệ bạn qua email trong vòng 24h để hỗ trợ khôi phục.
            </p>
            <Link href="/login"
              className="block mt-2 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-white hover:bg-green-600 transition-colors">
              Về trang đăng nhập
            </Link>
          </div>

        ) : step === 'otp' ? (
          <div className="rounded-2xl bg-white border border-red-100 p-6 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                <KeyRound size={28} className="text-amber-500" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Nhập mã xác nhận</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                Mã 6 chữ số đã được gửi đến <strong>{email}</strong>.<br />
                Kiểm tra hộp thư (kể cả Spam).
              </p>
            </div>

            <form onSubmit={handleLock} className="space-y-3">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                autoFocus
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-2xl font-mono tracking-[0.4em] focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
              />

              {error && (
                <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <><ShieldAlert size={15} /> Xác nhận khoá tài khoản</>}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setError('') }}
                className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
              >
                Dùng email khác
              </button>
            </form>

            <p className="text-[10px] text-gray-400 text-center">
              Mã có hiệu lực trong 5 phút. Thao tác này không thể hoàn tác tự động.
            </p>
          </div>

        ) : (
          <div className="rounded-2xl bg-white border border-red-100 p-6 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <ShieldAlert size={28} className="text-red-500" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">Tài khoản bị xâm phạm?</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                Nếu bạn tin rằng ai đó đang dùng tài khoản của bạn để lừa đảo,
                nhập email để nhận <strong>mã xác nhận khoá tài khoản</strong>.
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5">
              <p className="text-xs font-bold text-amber-800">Sau khi khoá:</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                <li>Tất cả phiên đăng nhập bị thu hồi ngay</li>
                <li>Các trận đang mở sẽ bị huỷ</li>
                <li>Người đã đặt cọc được thông báo hoàn tiền</li>
                <li>Admin liên hệ bạn trong 24h để khôi phục</li>
              </ul>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-3">
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="Email tài khoản của bạn"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-all"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <><Mail size={15} /> Gửi mã xác nhận</>}
              </button>
            </form>

            <p className="text-[10px] text-gray-400 text-center">
              Mã OTP sẽ được gửi về email. Chỉ bạn mới có thể khoá tài khoản của mình.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
