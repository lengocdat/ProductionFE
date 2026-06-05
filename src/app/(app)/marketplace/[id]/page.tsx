'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Eye, MapPin, ShieldCheck, ChevronLeft, ChevronRight, Share2, User } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { clsx } from 'clsx'

interface MarketItem {
  id: number
  seller_id: number
  item_name: string
  description?: string
  category: string
  sport_type?: string
  price_vnd: number
  original_price?: number
  condition: string
  image_urls: string[]
  location_address?: string
  status: string
  view_count: number
  created_at: string
  seller?: {
    id: number
    username: string
    trusted_seller: boolean
    avatar_url?: string
    tier?: string
    negative_reports?: number
  }
}

const CAT_LABEL: Record<string, string> = {
  RACKET: '🏸 Vợt', SHOES: '👟 Giày', CLOTHING: '👕 Quần áo',
  SHUTTLECOCK: '🪶 Cầu', BALL: '⚽ Bóng', BAG: '🎒 Túi/Balo',
  ACCESSORY: '🧢 Phụ kiện', OTHER: '📦 Khác',
}

const CONDITION_LABEL: Record<string, { text: string; color: string }> = {
  NEW:      { text: 'Mới 100%',  color: 'bg-green-500 text-white' },
  LIKE_NEW: { text: 'Như mới',   color: 'bg-emerald-400 text-white' },
  GOOD:     { text: 'Tốt 95%',   color: 'bg-blue-500 text-white' },
  FAIR:     { text: 'Khá 90%',   color: 'bg-yellow-500 text-white' },
  WORN:     { text: 'Đã dùng',   color: 'bg-gray-500 text-white' },
}

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ' }
function discountPct(price: number, original: number) { return Math.round((1 - price / original) * 100) }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<MarketItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)
  const [imgError, setImgError] = useState<Record<number, boolean>>({})

  useEffect(() => {
    apiFetch<{ item: MarketItem }>(`/market/items/${id}`)
      .then(d => setItem(d.item))
      .catch(() => router.replace('/marketplace'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-white animate-pulse">
      <div className="h-[300px] bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-full" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
      </div>
    </div>
  )

  if (!item) return null

  const cond = CONDITION_LABEL[item.condition]
  const hasDiscount = item.original_price && item.original_price > item.price_vnd
  const pct = hasDiscount ? discountPct(item.price_vnd, item.original_price!) : 0
  const isSold = item.status === 'SOLD'
  const images = item.image_urls?.filter(Boolean) || []

  function prevImg() { setImgIdx(i => (i - 1 + images.length) % images.length) }
  function nextImg() { setImgIdx(i => (i + 1) % images.length) }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Back bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur-sm border-b px-3 py-2">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-700 truncate max-w-[220px]">{item.item_name}</span>
        <button
          onClick={() => {
            if (navigator.share) navigator.share({ title: item.item_name, url: window.location.href })
            else { navigator.clipboard.writeText(window.location.href) }
          }}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <Share2 size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Image carousel */}
      <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '1/1', maxHeight: 380 }}>
        {images.length > 0 && !imgError[imgIdx] ? (
          <img
            src={images[imgIdx]}
            alt={item.item_name}
            className="w-full h-full object-contain"
            onError={() => setImgError(prev => ({ ...prev, [imgIdx]: true }))}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-7xl opacity-20">{CAT_LABEL[item.category]?.split(' ')[0] || '📦'}</span>
          </div>
        )}

        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="rounded-2xl bg-white px-6 py-3 text-lg font-black text-gray-700 shadow-lg">ĐÃ BÁN</span>
          </div>
        )}

        {/* Nav arrows */}
        {images.length > 1 && !isSold && (
          <>
            <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm hover:bg-black/50">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm hover:bg-black/50">
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className={clsx('rounded-full transition-all', i === imgIdx ? 'w-5 h-2 bg-white' : 'w-2 h-2 bg-white/50')}
              />
            ))}
          </div>
        )}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex gap-1 p-2 overflow-x-auto justify-center">
            {/* dots already shown */}
          </div>
        )}
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b">
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setImgIdx(i)}
              className={clsx(
                'shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors',
                i === imgIdx ? 'border-orange-500' : 'border-transparent'
              )}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Main info */}
      <div className="px-4 py-4">
        {/* Badges row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {cond && (
            <span className={clsx('rounded-lg px-2.5 py-1 text-xs font-semibold', cond.color)}>{cond.text}</span>
          )}
          {item.category && (
            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{CAT_LABEL[item.category]}</span>
          )}
          {item.sport_type && (
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-600">{item.sport_type}</span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-base font-bold text-gray-900 leading-snug mb-3">{item.item_name}</h1>

        {/* Price */}
        <div className="flex items-center gap-3 mb-1">
          <span className={clsx('text-2xl font-black', isSold ? 'text-gray-400 line-through' : 'text-red-500')}>
            {fmt(item.price_vnd)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-sm text-gray-400 line-through">{fmt(item.original_price!)}</span>
              <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold text-white">-{pct}%</span>
            </>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
          <span className="flex items-center gap-1"><Eye size={12} /> {item.view_count} lượt xem</span>
          <span>{timeAgo(item.created_at)}</span>
          {item.location_address && (
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              <MapPin size={11} /> {item.location_address}
            </span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-1.5">Mô tả sản phẩm</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</p>
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gray-100 my-4" />

        {/* Seller card */}
        {item.seller && (
          <Link href={`/users/${item.seller.id}`} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3.5 hover:bg-gray-100 transition-colors">
            <div className="h-12 w-12 shrink-0 rounded-full bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-base overflow-hidden">
              {item.seller.avatar_url
                ? <img src={item.seller.avatar_url} className="w-full h-full object-cover" alt="" />
                : item.seller.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">{item.seller.username}</span>
                {item.seller.trusted_seller && (
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                    <ShieldCheck size={9} /> Uy tín
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {item.seller.tier === 'VERIFIED_HOST' ? '✅ Đã xác thực' : item.seller.tier === 'REGULAR' ? '👍 Thành viên' : '🆕 Mới tham gia'}
                {item.seller.negative_reports && item.seller.negative_reports > 0 ? ` · ${item.seller.negative_reports} báo cáo` : ''}
              </p>
            </div>
            <span className="text-[10px] text-orange-500 font-medium">Xem hồ sơ →</span>
          </Link>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-20 bg-white border-t px-4 py-3 flex gap-3">
        {isSold ? (
          <div className="flex-1 rounded-xl bg-gray-100 py-3.5 text-center text-sm font-bold text-gray-400">
            Sản phẩm đã được bán
          </div>
        ) : (
          <>
            <Link
              href={`/users/${item.seller_id}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-orange-500 py-3 text-sm font-bold text-orange-500 hover:bg-orange-50 transition-colors"
            >
              <User size={16} /> Xem người bán
            </Link>
            <button
              onClick={() => {
                if (navigator.share) navigator.share({ title: item.item_name, url: window.location.href })
                else navigator.clipboard.writeText(window.location.href).then(() => alert('Đã copy link!'))
              }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 active:scale-[0.98] transition-all"
            >
              <Share2 size={16} /> Chia sẻ
            </button>
          </>
        )}
      </div>
    </div>
  )
}
