'use client'

import { Crown, Radar, Ban, Star, Zap, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const PERKS = [
  { icon: <Radar size={18} className="text-amber-400" />, title: 'Radar Tự Động', desc: 'Nhận thông báo ngay khi có kèo hoặc đồ phù hợp' },
  { icon: <Ban size={18} className="text-amber-400" />, title: 'Không Quảng Cáo', desc: 'Trải nghiệm sạch, tập trung vào thể thao' },
  { icon: <Star size={18} className="text-amber-400" />, title: 'Badge Premium', desc: 'Khung avatar vàng + huy hiệu Premium độc quyền' },
  { icon: <Zap size={18} className="text-amber-400" />, title: 'Ưu Tiên Hiển Thị', desc: 'Bài đăng của bạn luôn được ưu tiên lên đầu' },
  { icon: <Shield size={18} className="text-amber-400" />, title: 'Uy Tín Cao', desc: 'Nhãn "Premium" giúp đối tác tin tưởng hơn' },
]

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3">
          <Crown size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">CoDuyen Premium</h1>
        <p className="text-sm text-gray-400 mt-1">Nâng tầm trải nghiệm thể thao</p>
      </div>

      {/* Perks */}
      <div className="space-y-2.5 mb-6">
        {PERKS.map((perk, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-gray-900/80 p-3.5">
            <div className="shrink-0 mt-0.5">{perk.icon}</div>
            <div>
              <h3 className="text-sm font-semibold text-white">{perk.title}</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">{perk.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 to-gray-900 p-5 mb-4">
        <div className="flex items-baseline justify-center gap-1 mb-1">
          <span className="text-3xl font-black text-amber-400">49K</span>
          <span className="text-sm text-gray-400">/ tháng</span>
        </div>
        <p className="text-center text-[11px] text-gray-500 mb-4">Hoặc 399K/năm (tiết kiệm 33%)</p>
        
        <button className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 py-3.5 text-sm font-bold text-gray-900 hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]">
          Nâng cấp Premium ngay
        </button>
        <p className="text-center text-[9px] text-gray-600 mt-2">Thanh toán qua Momo, ZaloPay hoặc chuyển khoản</p>
      </div>

      {/* Back */}
      <Link href="/profile" className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
        ← Quay lại hồ sơ
      </Link>
    </div>
  )
}
