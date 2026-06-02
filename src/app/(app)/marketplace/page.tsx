'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, ShieldCheck, ChevronLeft, ChevronRight, MessageSquare, X, Tag } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

// --- Types ---
interface MarketItem {
  id: number
  seller_id: number
  item_name: string
  description: string
  category: string
  sport_type: string
  price: number
  original_price?: number
  condition: string
  images: string[]
  location_address: string
  status: string
  view_count: number
  created_at: string
  seller?: {
    id: number
    username: string
    trusted_seller: boolean
    avatar_url?: string
  }
}

// --- Constants ---
const CATEGORIES = [
  { value: '', label: 'Tất cả', icon: '🛍️' },
  { value: 'RACKET', label: 'Vợt', icon: '🏸' },
  { value: 'SHOES', label: 'Giày', icon: '👟' },
  { value: 'CLOTHING', label: 'Quần áo', icon: '👕' },
  { value: 'SHUTTLECOCK', label: 'Cầu', icon: '🪶' },
  { value: 'BALL', label: 'Bóng', icon: '⚽' },
  { value: 'BAG', label: 'Túi/Balo', icon: '🎒' },
  { value: 'ACCESSORY', label: 'Phụ kiện', icon: '🧢' },
  { value: 'OTHER', label: 'Khác', icon: '📦' },
]

const CONDITION_LABELS: Record<string, { label: string; color: string }> = {
  'NEW': { label: 'Mới 100%', color: 'bg-green-100 text-green-700' },
  'LIKE_NEW': { label: 'Như mới 99%', color: 'bg-emerald-50 text-emerald-700' },
  'GOOD': { label: 'Tốt 90%', color: 'bg-blue-50 text-blue-700' },
  'FAIR': { label: 'Khá 80%', color: 'bg-yellow-50 text-yellow-700' },
  'WORN': { label: 'Đã qua sử dụng', color: 'bg-gray-100 text-gray-600' },
}

function formatVND(price: number): string {
  return price.toLocaleString('vi-VN') + 'đ'
}

// --- MOCK DATA (replace with real API when backend ready) ---
const MOCK_ITEMS: MarketItem[] = [
  { id: 1, seller_id: 1, item_name: 'Vợt Yonex Astrox 88D Pro', description: 'Vợt chính hãng, đã thay lưới 1 lần. Cân nặng 83g. Phù hợp lối đánh tấn công mạnh.', category: 'RACKET', sport_type: 'BADMINTON', price: 2500000, original_price: 4200000, condition: 'GOOD', images: ['/placeholder-racket.jpg'], location_address: 'Quận 7, TP.HCM', status: 'ACTIVE', view_count: 45, created_at: '2026-06-01', seller: { id: 1, username: 'host_minh', trusted_seller: true } },
  { id: 2, seller_id: 2, item_name: 'Giày Victor A922 size 42', description: 'Mới mua 2 tuần, đi không vừa size nên bán lại. Còn hộp đầy đủ.', category: 'SHOES', sport_type: 'BADMINTON', price: 800000, original_price: 1200000, condition: 'LIKE_NEW', images: ['/placeholder-shoes.jpg'], location_address: 'Bình Thạnh, TP.HCM', status: 'ACTIVE', view_count: 23, created_at: '2026-06-01', seller: { id: 2, username: 'player_an', trusted_seller: false } },
  { id: 3, seller_id: 1, item_name: 'Túi vợt Lining 6 ngăn', description: 'Túi đựng 6 vợt, có ngăn giày riêng. Màu đen xanh.', category: 'BAG', sport_type: 'BADMINTON', price: 350000, condition: 'GOOD', images: ['/placeholder-bag.jpg'], location_address: 'Quận 1, TP.HCM', status: 'ACTIVE', view_count: 12, created_at: '2026-05-30', seller: { id: 1, username: 'host_minh', trusted_seller: true } },
  { id: 4, seller_id: 2, item_name: 'Cầu RSL Classic xài dở (8 quả)', description: 'Hộp 12 quả còn 8, cầu tốt bay ổn định. Bán rẻ cho ai cần tập.', category: 'SHUTTLECOCK', sport_type: 'BADMINTON', price: 120000, condition: 'FAIR', images: ['/placeholder-shuttle.jpg'], location_address: 'Tân Bình, TP.HCM', status: 'ACTIVE', view_count: 8, created_at: '2026-05-29', seller: { id: 2, username: 'player_an', trusted_seller: false } },
  { id: 5, seller_id: 1, item_name: 'Áo Yonex chính hãng size L', description: 'Áo thi đấu Yonex Japan market. Chất vải thấm hút mồ hôi cực tốt.', category: 'CLOTHING', sport_type: 'BADMINTON', price: 450000, original_price: 900000, condition: 'LIKE_NEW', images: ['/placeholder-shirt.jpg'], location_address: 'Quận 3, TP.HCM', status: 'ACTIVE', view_count: 31, created_at: '2026-05-28', seller: { id: 1, username: 'host_minh', trusted_seller: true } },
  { id: 6, seller_id: 2, item_name: 'Quấn cán vợt Kumpoo (10 cuộn)', description: 'Quấn cán xịn, bám tay, không trơn. Bán nguyên lốc 10 cuộn.', category: 'ACCESSORY', sport_type: 'BADMINTON', price: 150000, condition: 'NEW', images: ['/placeholder-grip.jpg'], location_address: 'Gò Vấp, TP.HCM', status: 'ACTIVE', view_count: 5, created_at: '2026-05-27', seller: { id: 2, username: 'player_an', trusted_seller: false } },
]

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketItem[]>(MOCK_ITEMS)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null)

  // In production, fetch from API:
  // useEffect(() => {
  //   apiFetch<{ items: MarketItem[] }>(`/market/items?category=${categoryFilter}&q=${searchQuery}`)
  //     .then((d) => setItems(d.items || []))
  // }, [categoryFilter, searchQuery])

  const filteredItems = items.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) return false
    if (searchQuery && !item.item_name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="px-4 pt-3 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-gray-900">🛍️ Chợ đồ thể thao</h1>
        <Link href="/marketplace/sell" className="rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600">
          + Đăng bán
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm vợt, giày, phụ kiện..."
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm outline-none focus:border-green-400"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategoryFilter(cat.value)}
            className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap transition-all ${
              categoryFilter === cat.value
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Masonry Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-3xl mb-2">📦</p>
          <p className="text-sm">Không có sản phẩm nào</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 space-y-3">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} onClick={() => setSelectedItem(item)} />
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}

// --- Item Card (Masonry) ---
function ItemCard({ item, onClick }: { item: MarketItem; onClick: () => void }) {
  const cond = CONDITION_LABELS[item.condition] || CONDITION_LABELS['GOOD']
  const hasDiscount = item.original_price && item.original_price > item.price

  return (
    <div
      onClick={onClick}
      className="break-inside-avoid rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-shadow"
    >
      {/* Image placeholder */}
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-square flex items-center justify-center">
        <span className="text-4xl opacity-50">
          {item.category === 'RACKET' ? '🏸' : item.category === 'SHOES' ? '👟' : item.category === 'CLOTHING' ? '👕' : item.category === 'BAG' ? '🎒' : '📦'}
        </span>
        {/* Condition badge */}
        <span className={`absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${cond.color}`}>
          {cond.label}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{item.item_name}</h3>

        {/* Price */}
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-red-600">{formatVND(item.price)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">{formatVND(item.original_price!)}</span>
          )}
        </div>

        {/* Seller */}
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[8px] font-bold text-gray-600">
            {item.seller?.username.charAt(0).toUpperCase()}
          </div>
          <span className="text-[10px] text-gray-600 truncate">{item.seller?.username}</span>
          {item.seller?.trusted_seller && (
            <span className="group relative">
              <ShieldCheck size={12} className="text-amber-500 fill-amber-50" />
              {/* Tooltip */}
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-36 rounded-lg bg-gray-900 px-2 py-1 text-[9px] text-white text-center shadow-lg">
                Người bán uy tín: Đánh giá &gt;4.5 sao trên 10+ giao dịch
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Item Detail Modal ---
function ItemDetailModal({ item, onClose }: { item: MarketItem; onClose: () => void }) {
  const [currentImage, setCurrentImage] = useState(0)
  const cond = CONDITION_LABELS[item.condition] || CONDITION_LABELS['GOOD']
  const hasDiscount = item.original_price && item.original_price > item.price
  const discountPercent = hasDiscount ? Math.round((1 - item.price / item.original_price!) * 100) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-md bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto">
        {/* Image Slider */}
        <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 aspect-[4/3] flex items-center justify-center">
          <span className="text-6xl opacity-40">
            {item.category === 'RACKET' ? '🏸' : item.category === 'SHOES' ? '👟' : '📦'}
          </span>

          {/* Close button */}
          <button onClick={onClose} className="absolute top-3 right-3 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm hover:bg-black/50">
            <X size={18} />
          </button>

          {/* Image navigation (if multiple) */}
          {item.images.length > 1 && (
            <>
              <button onClick={() => setCurrentImage((p) => Math.max(0, p - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setCurrentImage((p) => Math.min(item.images.length - 1, p + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 shadow">
                <ChevronRight size={16} />
              </button>
              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === currentImage ? 'bg-white' : 'bg-white/50'}`} />
                ))}
              </div>
            </>
          )}

          {/* Condition badge */}
          <span className={`absolute top-3 left-3 rounded-lg px-2 py-1 text-[10px] font-semibold ${cond.color}`}>
            {cond.label}
          </span>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title */}
          <h2 className="text-lg font-bold text-gray-900">{item.item_name}</h2>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold text-red-600">{formatVND(item.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-sm text-gray-400 line-through">{formatVND(item.original_price!)}</span>
                <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">-{discountPercent}%</span>
              </>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] text-gray-600 flex items-center gap-1">
              <Tag size={10} /> {item.category}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] text-gray-600">
              📍 {item.location_address}
            </span>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] text-gray-600">
              👁️ {item.view_count} lượt xem
            </span>
          </div>

          {/* Description */}
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Mô tả</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
          </div>

          {/* Seller Card */}
          <div className="mt-4 rounded-xl border border-gray-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                {item.seller?.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-gray-900">{item.seller?.username}</span>
                  {item.seller?.trusted_seller && (
                    <span className="group relative">
                      <ShieldCheck size={14} className="text-amber-500 fill-amber-50" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-40 rounded-lg bg-gray-900 px-2 py-1.5 text-[9px] text-white text-center shadow-lg z-10">
                        🏆 Người bán uy tín<br/>Đánh giá &gt;4.5⭐ trên 10+ giao dịch
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500">
                  {item.seller?.trusted_seller ? '⭐ Người bán uy tín' : 'Người bán'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Đóng
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 shadow-sm"
            >
              <MessageSquare size={16} /> Chat với người bán
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
