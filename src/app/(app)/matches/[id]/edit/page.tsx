'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Clock, Users, Loader2, ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

// Dynamic import MapPicker (Leaflet requires window/document)
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

const SKILL_LABELS: Record<string, string> = {
  'BEGINNER': '🟢 Yếu / Mới chơi',
  'LOWER_INTERMEDIATE': '🟡 TB Yếu',
  'INTERMEDIATE': '🟡 Trung bình',
  'UPPER_INTERMEDIATE': '🔵 TB+',
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

interface MatchInfo {
  host_id: number
  title: string
  sport_type: string
  skill_level: string
  address: string
  latitude: number
  longitude: number
  match_date: string
  start_time: string
  end_time: string
  max_slots: number
  filled_slots: number
  price_per_slot: number
  cancellation_window_hours: number
  bank_name?: string
  bank_account_number?: string
  bank_account_holder?: string
  status: string
}

export default function EditMatchPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = Number(params.id)

  const [pageLoading, setPageLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [filledSlots, setFilledSlots] = useState(0)

  const [form, setForm] = useState({
    title: '',
    sport_type: 'BADMINTON',
    skill_level: 'INTERMEDIATE',
    address: '',
    latitude: '',
    longitude: '',
    match_date: '',
    start_time: '18:00',
    end_time: '20:00',
    max_slots: '4',
    price_per_slot: '0',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    cancellation_window_hours: '2',
  })

  useEffect(() => {
    if (!matchId) return
    apiFetch<{ match: MatchInfo; is_host: boolean }>(`/matches/${matchId}`)
      .then((d) => {
        if (!d.is_host) {
          setLoadError('Bạn không phải chủ trận này.')
          return
        }
        if (d.match.status === 'CANCELLED' || d.match.status === 'FINISHED') {
          setLoadError('Không thể sửa trận đã hủy hoặc đã kết thúc.')
          return
        }
        const m = d.match
        setFilledSlots(m.filled_slots)
        setForm({
          title: m.title || '',
          sport_type: m.sport_type || 'BADMINTON',
          skill_level: m.skill_level || 'INTERMEDIATE',
          address: m.address || '',
          latitude: m.latitude ? String(m.latitude) : '',
          longitude: m.longitude ? String(m.longitude) : '',
          match_date: (m.match_date || '').slice(0, 10),
          start_time: (m.start_time || '18:00').slice(0, 5),
          end_time: (m.end_time || '20:00').slice(0, 5),
          max_slots: String(m.max_slots || 4),
          price_per_slot: String(m.price_per_slot || 0),
          bank_name: m.bank_name || '',
          bank_account_number: m.bank_account_number || '',
          bank_account_holder: m.bank_account_holder || '',
          cancellation_window_hours: String(m.cancellation_window_hours || 2),
        })
      })
      .catch((err) => setLoadError(err.message || 'Không tải được thông tin trận'))
      .finally(() => setPageLoading(false))
  }, [matchId])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  function handleMapSelect(lat: number, lng: number) {
    setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))
    setErrors((e) => ({ ...e, location: undefined }))
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.title.trim() || form.title.length < 3) e.title = 'Tiêu đề phải có ít nhất 3 ký tự'
    if (form.title.length > 150) e.title = 'Tiêu đề tối đa 150 ký tự'
    if (!form.address.trim()) e.address = 'Vui lòng nhập địa chỉ sân'
    if (!form.match_date) e.match_date = 'Vui lòng chọn ngày'
    if (form.start_time && form.end_time && form.start_time >= form.end_time) e.end_time = 'Giờ kết thúc phải sau giờ bắt đầu'
    const maxSlots = parseInt(form.max_slots)
    if (!maxSlots || maxSlots < 1 || maxSlots > 30) e.max_slots = 'Số slot phải từ 1 đến 30'
    if (maxSlots < filledSlots) e.max_slots = `Không được nhỏ hơn số người đã tham gia (${filledSlots})`
    if (!form.latitude || !form.longitude) e.location = 'Vui lòng chọn vị trí trên bản đồ'
    if (!form.skill_level) e.skill_level = 'Vui lòng chọn trình độ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submitMatch() {
    setSubmitError('')
    setLoading(true)
    try {
      await apiFetch(`/matches/${matchId}`, {
        method: 'PUT',
        json: {
          title: form.title.trim(),
          sport_type: form.sport_type,
          skill_level: form.skill_level,
          address: form.address.trim(),
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          match_date: form.match_date,
          start_time: form.start_time,
          end_time: form.end_time,
          max_slots: parseInt(form.max_slots),
          price_per_slot: parseInt(form.price_per_slot) || 0,
          bank_name: form.bank_name || '',
          bank_account_number: form.bank_account_number || '',
          bank_account_holder: form.bank_account_holder || '',
          cancellation_window_hours: parseInt(form.cancellation_window_hours) || 2,
        },
      })
      toast.success('Đã cập nhật trận! ✏️')
      router.push(`/matches/${matchId}`)
    } catch (err: any) {
      const msg: string = err.message || 'Có lỗi xảy ra'
      setSubmitError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    submitMatch()
  }

  if (pageLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-green-500" /></div>
  }

  if (loadError) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <Link href={`/matches/${matchId}`} className="mt-4 inline-block text-sm text-green-600 underline">← Quay lại trận</Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link href={`/matches/${matchId}`} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Sửa trận</h1>
        </div>
        <Link href={`/matches/${matchId}?tab=manage`} className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700">
          <History size={13} /> Lịch sử
        </Link>
      </div>

      {filledSlots > 0 && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          ⚠️ Trận đã có {filledSlots} người tham gia. Thay đổi giờ/địa điểm/STK sẽ được thông báo tới họ.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FieldGroup label="Tiêu đề trận" required error={errors.title}>
          <input name="title" value={form.title} onChange={handleChange} className={inputClass(errors.title)} maxLength={150} />
          <p className="text-[10px] text-gray-400 mt-1 text-right">{form.title.length}/150</p>
        </FieldGroup>

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Môn thể thao" required>
            <Select value={form.sport_type} onValueChange={(v: string) => setForm((f) => ({ ...f, sport_type: v }))}>
              <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BADMINTON">🏸 Cầu lông</SelectItem>
                <SelectItem value="RUNNING">🏃 Chạy bộ</SelectItem>
                <SelectItem value="PICKLEBALL">🥏 Pickleball</SelectItem>
                <SelectItem value="FOOTBALL">⚽ Bóng đá</SelectItem>
                <SelectItem value="TENNIS">🎾 Tennis</SelectItem>
                <SelectItem value="TABLE_TENNIS">🏓 Bóng bàn</SelectItem>
                <SelectItem value="BASKETBALL">🏀 Bóng rổ</SelectItem>
                <SelectItem value="VOLLEYBALL">🏐 Bóng chuyền</SelectItem>
              </SelectContent>
            </Select>
          </FieldGroup>

          <FieldGroup label="Yêu cầu trình độ" required error={errors.skill_level}>
            <Select value={form.skill_level} onValueChange={(v: string) => { setForm((f) => ({ ...f, skill_level: v })); setErrors((e) => ({ ...e, skill_level: undefined })) }}>
              <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BEGINNER">🟢 Yếu / Mới chơi</SelectItem>
                <SelectItem value="LOWER_INTERMEDIATE">🟡 TB Yếu</SelectItem>
                <SelectItem value="INTERMEDIATE">🟡 Trung bình</SelectItem>
                <SelectItem value="UPPER_INTERMEDIATE">🔵 TB+</SelectItem>
                <SelectItem value="ADVANCED">🟠 Khá</SelectItem>
                <SelectItem value="SEMI_PRO">🔴 Bán chuyên</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400 mt-1">{SKILL_LABELS[form.skill_level] || ''}</p>
          </FieldGroup>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Số slot" required error={errors.max_slots} icon={<Users size={14} className="text-gray-400" />}>
            <input type="number" name="max_slots" value={form.max_slots} onChange={handleChange} min={Math.max(1, filledSlots)} max={30} required className={inputClass(errors.max_slots)} />
            <p className="text-[10px] text-gray-400 mt-1">Đã có {filledSlots} người</p>
          </FieldGroup>

          <FieldGroup label="Phí / slot (VNĐ)" icon={<Users size={14} className="text-gray-400" />}>
            <input type="number" name="price_per_slot" value={form.price_per_slot} onChange={handleChange} min={0} step={5000} placeholder="0 = Miễn phí" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400" />
            <p className="text-[10px] text-gray-400 mt-1">{Number(form.price_per_slot) > 0 ? `${Number(form.price_per_slot).toLocaleString('vi-VN')}đ/người` : 'Miễn phí'}</p>
          </FieldGroup>
        </div>

        {Number(form.price_per_slot) > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">🏦 Thông tin nhận cọc</p>
              <button
                type="button"
                onClick={() => {
                  apiFetch<{ user: any }>('/auth/me').then((d) => {
                    const u = d.user
                    if (u.bank_name || u.bank_account_number) {
                      setForm((f) => ({
                        ...f,
                        bank_name: u.bank_name || f.bank_name,
                        bank_account_number: u.bank_account_number || f.bank_account_number,
                        bank_account_holder: u.bank_account_holder || f.bank_account_holder,
                      }))
                      toast.success('Đã điền STK từ hồ sơ')
                    } else {
                      toast.info('Chưa có STK lưu trong hồ sơ.')
                    }
                  }).catch(() => {})
                }}
                className="text-[10px] text-blue-600 font-medium bg-blue-100 rounded-lg px-2 py-1 hover:bg-blue-200 transition-colors"
              >
                📋 Dùng STK đã lưu
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-blue-600 font-medium">Ngân hàng (mã viết tắt)</label>
                <input name="bank_name" value={form.bank_name} onChange={handleChange} placeholder="VD: VCB, TCB, MB, ACB..." className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] text-blue-600 font-medium">Số tài khoản</label>
                <input name="bank_account_number" value={form.bank_account_number} onChange={handleChange} placeholder="0123456789" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] text-blue-600 font-medium">Tên chủ TK</label>
                <input name="bank_account_holder" value={form.bank_account_holder} onChange={handleChange} placeholder="NGUYEN VAN A" className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 uppercase" />
              </div>
            </div>
            <p className="text-[9px] text-amber-600 bg-amber-50 rounded px-2 py-1">
              ⚠️ Kiểm tra kỹ STK. Mọi thay đổi sẽ được lưu vào lịch sử chỉnh sửa và thông báo cho người đã tham gia.
            </p>
          </div>
        )}

        <FieldGroup label="Cho phép hủy trước giờ đá" icon={<Clock size={14} className="text-gray-400" />}>
          <Select value={form.cancellation_window_hours} onValueChange={(v: string) => setForm((f) => ({ ...f, cancellation_window_hours: v }))}>
            <SelectTrigger className="w-full rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 giờ trước</SelectItem>
              <SelectItem value="2">2 giờ trước</SelectItem>
              <SelectItem value="3">3 giờ trước</SelectItem>
              <SelectItem value="6">6 giờ trước</SelectItem>
              <SelectItem value="12">12 giờ trước</SelectItem>
              <SelectItem value="24">24 giờ trước (1 ngày)</SelectItem>
            </SelectContent>
          </Select>
        </FieldGroup>

        <FieldGroup label="Địa chỉ sân" required error={errors.address}>
          <textarea name="address" value={form.address} onChange={handleChange} required rows={2} className={`w-full rounded-xl border px-4 py-2.5 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 ${errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
        </FieldGroup>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">📍 Vị trí sân <span className="text-red-400">*</span></label>
          <MapPicker
            lat={form.latitude ? parseFloat(form.latitude) : null}
            lng={form.longitude ? parseFloat(form.longitude) : null}
            onLocationSelect={handleMapSelect}
          />
          {form.latitude && form.longitude && (
            <p className="text-[10px] text-green-600 flex items-center gap-1">✅ Tọa độ: {form.latitude}, {form.longitude}</p>
          )}
          {errors.location && <p className="text-[11px] text-red-500 flex items-center gap-1">⚠️ {errors.location}</p>}
        </div>

        {submitError && <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 text-center">{submitError}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-green-500 py-3.5 text-sm font-bold text-white hover:bg-green-600 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-green-200 transition-all"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Đang lưu...</span>
          ) : (
            '💾 Lưu thay đổi'
          )}
        </button>
      </form>
    </div>
  )
}

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
