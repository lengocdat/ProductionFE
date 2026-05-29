import { useState } from 'react'
import { Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'

export default function VerifyPendingPage() {
  const { user, logout, refreshUser } = useAuth()
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResend() {
    setResending(true)
    try {
      await api.post('/auth/send-verification')
      setSent(true)
    } catch {
      // error handled by global toast
    } finally {
      setResending(false)
    }
  }

  async function handleCheckAgain() {
    await refreshUser()
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Xác thực email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chúng tôi đã gửi email xác thực tới <strong>{user?.email}</strong>. Vui lòng kiểm tra hộp thư và click link xác nhận.
        </p>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleCheckAgain}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white"
          >
            <RefreshCw size={14} className="inline mr-1" />
            Tôi đã xác thực
          </button>

          <button
            onClick={handleResend}
            disabled={resending || sent}
            className="w-full rounded-xl border border-border py-3 text-sm font-medium disabled:opacity-50"
          >
            {sent ? 'Đã gửi lại ✓' : resending ? 'Đang gửi...' : 'Gửi lại email'}
          </button>

          <button
            onClick={logout}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Đăng xuất
          </button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Kiểm tra cả thư mục Spam nếu không thấy email.
        </p>
      </div>
    </div>
  )
}
