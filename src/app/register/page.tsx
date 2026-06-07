'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, ShieldCheck, Gift } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const ref = searchParams.get('ref') || localStorage.getItem('referral_code') || ''
    if (ref) setReferralCode(ref.toUpperCase())
  }, [searchParams])

  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  async function handleFacebookLogin() {
    try {
      const res = await fetch('/api/v1/auth/facebook/url')
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {}
  }

  async function handleGoogleLogin() {
    try {
      const res = await fetch('/api/v1/auth/google/url')
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {}
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, referral_code: referralCode || undefined }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại')
      localStorage.setItem('access_token', data.access_token)
      // Show OTP verification (in future, backend sends OTP email)
      // For now, skip OTP and go directly to app
      router.replace('/feed')
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) value = value.slice(-1)
    if (!/^\d*$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join('')
    if (code.length !== 6) { setError('Vui lòng nhập đủ 6 số'); return }
    // TODO: verify OTP with backend
    router.replace('/feed')
  }

  // --- OTP Screen ---
  if (step === 'otp') {
    return (
      <div className="mx-auto max-w-md min-h-screen bg-white flex flex-col items-center justify-center px-6">
        <button onClick={() => setStep('form')} className="absolute top-6 left-6 p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <ShieldCheck size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Xác thực Email</h2>
          <p className="text-sm text-gray-500 mt-1.5">
            Mã xác thực 6 số đã được gửi tới<br/>
            <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-2.5 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className={`w-12 h-14 rounded-xl border-2 text-center text-xl font-bold outline-none transition-all ${
                digit ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-700'
              } focus:border-green-500 focus:ring-2 focus:ring-green-100`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

        <button
          onClick={handleVerifyOtp}
          className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 shadow-md shadow-green-200"
        >
          Xác nhận
        </button>

        <button className="mt-4 text-sm text-gray-500 hover:text-green-600">
          Gửi lại mã (60s)
        </button>
      </div>
    )
  }

  // --- Register Form ---
  return (
    <div className="mx-auto max-w-md min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-8">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
            <span className="text-4xl">🏸</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
          <p className="text-sm text-gray-500 mt-1.5">Bắt đầu tìm trận thể thao ngay</p>
        </div>

        {/* Social Login */}
        <div className="w-full space-y-3 mb-6">
          <button type="button" onClick={handleFacebookLogin} className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#1877F2] py-3 text-sm font-semibold text-white hover:bg-[#1565C0] transition-colors shadow-sm">
            <FacebookIcon />
            Đăng ký bằng Facebook
          </button>
          <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <GoogleIcon />
            Đăng ký bằng Google
          </button>
        </div>

        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">Hoặc sử dụng Email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="w-full space-y-3">
          <div className="relative">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              placeholder="Tên hiển thị"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>

          <div className="relative">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Email"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mật khẩu (tối thiểu 6 ký tự)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-11 py-3 text-sm outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Referral code (optional) */}
          <div className="relative">
            <Gift size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={10}
              placeholder="Mã giới thiệu (tuỳ chọn)"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3 text-sm outline-none focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all"
            />
          </div>
          {referralCode && (
            <p className="text-[11px] text-green-600 bg-green-50 rounded-lg px-3 py-1.5">
              🎁 Bạn và người giới thiệu sẽ nhận 7 ngày Premium miễn phí!
            </p>
          )}

          {error && (
            <p className="text-xs text-red-500 text-center bg-red-50 rounded-lg py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-green-200 transition-all"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>Đăng ký <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <p className="text-[10px] text-gray-400 text-center mt-4 leading-relaxed">
          Bằng việc đăng ký, bạn đồng ý với<br/>
          <span className="text-green-600">Điều khoản sử dụng</span> và <span className="text-green-600">Chính sách bảo mật</span>
        </p>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-8 text-center">
        <p className="text-sm text-gray-500">
          Đã có tài khoản?{' '}
          <Link href="/login" className="font-semibold text-green-600 hover:text-green-700">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}

// --- Icons ---
function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
