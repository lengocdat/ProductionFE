'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, SlidersHorizontal, ShieldCheck, Store, Plus, X, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  }
}

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

const CAT_ICON: Record<string, string> = {
  RACKET: '🏸', SHOES: '👟', CLOTHING: '👕', SHUTTLECOCK: '🪶',
  BALL: '⚽', BAG: '🎒', ACCESSORY: '🧢', OTHER: '📦',
}

const CONDITION_LABEL: Record<string, { text: string; color: string }> = {
  NEW:      { text: 'Mới 100%',  color: 'bg-green-500 text-white' },
  LIKE_NEW: { text: 'Như mới',   color: 'bg-emerald-400 text-white' },
  GOOD:     { text: 'Tốt 95%',   color: 'bg-blue-500 text-white' },
  FAIR:     { text: 'Khá 90%',   color: 'bg-yellow-500 text-white' },
  WORN:     { text: 'Đã dùng',   color: 'bg-gray-500 text-white' },
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp đến cao' },
  { value: 'price_desc', label: 'Giá cao đến thấp' },
]

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ' }

function discountPct(price: number, original: number) {
  return Math.round((1 - price / original) * 100)
}

export default function MarketplacePage() {
  const router = useRouter()
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('newest')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showSort, setShowSort] = useState(false)
  const offsetRef = useRef(0)
  const LIMIT = 20

  const buildQuery = useCallback((cat: string, q: string, offset: number) => {
    const params = new URLSearchParams()
    if (cat) params.set('category', cat)
    if (q) params.set('q', q)
    params.set('limit', String(LIMIT))
    params.set('offset', String(offset))
    return `/market/items?${params.toString()}`
  }, [])

  const sortItems = useCallback((list: MarketItem[], s: string) => {
    return [...list].sort((a, b) => {
      if (s === 'price_asc') return a.price_vnd - b.price_vnd
      if (s === 'price_desc') return b.price_vnd - a.price_vnd
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [])

  const fetchItems = useCallback(async (cat: string, q: string, reset = true) => {
    if (reset) { setLoading(true); offsetRef.current = 0 }
    else setLoadingMore(true)

    try {
      const res = await apiFetch<{ items: MarketItem[] }>(buildQuery(cat, q, offsetRef.current))
      const fetched = res.items || []
      setItems(prev => reset ? fetched : [...prev, ...fetched])
      setHasMore(fetched.length === LIMIT)
      offsetRef.current += fetched.length
    } catch {
      if (reset) setItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [buildQuery])

  useEffect(() => { fetchItems(category, search) }, [category, search])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 500)
    return () => clearTimeout(t)
  }, [searchInput])

  const displayed = sortItems(items, sort)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shopee-style top bar */}
      <div className="sticky top-0 z-30 bg-orange-500 px-3 py-2 shadow-md">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-white px-3 py-2">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Tìm vợt, giày, phụ kiện..."
              className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setSearch('') }}>
                <X size={14} className="text-gray-400" />
              </button>
            )}
          </div>
          <Link href="/marketplace/my" className="p-2 rounded-lg bg-orange-400 hover:bg-orange-300">
            <Store size={18} className="text-white" />
          </Link>
          <Link href="/marketplace/sell" className="p-2 rounded-lg bg-white">
            <Plus size={18} className="text-orange-500" />
          </Link>
        </div>
      </div>

      {/* Category chips */}
      <div className="bg-white border-b">
        <div className="flex gap-1.5 overflow-x-auto py-2.5 px-3 scrollbar-hide">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium whitespace-nowrap border transition-all',
                category === cat.value
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
              )}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort + count bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b">
        <span className="text-[11px] text-gray-500">
          {loading ? '...' : `${items.length} sản phẩm`}
          {search && <span className="text-orange-500"> · "{search}"</span>}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 bg-white"
          >
            <SlidersHorizontal size={12} />
            {SORT_OPTIONS.find(o => o.value === sort)?.label}
            <ChevronDown size={12} className={clsx('transition-transform', showSort && 'rotate-180')} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-xl bg-white shadow-lg border border-gray-100 py-1 overflow-hidden">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => { setSort(o.value); setShowSort(false) }}
                  className={clsx(
                    'w-full px-4 py-2.5 text-left text-xs transition-colors',
                    sort === o.value ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {o.value === sort && '✓ '}{o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="p-2">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white overflow-hidden shadow-sm animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <span className="text-4xl mb-3">📦</span>
            <p className="text-sm font-medium">Không có sản phẩm nào</p>
            <p className="text-xs mt-1">Hãy là người đầu tiên đăng bán!</p>
            <Link href="/marketplace/sell" className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white">
              Đăng bán ngay
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {displayed.map(item => (
                <ItemCard key={item.id} item={item} onClick={() => router.push(`/marketplace/${item.id}`)} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <button
                onClick={() => fetchItems(category, search, false)}
                disabled={loadingMore}
                className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition"
              >
                {loadingMore ? 'Đang tải...' : 'Xem thêm sản phẩm'}
              </button>
            )}
            {!hasMore && items.length > 0 && (
              <p className="mt-4 text-center text-xs text-gray-400 py-2">— Hết sản phẩm —</p>
            )}
          </>
        )}
      </div>

      {/* Floating sell button */}
      <Link
        href="/marketplace/sell"
        className="fixed bottom-20 right-4 z-20 flex items-center gap-2 rounded-full bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all"
      >
        <Plus size={18} /> Đăng bán
      </Link>
    </div>
  )
}

function ItemCard({ item, onClick }: { item: MarketItem; onClick: () => void }) {
  const cond = CONDITION_LABEL[item.condition]
  const hasDiscount = item.original_price && item.original_price > item.price_vnd
  const pct = hasDiscount ? discountPct(item.price_vnd, item.original_price!) : 0
  const isSold = item.status === 'SOLD'
  const coverImg = item.image_urls?.[0]

  return (
    <div
      onClick={onClick}
      className="relative rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md cursor-pointer transition-shadow active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {coverImg ? (
          <img src={coverImg} alt={item.item_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-40">{CAT_ICON[item.category] || '📦'}</span>
          </div>
        )}
        {/* Discount badge */}
        {hasDiscount && !isSold && (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            -{pct}%
          </span>
        )}
        {/* Condition badge */}
        {cond && !isSold && (
          <span className={clsx('absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[8px] font-semibold', cond.color)}>
            {cond.text}
          </span>
        )}
        {/* Sold overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">ĐÃ BÁN</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <h3 className="text-[12px] font-medium text-gray-900 line-clamp-2 leading-tight mb-1.5">
          {item.item_name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold text-red-500">{fmt(item.price_vnd)}</span>
          {hasDiscount && (
            <span className="text-[10px] text-gray-400 line-through">{fmt(item.original_price!)}</span>
          )}
        </div>
        {/* Seller + location */}
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex items-center gap-1">
            <div className="h-4 w-4 rounded-full bg-orange-100 flex items-center justify-center text-[8px] font-bold text-orange-600 overflow-hidden">
              {item.seller?.avatar_url
                ? <img src={item.seller.avatar_url} className="w-full h-full object-cover" alt="" />
                : item.seller?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px] text-gray-500 truncate max-w-[65px]">{item.seller?.username}</span>
            {item.seller?.trusted_seller && <ShieldCheck size={10} className="text-amber-500 shrink-0" />}
          </div>
          {item.location_address && (
            <span className="text-[9px] text-gray-400 truncate max-w-[55px]">
              {item.location_address.split(',').pop()?.trim()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
