import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Crown, Check, Eye, Zap, Star, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Package {
  id: string
  name: string
  plan: string
  price: number
  duration_days: number
  features: string[]
}

export default function PremiumPage() {
  const { user } = useAuth()
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null)
  const [gateway, setGateway] = useState<'vnpay' | 'momo'>('momo')

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: async () => {
      const { data } = await api.get('/payment/packages')
      return (data.packages || []) as Package[]
    },
  })

  const { data: status } = useQuery({
    queryKey: ['premium-status'],
    queryFn: async () => {
      const { data } = await api.get('/payment/status')
      return data
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/payment/checkout', {
        package_id: selectedPkg,
        gateway,
      })
      return data
    },
    onSuccess: (data) => {
      // In production: redirect to checkout_url
      // For MVP: simulate success
      window.location.href = data.checkout_url
    },
  })

  const isPremium = status?.is_premium

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <Crown className="mx-auto mb-2 h-12 w-12 text-yellow-500" />
        <h1 className="text-xl font-bold">CơDuyên Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mở khoá tất cả tính năng, tìm Cơ Duyên nhanh hơn
        </p>
      </div>

      {/* Current status */}
      {isPremium && (
        <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-center">
          <p className="font-medium text-yellow-800">✨ Bạn đang là Premium</p>
          <p className="mt-1 text-sm text-yellow-600">
            Hết hạn: {new Date(status.expires_at).toLocaleDateString('vi-VN')}
          </p>
        </div>
      )}

      {/* Features */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold">Tính năng Premium:</h3>
        <div className="space-y-2.5">
          {[
            { icon: <Heart size={16} />, text: '15 Cơ Duyên/ngày (thay vì 5)' },
            { icon: <Eye size={16} />, text: 'Xem ai đã thích bạn' },
            { icon: <Zap size={16} />, text: 'Priority Match — hiện trước' },
            { icon: <Star size={16} />, text: 'Super Like không giới hạn' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-primary">{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Packages */}
      {!isPremium && (
        <>
          <div className="mb-4 space-y-3">
            {packages?.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg.id)}
                className={cn(
                  'relative w-full rounded-xl border p-4 text-left transition-colors',
                  selectedPkg === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30'
                )}
              >
                {pkg.plan === 'premium_yearly' && (
                  <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                    TIẾT KIỆM 33%
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">{pkg.duration_days} ngày</p>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {(pkg.price / 1000).toFixed(0)}K
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Gateway selection */}
          {selectedPkg && (
            <div className="mb-4 animate-fade-in">
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">Phương thức thanh toán:</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setGateway('momo')}
                  className={cn(
                    'flex-1 rounded-xl border py-3 text-sm font-medium',
                    gateway === 'momo' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-border'
                  )}
                >
                  💜 MoMo
                </button>
                <button
                  onClick={() => setGateway('vnpay')}
                  className={cn(
                    'flex-1 rounded-xl border py-3 text-sm font-medium',
                    gateway === 'vnpay' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-border'
                  )}
                >
                  🏦 VNPay
                </button>
              </div>
            </div>
          )}

          {/* Checkout button */}
          {selectedPkg && (
            <button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="w-full animate-fade-in rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {checkoutMutation.isPending ? 'Đang xử lý...' : '💎 Nâng cấp Premium'}
            </button>
          )}
        </>
      )}

      {/* Who liked me (premium only) */}
      {isPremium && <WhoLikedMe />}
    </div>
  )
}

function WhoLikedMe() {
  const { data, isLoading } = useQuery({
    queryKey: ['who-liked-me'],
    queryFn: async () => {
      const { data } = await api.get('/payment/who-liked-me')
      return data
    },
  })

  if (isLoading) return null

  const profiles = data?.profiles || []

  return (
    <div className="mt-6">
      <h3 className="mb-3 font-semibold">❤️ Ai đã thích bạn ({data?.count || 0})</h3>
      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ai thích bạn. Tiếp tục hoàn thiện hồ sơ!</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {profiles.map((p: any) => (
            <div key={p.user_id} className="overflow-hidden rounded-xl bg-card">
              <div className="aspect-square bg-primary/10">
                {p.avatar_urls?.length > 0 ? (
                  <img src={p.avatar_urls[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg font-bold text-primary/30">
                    {p.full_name?.[0]}
                  </div>
                )}
              </div>
              <p className="truncate px-2 py-1 text-xs font-medium">{p.full_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
