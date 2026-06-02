'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Clock, Users, Loader2, CheckCircle2, Navigation, Zap } from 'lucide-react'
import { apiFetch } from '@/lib/api'

// --- Quick Templates ---
interface Template {
  id: number
  icon: string
  label: string
  sport_type: string
  default_title: string
  default_skill_level: string
  default_max_slots: number
}

const FALLBACK_TEMPLATES: Template[] = [
  { id: 1, icon: '🏸', label: 'Giao lưu nhẹ nhàng', sport_type: 'BADMINTON', default_title: 'Giao lưu cầu lông trình trung bình', default_skill_level: 'INTERMEDIATE', default_max_slots: 4 },
  { id: 2, icon: '🏸', label: 'Đánh đôi trình khá', sport_type: 'BADMINTON', default_title: 'Tìm đối đánh đôi trình khá', default_skill_level: 'ADVANCED', default_max_slots: 4 },
  { id: 3, icon: '🏸', label: 'Căng tay bán chuyên', sport_type: 'BADMINTON', default_title: 'Trận căng tay - bán chuyên trở lên', default_skill_level: 'SEMI_PRO', default_max_slots: 2 },
  { id: 4, icon: '🏸', label: 'Tập cho người mới', sport_type: 'BADMINTON', default_title: 'Tập luyện cầu lông cho người mới', default_skill_level: 'BEGINNER', default_max_slots: 6 },
  { id: 5, icon: '⚽', label: 'Đá bóng 5 người', sport_type: 'FOOTBALL', default_title: 'Đá bóng 5 người giao lưu', default_skill_level: 'INTERMEDIATE', default_max_slots: 10 },
  { id: 6, icon: '⚽', label: 'Bóng đá dưỡng sinh', sport_type: 'FOOTBALL', default_title: 'Bóng đá dưỡng sinh cuối tuần', default_skill_level: 'BEGINNER', default_max_slots: 14 },
  { id: 7, icon: '🏀', label: 'Bóng rổ 3v3', sport_type: 'BASKETBALL', default_title: 'Bóng rổ 3v3 giao lưu', default_skill_level: 'INTERMEDIATE', default_max_slots: 6 },
  { id: 8, icon: '🏐', label: 'Bóng chuyền vui', sport_type: 'VOLLEYBALL', default_title: 'Bóng chuyền giao lưu cuối tuần', default_skill_level: 'INTERMEDIATE', default_max_slots: 12 },
]

const SKILL_LABELS: Record<string, string> = {
  'BEGINNER': '🟢 Yếu / Mới chơi',
  'INTERMEDIATE': '🟡 Trung bình',
  'ADVANCED': '🟠 Khá',
  'SEMI_PRO': '🔴 Bán chuyên',
}

interface FormErrors {
  title?: string
  address?: string
  match_date?: string
  end_time?: string
  max_slots?: string
  location?: string
  skill_level?: string
}

export default function CreateMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoSuccess, setGeoSuccess] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [formFlash, setFormFlash] = useState(false)

  const [form, setForm] = useState({
    title: '',
    sport_type: 'BADMINTON',
    skill_level: 'INTERMEDIATE',
    address: '',
    latitude: '',
    longitude: '',
    google_maps_url: '',
    match_date: new Date().toISOString().split('T')[0],
    start_time: '18:00',
    end_time: '20:00',
    max_slots: '4',
  })

  // Apply template
  function applyTemplate(tpl: Template) {
    setSelectedTemplate(tpl.id)
    setForm((f) => ({
      ...f,
      title: tpl.default_title,
      sport_type: tpl.sport_type,
      skill_level: tpl.default_skill_level,
      max_slots: String(tpl.default_max_slots),
    }))
    // Flash animation
    setFormFlash(true)
    setTimeout(() => setFormFlash(false), 600)
    // Clear errors
    setErrors({})
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    // Deselect template if user modifies form manually
    if (['title', 'sport_type', 'skill_level', 'max_slots'].includes(name)) {
      setSelectedTemplate(null)
    }
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setErrors((e) => ({ ...e, location: 'Trình duyệt không hỗ trợ GPS' }))
      return
    }
    setGeoLoading(true)
    setGeoSuccess(false)
    setErrors((e) => ({ ...e, location: undefined }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }))
        setGeoLoading(false)
        setGeoSuccess(true)
        setTimeout(() => setGeoSuccess(false), 3000)
      },
      (err) => {
        setGeoLoading(false)
        setErrors((e) => ({
          ...e,
          location: err.code === 1
            ? 'Bạn đã từ chối quyền truy cập vị trí. Vui lòng bật GPS.'
            : 'Không thể lấy vị trí. Hãy nhập thủ công hoặc dán link Google Maps.',
        }))
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.title.trim() || form.title.length < 3) e.title = 'Tiêu đề phải có ít nhất 3 ký tự'
    if (form.title.length > 150) e.title = 'Tiêu đề tối đa 150 ký tự'
    if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ sân'
    if (!form.match_date) e.match_date = 'Vui lòng chọn ngày'
    if (form.start_time && form.end_time && form.start_time >= form.end_time) e.end_time = 'Giờ kết thúc phải sau giờ bắt đầu'
    const maxSlots = parseInt(form.max_slots)
    if (!maxSlots || maxSlots < 2 || maxSlots > 30) e.max_slots = 'Số slot phải từ 2 đến 30'
    if (!form.latitude || !form.longitude) e.location = 'Vui lòng lấy tọa độ bằng GPS hoặc nhập thủ công'
    if (!form.skill_level) e.skill_level = 'Vui lòng chọn trình độ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setLoading(true)
    try {
      await apiFetch('/matches', {
        method: 'POST',
        json: {
          title: form.title.trim(),
          sport_type: form.sport_type,
          address: form.address.trim(),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          google_maps_url: form.google_maps_url.trim() || undefined,
          match_date: form.match_date,
          start_time: form.start_time,
          end_time: form.end_time,
          max_slots: parseInt(form.max_slots),
        },
      })
      router.push('/chats')
    } catch (err: any) {
      setSubmitError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Tạo trận mới</h1>
      <p className="text-xs text-gray-500 mb-4">Chọn mẫu bên dưới để đăng nhanh trong 3 giây ⚡</p>

      {/* ============ Quick Templates ============ */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap size={14} className="text-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Mẫu nhanh</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {FALLBACK_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl border-2 px-4 py-3 min-w-[110px] transition-all duration-200 ${
                selectedTemplate === tpl.id
                  ? 'border-green-500 bg-green-50 scale-[1.02] shadow-md shadow-green-100'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="text-2xl">{tpl.icon}</span>
              <span className="text-[10px] font-medium text-gray-700 text-center leading-tight">{tpl.label}</span>
              <span className="text-[9px] text-gray-400">{SKILL_LABELS[tpl.default_skill_level]?.split(' ')[0]} · {tpl.default_max_slots}p</span>
            </button>
          ))}
        </div>
      </div>

      {/* ============ Form ============ */}
      <form
        onSubmit={handleSubmit}
        className={`space-y-5 transition-all duration-300 ${formFlash ? 'ring-2 ring-green-300 ring-offset-2 rounded-2xl' : ''}`}
      >
        {/* Title */}
        <FieldGroup label="Tiêu đề trận" required error={errors.title}>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="VD: Tìm 2 người chơi trình khá sân Q7..."
            className={inputClass(errors.title)}
            maxLength={150}
          />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{form.title.length}/150</p>
        </FieldGroup>

        {/* Sport Type + Skill Level (2 columns) */}
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Môn thể thao" required>
            <select name="sport_type" value={form.sport_type} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-400 outline-none">
              <option value="BADMINTON">🏸 Cầu lông</option>
              <option value="FOOTBALL">⚽ Bóng đá</option>
              <option value="BASKETBALL">🏀 Bóng rổ</option>
              <option value="VOLLEYBALL">🏐 Bóng chuyền</option>
              <option value="TABLE_TENNIS">🏓 Bóng bàn</option>
              <option value="TENNIS">🎾 Tennis</option>
              <option value="PICKLEBALL">🏓 Pickleball</option>
              <option value="RUNNING">🏃 Chạy bộ</option>
            </select>
          </FieldGroup>

          <FieldGroup label="Yêu cầu trình độ" required error={errors.skill_level}>
            <select name="skill_level" value={form.skill_level} onChange={handleChange} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-green-400 outline-none">
              <option value="BEGINNER">🟢 Yếu / Mới</option>
              <option value="INTERMEDIATE">🟡 Trung bình</option>
              <option value="ADVANCED">🟠 Khá</option>
              <option value="SEMI_PRO">🔴 Bán chuyên</option>
            </select>
          </FieldGroup>
        </div>

        {/* Date & Time */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
            <Clock size={14} className="text-gray-400" /> Thời gian <span className="text-red-400">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <input type="date" name="match_date" value={form.match_date} onChange={handleChange} required className={`w-full rounded-xl border px-3 py-2.5 text-sm ${errors.match_date ? 'border-red-300 bg-red-50' : 'border-gray-200'} outline-none focus:border-green-400`} />
              {errors.match_date && <p className="text-[10px] text-red-500 mt-0.5">{errors.match_date}</p>}
            </div>
            <div>
              <input type="time" name="start_time" value={form.start_time} onChange={handleChange} required className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400" />
              <p className="text-[9px] text-gray-400 mt-0.5 text-center">Bắt đầu</p>
            </div>
            <div>
              <input type="time" name="end_time" value={form.end_time} onChange={handleChange} required className={`w-full rounded-xl border px-3 py-2.5 text-sm ${errors.end_time ? 'border-red-300' : 'border-gray-200'} outline-none focus:border-green-400`} />
              <p className="text-[9px] text-gray-400 mt-0.5 text-center">Kết thúc</p>
              {errors.end_time && <p className="text-[10px] text-red-500 mt-0.5">{errors.end_time}</p>}
            </div>
          </div>
        </div>

        {/* Max Slots */}
        <FieldGroup label="Số slot tối đa" required error={errors.max_slots} icon={<Users size={14} className="text-gray-400" />}>
          <input type="number" name="max_slots" value={form.max_slots} onChange={handleChange} min={2} max={30} required className={inputClass(errors.max_slots)} />
          <p className="text-[10px] text-gray-400 mt-1">Tổng người chơi cần tìm (2–30)</p>
        </FieldGroup>

        {/* Address */}
        <FieldGroup label="Địa chỉ sân" required error={errors.address}>
          <textarea name="address" value={form.address} onChange={handleChange} required rows={2} placeholder="VD: Sân cầu lông ABC, 123 Nguyễn Văn Linh, Q7" className={`w-full rounded-xl border px-4 py-2.5 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 ${errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
        </FieldGroup>

        {/* Geolocation */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin size={14} className="text-green-500" /> Tọa độ sân <span className="text-red-400">*</span>
            </label>
          </div>

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-300 bg-green-50/50 py-3 text-sm font-medium text-green-700 hover:bg-green-50 hover:border-green-400 disabled:opacity-50 transition-all"
          >
            {geoLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Đang lấy vị trí...</>
            ) : geoSuccess ? (
              <><CheckCircle2 size={16} className="text-green-600" /> Đã lấy tọa độ thành công!</>
            ) : (
              <><Navigation size={16} /> 📍 Lấy vị trí hiện tại của tôi tại sân</>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium">Latitude</label>
              <input name="latitude" value={form.latitude} onChange={handleChange} placeholder="10.7321" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 outline-none focus:bg-white focus:border-green-400" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-medium">Longitude</label>
              <input name="longitude" value={form.longitude} onChange={handleChange} placeholder="106.7019" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 outline-none focus:bg-white focus:border-green-400" />
            </div>
          </div>

          {errors.location && <p className="text-[11px] text-red-500 flex items-center gap-1">⚠️ {errors.location}</p>}
          <p className="text-[10px] text-gray-400 leading-relaxed">💡 Đứng tại sân → bấm nút. Hoặc mở Google Maps → nhấn giữ vào sân → copy tọa độ.</p>
        </div>

        {/* Google Maps URL */}
        <FieldGroup label="Link Google Maps" icon={<MapPin size={14} className="text-gray-400" />}>
          <input name="google_maps_url" value={form.google_maps_url} onChange={handleChange} placeholder="https://maps.google.com/... (tùy chọn)" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400" />
        </FieldGroup>

        {/* Submit */}
        {submitError && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 text-center">{submitError}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-green-500 py-3.5 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-green-200 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang tạo...</span>
          ) : (
            '🏸 Tạo trận ngay'
          )}
        </button>
      </form>
    </div>
  )
}

// --- Reusable Components ---
function FieldGroup({ label, required, error, icon, children }: {
  label: string; required?: boolean; error?: string; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-1.5">
        {icon} {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function inputClass(error?: string) {
  return `w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 transition-colors ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'}`
}
