'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleZaloLogin() {
    try {
      const res = await fetch('/api/v1/auth/zalo/url')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại')
      localStorage.setItem('access_token', data.access_token)
      router.replace('/feed')
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-md min-h-screen bg-white flex flex-col">
      {/* Top Brand Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
            <span className="text-4xl">🏸</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SportMatch</h1>
          <p className="text-sm text-gray-500 mt-1.5">Kết nối đam mê thể thao phong trào</p>
        </div>

        {/* Social Login Buttons */}
        <div className="w-full space-y-3 mb-6">
          <button onClick={handleZaloLogin} className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#0068FF] py-3 text-sm font-semibold text-white hover:bg-[#0055DD] transition-colors shadow-sm">
            <ZaloIcon />
            Đăng nhập bằng Zalo
          </button>
          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <GoogleIcon />
            Đăng nhập bằng Google
          </button>
        </div>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 whitespace-nowrap">Hoặc sử dụng Email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-3">
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
              placeholder="Mật khẩu"
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
              <>Đăng nhập <ArrowRight size={16} /></>
            )}
          </button>
        </form>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-8 text-center">
        <p className="text-sm text-gray-500">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="font-semibold text-green-600 hover:text-green-700">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  )
}

// --- Custom Icons ---
function ZaloIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
      <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4z" fill="white" fillOpacity="0.2"/>
      <path d="M14 17h9.5l-7 10h4.5l-1.5 5 8-8h-4l6.5-7H21l3-4h-10v4z" fill="white"/>
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
