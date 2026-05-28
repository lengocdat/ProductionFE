import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Heart } from 'lucide-react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/discover')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-soft px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo & Branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-romantic shadow-lg animate-pulse-glow">
            <Heart className="h-10 w-10 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">CơDuyên</h1>
          <p className="mt-2 text-sm text-muted-foreground">Hẹn hò tri thức dành cho sinh viên</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-6 shadow-xl border border-border/50">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-card/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="email@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground/80">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-card/50 px-4 py-3.5 text-sm outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              placeholder="••••••"
              required
              minLength={6}
            />
          </div>

          {error && <p className="text-sm text-primary font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-romantic py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-accent transition-colors">
              Đăng ký ngay
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
