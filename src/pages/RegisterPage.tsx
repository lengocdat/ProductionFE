import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Heart } from 'lucide-react'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp')
      return
    }

    setLoading(true)
    try {
      await register(email, password)
      navigate('/onboarding')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Heart className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Tạo tài khoản</h1>
          <p className="mt-1 text-sm text-muted-foreground">Bắt đầu hành trình tìm Cơ Duyên</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-md">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="email@edu.vn (có badge xác thực)"
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Email .edu.vn sẽ được xác thực tự động</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Nhập lại mật khẩu"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-accent">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Đang tạo...' : 'Đăng ký'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
