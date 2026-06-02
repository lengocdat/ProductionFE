'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import MultiImageUploader from '@/components/MultiImageUploader'
import Link from 'next/link'

// --- Constants ---
const CATEGORIES = [
  { value: 'RACKET', label: 'Vợt' },
  { value: 'SHOES', label: 'Giày' },
  { value: 'CLOTHING', label: 'Quần áo' },
  { value: 'ACCESSORY', label: 'Phụ kiện' },
  { value: 'SHUTTLECOCK', label: 'Cầu / Bóng' },
  { value: 'BAG', label: 'Túi / Balo' },
  { value: 'OTHER', label: 'Khác' },
]

const CONDITIONS = [
  { value: 'NEW', label: 'Mới 100%' },
  { value: 'LIKE_NEW', label: '99%' },
  { value: 'GOOD', label: '95%' },
  { value: 'FAIR', label: '90%' },
  { value: 'WORN', label: 'Đã dùng nhiều' },
]

// --- Helpers ---
function formatPrice(value: string): string {
  const num = value.replace(/\D/g, '')
  if (!num) return ''
  return parseInt(num).toLocaleString('vi-VN')
}

function parsePrice(formatted: string): number {
  return parseInt(formatted.replace(/\D/g, '') || '0')
}

// --- Validation ---
interface FormErrors {
  images?: string
  item_name?: string
  category?: string
  condition?: string
  price?: string
  description?: string
}

function validate(form: FormState, images: File[]): FormErrors {
  const errors: FormErrors = {}
  if (images.length === 0) errors.images = 'Vui lòng thêm ít nhất 1 hình ảnh'
  if (!form.item_name.trim()) errors.item_name = 'Tên sản phẩm là bắt buộc'
  else if (form.item_name.length > 70) errors.item_name = 'Tối đa 70 ký tự'
  if (!form.category) errors.category = 'Vui lòng chọn danh mục'
  if (!form.condition) errors.condition = 'Vui lòng chọn tình trạng'
  const price = parsePrice(form.price_display)
  if (price <= 0) errors.price = 'Giá phải lớn hơn 0'
  if (form.description.trim().length > 0 && form.description.trim().length < 10) errors.description = 'Mô tả quá ngắn (tối thiểu 10 ký tự)'
  return errors
}

interface FormState {
  item_name: string
  category: string
  condition: string
  price_display: string
  description: string
}

export default function SellItemPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [images, setImages] = useState<File[]>([])

  const [form, setForm] = useState<FormState>({
    item_name: '',
    category: 'RACKET',
    condition: '',
    price_display: '',
    description: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handlePriceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setForm((f) => ({ ...f, price_display: formatPrice(raw) }))
    setErrors((prev) => ({ ...prev, price: undefined }))
  }

  function handleConditionSelect(value: string) {
    setForm((f) => ({ ...f, condition: value }))
    setErrors((prev) => ({ ...prev, condition: undefined }))
  }

  function handleImagesChange(files: File[]) {
    setImages(files)
    setErrors((prev) => ({ ...prev, images: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    const validationErrors = validate(form, images)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    try {
      await apiFetch('/market/items', {
        method: 'POST',
        json: {
          item_name: form.item_name.trim(),
          category: form.category,
          condition: form.condition,
          price: parsePrice(form.price_display),
          description: form.description.trim(),
          // images will be uploaded separately when backend supports it
        },
      })
      router.push('/marketplace')
    } catch (err: any) {
      setSubmitError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-3">
        <Link href="/marketplace" className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Đăng bán sản phẩm</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
        {/* Images */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Hình ảnh <span className="text-red-400">*</span>
          </label>
          <MultiImageUploader maxImages={5} onChange={handleImagesChange} />
          {errors.images && <p className="text-[11px] text-red-500 mt-1.5">{errors.images}</p>}
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Tên sản phẩm <span className="text-red-400">*</span>
          </label>
          <input
            name="item_name"
            value={form.item_name}
            onChange={handleChange}
            maxLength={70}
            placeholder="VD: Vợt Yonex Astrox 88D Pro"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 transition-colors ${
              errors.item_name ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.item_name && <p className="text-[11px] text-red-500">{errors.item_name}</p>}
            <p className="text-[10px] text-gray-400 ml-auto">{form.item_name.length}/70</p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Danh mục <span className="text-red-400">*</span>
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:border-green-400 ${
              errors.category ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <option value="" disabled>Chọn danh mục</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {errors.category && <p className="text-[11px] text-red-500 mt-1">{errors.category}</p>}
        </div>

        {/* Condition (Pill Chips) */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Tình trạng <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => handleConditionSelect(c.value)}
                className={`rounded-full px-4 py-2 text-xs font-medium border transition-all duration-200 ${
                  form.condition === c.value
                    ? 'bg-green-500 text-white border-green-500 shadow-sm shadow-green-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.condition && <p className="text-[11px] text-red-500 mt-1.5">{errors.condition}</p>}
        </div>

        {/* Price */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            Giá bán <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              value={form.price_display}
              onChange={handlePriceChange}
              inputMode="numeric"
              placeholder="0"
              className={`w-full rounded-xl border pl-4 pr-12 py-2.5 text-sm font-medium outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 ${
                errors.price ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">VNĐ</span>
          </div>
          {errors.price && <p className="text-[11px] text-red-500 mt-1">{errors.price}</p>}
          {parsePrice(form.price_display) > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">{parsePrice(form.price_display).toLocaleString('vi-VN')} đồng</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Mô tả chi tiết</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Nêu rõ tình trạng, vết xước, nguồn gốc mua hàng..."
            className={`w-full rounded-xl border px-4 py-2.5 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 ${
              errors.description ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.description && <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 text-center">
            {submitError}
          </div>
        )}
      </form>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-gray-200 bg-white px-4 py-3 z-30">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-xl bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-green-200 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Đang đăng...
            </span>
          ) : (
            '🛍️ Đăng Bán'
          )}
        </button>
      </div>
    </div>
  )
}
