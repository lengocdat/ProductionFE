'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Camera } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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
  { value: 'LIKE_NEW', label: 'Như mới' },
  { value: 'GOOD', label: 'Tốt 95%' },
  { value: 'FAIR', label: 'Khá 90%' },
  { value: 'WORN', label: 'Đã dùng nhiều' },
]

// --- Helpers ---
function fmtPrice(raw: string): string {
  const n = raw.replace(/\D/g, '')
  return n ? parseInt(n).toLocaleString('vi-VN') : ''
}

function parsePrice(s: string): number {
  return parseInt(s.replace(/\D/g, '') || '0')
}

// Upload images to /api/v1/upload, returns array of URLs
async function uploadImages(files: File[]): Promise<string[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const fd = new FormData()
  files.forEach(f => fd.append('images', f))

  const res = await fetch('/api/v1/upload', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Upload thất bại')
  }
  const data = await res.json()
  return data.urls || []
}

// --- Validation ---
interface FormErrors {
  images?: string
  item_name?: string
  category?: string
  condition?: string
  price?: string
  description?: string
  location_address?: string
}

interface FormState {
  item_name: string
  category: string
  condition: string
  price_display: string
  original_price_display: string
  description: string
  location_address: string
}

function validate(form: FormState, images: File[]): FormErrors {
  const errors: FormErrors = {}
  if (images.length === 0) errors.images = 'Vui lòng thêm ít nhất 1 hình ảnh'
  if (!form.item_name.trim()) errors.item_name = 'Tên sản phẩm là bắt buộc'
  else if (form.item_name.length > 200) errors.item_name = 'Tối đa 200 ký tự'
  if (!form.category) errors.category = 'Vui lòng chọn danh mục'
  if (!form.condition) errors.condition = 'Vui lòng chọn tình trạng'
  if (parsePrice(form.price_display) <= 0) errors.price = 'Giá bán phải lớn hơn 0'
  if (form.description.trim().length > 0 && form.description.trim().length < 10) errors.description = 'Mô tả quá ngắn (tối thiểu 10 ký tự)'
  return errors
}

// Simple multi-image picker (no external component dependency issues)
function ImagePicker({ files, onChange, error }: { files: File[]; onChange: (f: File[]) => void; error?: string }) {
  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []).slice(0, 5 - files.length)
    onChange([...files, ...picked].slice(0, 5))
    e.target.value = ''
  }

  function remove(i: number) {
    onChange(files.filter((_, idx) => idx !== i))
  }

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {files.map((f, i) => (
          <div key={i} className="relative shrink-0 h-20 w-20 rounded-xl overflow-hidden border border-gray-200">
            <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] font-bold hover:bg-black/80"
            >
              ×
            </button>
          </div>
        ))}
        {files.length < 5 && (
          <label className="shrink-0 flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50 transition-colors">
            <Camera size={20} className="text-gray-400" />
            <span className="text-[9px] text-gray-400">{files.length}/5</span>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handlePick} />
          </label>
        )}
      </div>
      {error && <p className="text-[11px] text-red-500 mt-1.5">{error}</p>}
    </div>
  )
}

export default function SellItemPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [images, setImages] = useState<File[]>([])

  const [form, setForm] = useState<FormState>({
    item_name: '',
    category: 'RACKET',
    condition: '',
    price_display: '',
    original_price_display: '',
    description: '',
    location_address: '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: undefined }))
  }

  function handlePriceChange(field: 'price_display' | 'original_price_display') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '')
      setForm(f => ({ ...f, [field]: fmtPrice(raw) }))
      if (field === 'price_display') setErrors(prev => ({ ...prev, price: undefined }))
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setSubmitError('')

    const validationErrors = validate(form, images)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      // Step 1: upload images
      setUploadProgress('Đang tải ảnh...')
      const imageUrls = await uploadImages(images)

      // Step 2: create listing
      setUploadProgress('Đang đăng tin...')
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
      const body: Record<string, unknown> = {
        item_name: form.item_name.trim(),
        category: form.category,
        condition: form.condition,
        price: parsePrice(form.price_display),
        images: imageUrls,
      }
      if (form.description.trim()) body.description = form.description.trim()
      if (form.location_address.trim()) body.location_address = form.location_address.trim()
      const origPrice = parsePrice(form.original_price_display)
      if (origPrice > 0) body.original_price = origPrice

      const res = await fetch('/api/v1/market/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err.error || 'Đăng tin thất bại')
      }

      toast.success('Đã đăng bán thành công!')
      router.push('/marketplace/my')
    } catch (err: any) {
      setSubmitError(err.message || 'Có lỗi xảy ra')
    } finally {
      setSubmitting(false)
      setUploadProgress('')
    }
  }

  const sellPrice = parsePrice(form.price_display)
  const origPrice = parsePrice(form.original_price_display)
  const hasDiscount = origPrice > sellPrice && origPrice > 0 && sellPrice > 0

  return (
    <div className="mx-auto max-w-md pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm">
        <Link href="/marketplace" className="p-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-base font-bold text-gray-900">Đăng bán sản phẩm</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 space-y-5">
        {/* Images */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Hình ảnh <span className="text-red-400">*</span>
            <span className="ml-1 text-[10px] font-normal text-gray-400">tối đa 5 ảnh</span>
          </label>
          <ImagePicker files={images} onChange={f => { setImages(f); setErrors(p => ({ ...p, images: undefined })) }} error={errors.images} />
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Tên sản phẩm <span className="text-red-400">*</span>
          </label>
          <input
            name="item_name"
            value={form.item_name}
            onChange={handleChange}
            maxLength={200}
            placeholder="VD: Vợt Yonex Astrox 88D Pro"
            className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 transition-colors ${
              errors.item_name ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.item_name && <p className="text-[11px] text-red-500">{errors.item_name}</p>}
            <p className="text-[10px] text-gray-400 ml-auto">{form.item_name.length}/200</p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Danh mục <span className="text-red-400">*</span>
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-400 ${
              errors.category ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <option value="" disabled>Chọn danh mục</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {errors.category && <p className="text-[11px] text-red-500 mt-1">{errors.category}</p>}
        </div>

        {/* Condition */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-2 block">
            Tình trạng <span className="text-red-400">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => { setForm(f => ({ ...f, condition: c.value })); setErrors(p => ({ ...p, condition: undefined })) }}
                className={`rounded-full px-4 py-2 text-xs font-medium border transition-all ${
                  form.condition === c.value
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {errors.condition && <p className="text-[11px] text-red-500 mt-1.5">{errors.condition}</p>}
        </div>

        {/* Prices row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Giá bán <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                value={form.price_display}
                onChange={handlePriceChange('price_display')}
                inputMode="numeric"
                placeholder="0"
                className={`w-full rounded-xl border pl-3 pr-10 py-2.5 text-sm font-medium outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 ${
                  errors.price ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
            </div>
            {errors.price && <p className="text-[11px] text-red-500 mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Giá gốc
              <span className="ml-1 text-[9px] font-normal text-gray-400">(tùy chọn)</span>
            </label>
            <div className="relative">
              <input
                value={form.original_price_display}
                onChange={handlePriceChange('original_price_display')}
                inputMode="numeric"
                placeholder="0"
                className="w-full rounded-xl border border-gray-200 pl-3 pr-10 py-2.5 text-sm font-medium outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">đ</span>
            </div>
          </div>
        </div>

        {/* Discount preview */}
        {hasDiscount && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 px-3 py-2 text-xs text-orange-700 font-medium">
            🏷️ Giảm {Math.round((1 - sellPrice / origPrice) * 100)}% so với giá gốc
          </div>
        )}

        {/* Location */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Địa chỉ <span className="text-[10px] font-normal text-gray-400">(tùy chọn)</span>
          </label>
          <input
            name="location_address"
            value={form.location_address}
            onChange={handleChange}
            placeholder="VD: Quận 1, TP. Hồ Chí Minh"
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
            Mô tả chi tiết <span className="text-[10px] font-normal text-gray-400">(tùy chọn)</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Nêu rõ tình trạng, vết xước, nguồn gốc mua hàng, lý do bán..."
            className={`w-full rounded-xl border px-4 py-2.5 text-sm resize-none outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-100 ${
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
        {uploadProgress && (
          <p className="text-center text-xs text-orange-600 font-medium mb-2">{uploadProgress}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 shadow-md shadow-orange-200 transition-all"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> {uploadProgress || 'Đang xử lý...'}
            </span>
          ) : (
            '🛍️ Đăng Bán'
          )}
        </button>
      </div>
    </div>
  )
}
