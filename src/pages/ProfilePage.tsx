import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/types'
import { LogOut, Plus, X, Shield } from 'lucide-react'
import { getInitials } from '@/lib/utils'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile')
      return data.profile as Profile
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('photo', file)
      const { data } = await api.post('/profile/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (index: number) => {
      await api.delete(`/profile/photos/${index}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
    e.target.value = ''
  }

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải...</div>
  }

  if (!profile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
        <p className="text-muted-foreground">Chưa có hồ sơ</p>
        <button onClick={() => navigate('/onboarding')} className="rounded-xl bg-primary px-6 py-2 text-sm text-white">
          Tạo hồ sơ
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Hồ sơ</h1>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>

      {/* Photos Grid */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium">Ảnh ({profile.avatar_urls?.length || 0}/6)</h3>
        <div className="grid grid-cols-3 gap-2">
          {profile.avatar_urls?.map((url, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-card">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => deleteMutation.mutate(i)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {(profile.avatar_urls?.length || 0) < 6 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border hover:border-primary/50"
            >
              <Plus size={24} className="text-muted-foreground" />
            </button>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Profile Info */}
      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-primary/10">
            {profile.avatar_urls?.length > 0 ? (
              <img src={profile.avatar_urls[0]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-primary/50">
                {getInitials(profile.full_name)}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold">{profile.full_name}</h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              {user?.verified_status === 'verified_student' && (
                <span className="flex items-center gap-0.5 text-success">
                  <Shield size={12} /> Đã xác thực
                </span>
              )}
              {profile.school && <span>• {profile.school}</span>}
            </div>
          </div>
        </div>

        {profile.bio && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">Giới thiệu</h4>
            <p className="mt-1 text-sm">{profile.bio}</p>
          </div>
        )}

        {profile.interests?.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">Sở thích</h4>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {profile.interests.map((i) => (
                <span key={i} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{i}</span>
              ))}
            </div>
          </div>
        )}

        {profile.mbti && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">MBTI</h4>
            <span className="mt-1 inline-block rounded-full bg-card px-3 py-1 text-sm font-medium">{profile.mbti}</span>
          </div>
        )}

        {profile.life_philosophy && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">Triết lý sống</h4>
            <p className="mt-1 text-sm italic">"{profile.life_philosophy}"</p>
          </div>
        )}
      </div>

      {/* Edu Verification */}
      {user?.verified_status === 'pending' && (
        <EduVerificationCard />
      )}

      {/* Invite codes for verified users */}
      {(user?.verified_status === 'verified_student' || user?.verified_status === 'verified_degree') && (
        <InviteCodesCard />
      )}

      {/* Edit button */}
      <button
        onClick={() => navigate('/onboarding')}
        className="mt-4 block w-full rounded-xl border border-border py-3 text-center text-sm font-medium hover:bg-card"
      >
        Chỉnh sửa hồ sơ
      </button>
    </div>
  )
}

function EduVerificationCard() {
  const { refreshUser } = useAuth()
  const [eduEmail, setEduEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'edu' | 'invite'>('invite')

  async function handleRedeemInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    try {
      await api.post('/invite/redeem', { code: inviteCode.toUpperCase() })
      await refreshUser()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Mã mời không hợp lệ')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!eduEmail.trim()) return

    setLoading(true)
    setError('')
    try {
      await api.post('/auth/send-edu-verification', { edu_email: eduEmail })
      setEmailSent(true)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } }
      setError(axiosErr.response?.data?.error || 'Không thể gửi email xác thực')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-medium text-blue-800">📧 Email xác thực đã gửi!</p>
        <p className="mt-1 text-xs text-blue-600">
          Kiểm tra hộp thư <strong>{eduEmail}</strong> và click link xác thực.
          Link có hiệu lực 24 giờ.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-2">
        <Shield size={18} className="mt-0.5 text-amber-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Xác thực sinh viên / cựu sinh viên</p>
          <p className="mt-1 text-xs text-amber-600">
            Profile verified được ưu tiên hiển thị và tăng độ tin cậy.
          </p>

          {/* Tabs */}
          <div className="mt-3 flex rounded-lg bg-amber-100 p-0.5">
            <button
              onClick={() => { setTab('invite'); setError('') }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'invite' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-600'}`}
            >
              Mã mời
            </button>
            <button
              onClick={() => { setTab('edu'); setError('') }}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${tab === 'edu' ? 'bg-white text-amber-800 shadow-sm' : 'text-amber-600'}`}
            >
              Email .edu.vn
            </button>
          </div>

          {tab === 'invite' && (
            <div className="mt-3">
              <p className="text-xs text-amber-600 mb-2">Nhập mã mời từ bạn bè đã xác thực:</p>
              <form onSubmit={handleRedeemInvite} className="flex gap-2">
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="VD: ABC123"
                  maxLength={6}
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-mono tracking-widest text-center uppercase outline-none focus:ring-2 focus:ring-amber-400/30"
                />
                <button
                  type="submit"
                  disabled={loading || inviteCode.length !== 6}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? '...' : 'Xác thực'}
                </button>
              </form>
            </div>
          )}

          {tab === 'edu' && (
            <div className="mt-3">
              <p className="text-xs text-amber-600 mb-2">Dành cho sinh viên đang học:</p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="email"
                  value={eduEmail}
                  onChange={(e) => setEduEmail(e.target.value)}
                  placeholder="ten@truong.edu.vn"
                  className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400/30"
                />
                <button
                  type="submit"
                  disabled={loading || !eduEmail.trim()}
                  className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? '...' : 'Gửi'}
                </button>
              </form>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}

interface InviteCodeData {
  code: string
  used_by_id: string | null
  created_at: string
}

function InviteCodesCard() {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['invite-codes'],
    queryFn: async () => {
      const { data } = await api.get('/invite/my-codes')
      return data as { codes: InviteCodeData[]; remaining: number; max: number }
    },
  })

  const codes = data?.codes || []
  const remaining = data?.remaining ?? 5

  async function handleGenerate() {
    setLoading(true)
    try {
      await api.post('/invite/generate')
      queryClient.invalidateQueries({ queryKey: ['invite-codes'] })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
  }

  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-medium">🎟️ Mời bạn bè ({remaining} lượt còn lại)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Chia sẻ mã mời để bạn bè xác thực tài khoản.
      </p>

      {codes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {codes.map((c) => (
            <div key={c.code} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span className={`font-mono text-sm tracking-widest ${c.used_by_id ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {c.code}
              </span>
              {c.used_by_id ? (
                <span className="text-xs text-muted-foreground">Đã dùng</span>
              ) : (
                <button onClick={() => copyCode(c.code)} className="text-xs text-primary hover:underline">
                  Copy
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="mt-3 w-full rounded-lg border border-primary/30 py-2 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          {loading ? '...' : '+ Tạo mã mời mới'}
        </button>
      )}
    </div>
  )
}
