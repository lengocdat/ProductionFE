import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    const type = searchParams.get('type') || 'regular'

    if (!token) {
      setStatus('error')
      setMessage('Link xác thực không hợp lệ')
      return
    }

    // Call backend verify endpoint
    api.get(`/auth/verify-email?token=${token}&type=${type}`)
      .then(async ({ data }) => {
        setStatus('success')
        setMessage(data.message || 'Xác thực thành công!')
        // Refresh user state so verified_status updates
        await refreshUser()
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Link xác thực không hợp lệ hoặc đã hết hạn')
      })
  }, [searchParams, refreshUser])

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-md">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Đang xác thực...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">🎓</span>
            </div>
            <h2 className="text-lg font-bold text-green-800">{message}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Profile của bạn đã được xác thực sinh viên.</p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-6 w-full rounded-xl bg-primary py-3 text-sm font-medium text-white"
            >
              Về trang cá nhân
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-lg font-bold text-red-800">Xác thực thất bại</h2>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <button
              onClick={() => navigate('/profile')}
              className="mt-6 w-full rounded-xl border border-border py-3 text-sm font-medium"
            >
              Về trang cá nhân
            </button>
          </>
        )}
      </div>
    </div>
  )
}
