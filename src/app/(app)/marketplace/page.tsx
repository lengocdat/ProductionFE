"use client"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import {
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Tag,
  ShieldCheck,
} from "lucide-react"
import { useState } from "react"

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

const MOCK_ITEMS: MarketItem[] = [
  { id: 1, seller_id: 1, item_name: 'Vợt Yonex Astrox 88D Pro', description: 'Vợt chính hãng, đã thay lưới 1 lần. Cân nặng 83g. Phù hợp lối đánh tấn công mạnh.', category: 'RACKET', sport_type: 'BADMINTON', price: 2500000, original_price: 4200000, condition: 'GOOD', images: ['/placeholder-racket.jpg'], location_address: 'Quận 7, TP.HCM', status: 'ACTIVE', view_count: 45, created_at: '2026-06-01', seller: { id: 1, username: 'host_minh', trusted_seller: true } },
  { id: 2, seller_id: 2, item_name: 'Giày Victor A922 size 42', description: 'Mới mua 2 tuần, đi không vừa size nên bán lại. Còn hộp đầy đủ.', category: 'SHOES', sport_type: 'BADMINTON', price: 800000, original_price: 1200000, condition: 'LIKE_NEW', images: ['/placeholder-shoes.jpg'], location_address: 'Bình Thạnh, TP.HCM', status: 'ACTIVE', view_count: 23, created_at: '2026-06-01', seller: { id: 2, username: 'player_an', trusted_seller: false } },
  { id: 3, seller_id: 1, item_name: 'Túi vợt Lining 6 ngăn', description: 'Túi đựng 6 vợt, có ngăn giày riêng. Màu đen xanh.', category: 'BAG', sport_type: 'BADMINTON', price: 350000, condition: 'GOOD', images: ['/placeholder-bag.jpg'], location_address: 'Quận 1, TP.HCM', status: 'ACTIVE', view_count: 12, created_at: '2026-05-30', seller: { id: 1, username: 'host_minh', trusted_seller: true } },
  { id: 4, seller_id: 2, item_name: 'Cầu RSL Classic xài dở (8 quả)', description: 'Hộp 12 quả còn 8, cầu tốt bay ổn định. Bán rẻ cho ai cần tập.', category: 'SHUTTLECOCK', sport_type: 'BADMINTON', price: 120000, condition: 'FAIR', images: ['/placeholder-shuttle.jpg'], location_address: 'Tân Bình, TP.HCM', status: 'ACTIVE', view_count: 8, created_at: '2026-05-29', seller: { id: 2, username: 'player_an', trusted_seller: false } },
  { id: 5, seller_id: 1, item_name: 'Áo Yonex chính hãng size L', description: 'Áo thi đấu Yonex Japan market. Chất vải thấm hút mồ hôi cực tốt.', category: 'CLOTHING', sport_type: 'BADMINTON', price: 450000, original_price: 900000, condition: 'LIKE_NEW', images: ['/placeholder-shirt.jpg'], location_address: 'Quận 3, TP.HCM', status: 'ACTIVE', view_count: 31, created_at: '2026-05-28', seller: { id: 1, username: 'host_minh', trusted_seller: true } },
  { id: 6, seller_id: 2, item_name: 'Quấn cán vợt Kumpoo (10 cuộn)', description: 'Quấn cán xịn, bám tay, không trơn. Bán nguyên lốc 10 cuộn.', category: 'ACCESSORY', sport_type: 'BADMINTON', price: 150000, condition: 'NEW', images: ['/placeholder-grip.jpg'], location_address: 'Gò Vấp, TP.HCM', status: 'ACTIVE', view_count: 5, created_at: '2026-05-27', seller: { id: 2, username: 'player_an', trusted_seller: false } },
]

export function ItemDetailModal({
  item,
  open,
  onClose,
}: {
  item: MarketItem | null
  open: boolean
  onClose: () => void
}) {
  const [currentImage, setCurrentImage] = useState(0)

  if (!item) return null

  const cond = CONDITION_LABELS[item.condition] || CONDITION_LABELS["GOOD"]

  const hasDiscount =
    item.original_price && item.original_price > item.price

  const discountPercent = hasDiscount
    ? Math.round((1 - item.price / item.original_price!) * 100)
    : 0

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full max-w-md h-[100dvh] sm:h-auto sm:rounded-2xl overflow-hidden flex flex-col bg-white">

        {/* ================= HERO IMAGE ================= */}
        <div className="relative aspect-square bg-black flex items-center justify-center">
          <span className="text-6xl opacity-30">
            {item.category === "RACKET"
              ? "🏸"
              : item.category === "SHOES"
              ? "👟"
              : item.category === "CLOTHING"
              ? "👕"
              : "📦"}
          </span>

          {/* top bar */}
          <div className="absolute top-0 left-0 right-0 p-3 flex justify-between">
            <button
              onClick={onClose}
              className="bg-black/40 text-white px-3 py-1 rounded-full text-xs"
            >
              ← Quay lại
            </button>

            <div className="bg-black/40 text-white px-2 py-1 rounded-full text-[10px]">
              {item.images?.length || 1}
            </div>
          </div>

          {/* condition badge */}
          <span
            className={`absolute top-3 left-3 rounded-lg px-2 py-1 text-[10px] font-semibold ${cond.color}`}
          >
            {cond.label}
          </span>

          {/* nav */}
          {item.images?.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentImage((p) => Math.max(0, p - 1))
                }
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-1.5 rounded-full"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() =>
                  setCurrentImage((p) =>
                    Math.min(item.images.length - 1, p + 1)
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-1.5 rounded-full"
              >
                <ChevronRight size={16} />
              </button>

              {/* dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {item.images.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === currentImage
                        ? "bg-white"
                        : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ================= CONTENT ================= */}
        <div className="flex-1 overflow-y-auto pb-24">

          {/* PRICE + TITLE */}
          <div className="p-4 border-b">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">
                {formatVND(item.price)}
              </span>

              {hasDiscount && (
                <>
                  <span className="text-xs text-gray-400 line-through">
                    {formatVND(item.original_price!)}
                  </span>

                  <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded">
                    -{discountPercent}%
                  </span>
                </>
              )}
            </div>

            <h1 className="text-sm font-semibold mt-2 leading-snug">
              {item.item_name}
            </h1>
          </div>

          {/* META INFO */}
          <div className="p-4 space-y-2 text-[11px] text-gray-600">
            <div className="flex justify-between">
              <span>Danh mục</span>
              <span className="font-medium">{item.category}</span>
            </div>

            <div className="flex justify-between">
              <span>Địa điểm</span>
              <span>{item.location_address}</span>
            </div>

            <div className="flex justify-between">
              <span>Lượt xem</span>
              <span>{item.view_count}</span>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="p-4 border-t">
            <h4 className="text-sm font-semibold mb-1">
              Mô tả
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              {item.description}
            </p>
          </div>

          {/* SELLER */}
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                  {item.seller?.username?.charAt(0)}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold">
                      {item.seller?.username}
                    </span>

                    {item.seller?.trusted_seller && (
                      <ShieldCheck
                        size={14}
                        className="text-amber-500"
                      />
                    )}
                  </div>

                  <p className="text-[10px] text-gray-500">
                    {item.seller?.trusted_seller
                      ? "⭐ Uy tín"
                      : "Người bán"}
                  </p>
                </div>
              </div>

              <button className="text-green-600 text-sm font-medium">
                Xem shop →
              </button>
            </div>
          </div>
        </div>

        {/* ================= STICKY CTA ================= */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white border-t flex gap-2 sm:relative">
          <button
            onClick={onClose}
            className="flex-1 border rounded-xl py-3 text-sm"
          >
            Đóng
          </button>

          <button className="flex-1 bg-green-500 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
            <MessageSquare size={16} />
            Chat ngay
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}