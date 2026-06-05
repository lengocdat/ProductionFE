'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, Plus, CheckCircle2, Loader2, Package, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { clsx } from 'clsx'

interface MarketItem {
  id: number
  item_name: string
  category: string
  price_vnd: number
  original_price?: number
  condition: string
  image_urls: string[]
  status: string
  view_count: number
  created_at: string
}

const CAT_ICON: Record<string, string> = {
  RACKET: '🏸', SHOES: '👟', CLOTHING: '👕', SHUTTLECOCK: '🪶',
  BALL: '⚽', BAG: '🎒', ACCESSORY: '🧢', OTHER: '📦',
}

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ' }

export default function MyListingsPage() {
  const router = useRouter()
  const [items, setItems] = useState<MarketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState<number | null>(null)
  const [tab, setTab] = useState<'active' | 'sold'>('active')

  async function load() {
    setLoading(true)
    try {
      const res = await apiFetch<{ items: MarketItem[] }>('/market/items/my')
      setItems(res.items || [])
    } catch {
      toast.error('Không thể tải danh sách')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function markSold(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    setMarking(id)
    try {
      await apiFetch(`/market/items/${id}/sold`, { method: 'POST' })
      toast.success('Đã đánh dấu đã bán!')
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'SOLD' } : i))
    } catch (err: any) {
      toast.error(err.message || 'Có lỗi xảy ra')
    } finally {
      setMarking(null)
    }
  }

  const active = items.filter(i => i.status !== 'SOLD')
  const sold = items.filter(i => i.status === 'SOLD')
  const displayed = tab === 'active' ? active : sold

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-3 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-bold text-gray-900">Tin đăng của tôi</h1>
        <Link href="/marketplace/sell" className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600">
          <Plus size={14} /> Đăng bán
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border-b">
        <button
          onClick={() => setTab('active')}
          className={clsx(
            'flex-1 py-3 text-sm font-semibold transition-colors border-b-2',
            tab === 'active' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Đang bán
          {active.length > 0 && (
            <span className="ml-1.5 rounded-full bg-orange-500 px-1.5 py-px text-[10px] font-bold text-white">
              {active.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sold')}
          className={clsx(
            'flex-1 py-3 text-sm font-semibold transition-colors border-b-2',
            tab === 'sold' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          Đã bán
          {sold.length > 0 && (
            <span className="ml-1.5 rounded-full bg-gray-400 px-1.5 py-px text-[10px] font-bold text-white">
              {sold.length}
            </span>
          )}
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-px bg-gray-200">
        {[
          { label: 'Tổng tin', value: items.length },
          { label: 'Đang bán', value: active.length },
          { label: 'Đã bán', value: sold.length },
        ].map(s => (
          <div key={s.label} className="bg-white py-3 text-center">
            <p className="text-base font-black text-gray-900">{s.value}</p>
            <p className="text-[10px] text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="p-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 rounded-xl bg-white p-3 animate-pulse">
                <div className="h-20 w-20 shrink-0 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-4/5" />
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            {tab === 'active' ? (
              <>
                <ShoppingBag size={40} className="mb-3 text-gray-200" />
                <p className="text-sm font-medium">Chưa có tin đăng nào</p>
                <Link href="/marketplace/sell" className="mt-4 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white">
                  Đăng bán ngay
                </Link>
              </>
            ) : (
              <>
                <Package size={40} className="mb-3 text-gray-200" />
                <p className="text-sm font-medium">Chưa có sản phẩm nào đã bán</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(item => (
              <div
                key={item.id}
                onClick={() => router.push(`/marketplace/${item.id}`)}
                className="flex gap-3 rounded-xl bg-white p-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {/* Image */}
                <div className="relative h-20 w-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {item.image_urls?.[0] ? (
                    <img src={item.image_urls[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-2xl">{CAT_ICON[item.category] || '📦'}</span>
                    </div>
                  )}
                  {item.status === 'SOLD' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">ĐÃ BÁN</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{item.item_name}</h3>
                  <p className="mt-1 text-sm font-bold text-red-500">{fmt(item.price_vnd)}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Eye size={10} /> {item.view_count}
                    </span>
                    <span className="text-[10px] text-gray-300">·</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Actions */}
                  {item.status !== 'SOLD' && (
                    <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => markSold(item.id, e)}
                        disabled={marking === item.id}
                        className="flex items-center gap-1 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                      >
                        {marking === item.id
                          ? <Loader2 size={10} className="animate-spin" />
                          : <CheckCircle2 size={10} />}
                        Đánh dấu đã bán
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
