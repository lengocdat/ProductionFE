'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Clock, Users, Loader2, Zap, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import PhoneModal from '@/components/PhoneModal'

// Dynamic import MapPicker (Leaflet requires window/document)
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

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

interface MyClub { id: number; name: string; sport_type: string }

export default function CreateMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  const [phoneModalMsg, setPhoneModalMsg] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
  const [formFlash, setFormFlash] = useState(false)
  const [myClubs, setMyClubs] = useState<MyClub[]>([])
  const [selectedClubID, setSelectedClubID] = useState<number | null>(null)

  useEffect(() => {
    apiFetch<{ clubs: MyClub[] }>('/clubs/my').then(d => setMyClubs(d.clubs || [])).catch(() => {})
  }, [])

  const [form, setForm] = useState({
    title: '',
    sport_type: 'BADMINTON',
    skill_level: 'INTERMEDIATE',
    address: '',
    latitude: '',
    longitude: '',
    match_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })(),
    start_time: '18:00',
    end_time: '20:00',
    max_slots: '4',
    price_per_slot: '0',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    cancellation_window_hours: '2',
    is_recurring: false,
    recurrence_type: 'WEEKLY',
    recurrence_day_of_week: new Date().getDay(),
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
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : type === 'number' && name === 'recurrence_day_of_week' ? parseInt(value) : value }))
    setErrors((prev) => ({ ...prev, [name]: undefined }))
    if (['title', 'sport_type', 'skill_level', 'max_slots'].includes(name)) {
      setSelectedTemplate(null)
    }
  }

  function handleMapSelect(lat: number, lng: number) {
    setForm((f) => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }))
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
    if (!form.latitude || !form.longitude) e.location = 'Vui lòng dán link Google Maps hoặc bấm nút GPS để lấy vị trí'
    if (!form.skill_level) e.skill_level = 'Vui lòng chọn trình độ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submitMatch() {
    // Proactive phone check — avoids a wasted API call if we already know phone is missing
    if (!localStorage.getItem('user_phone')) {
      setPhoneModalMsg('Vui lòng thêm số điện thoại vào hồ sơ để tạo trận — người tham gia cần liên hệ với bạn.')
      setShowPhoneModal(true)
      return
    }
    setSubmitError('')
    setLoading(true)
    try {
      await apiFetch('/matches', {
        method: 'POST',
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
          bank_name: form.bank_name || undefined,
          bank_account_number: form.bank_account_number || undefined,
          bank_account_holder: form.bank_account_holder || undefined,
          cancellation_window_hours: parseInt(form.cancellation_window_hours) || 2,
          is_recurring: form.is_recurring,
          recurrence_type: form.is_recurring ? form.recurrence_type : undefined,
          recurrence_day_of_week: form.is_recurring ? form.recurrence_day_of_week : undefined,
          club_id: selectedClubID ?? undefined,
        },
      })
      toast.success('Tạo trận thành công! 🎉')
      router.push('/feed')
    } catch (err: any) {
      const msg: string = err.message || ''
      if (msg.startsWith('PHONE_REQUIRED:')) {
        setPhoneModalMsg(msg.replace('PHONE_REQUIRED:', ''))
        setShowPhoneModal(true)
      } else {
        setSubmitError(msg || 'Có lỗi xảy ra')
        toast.error(msg || 'Có lỗi xảy ra')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    submitMatch()
  }

  if (showPhoneModal) {
    return (
      <PhoneModal
        message={phoneModalMsg}
        onSaved={() => { setShowPhoneModal(false); submitMatch() }}
        onClose={() => setShowPhoneModal(false)}
      />
    )
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

      {/* ============ Club Selector ============ */}
      {myClubs.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-2">🏆 Đăng cho CLB?</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <button type="button"
              onClick={() => setSelectedClubID(null)}
              className={`flex-shrink-0 rounded-2xl border-2 px-4 py-2 text-xs font-semibold transition-all ${
                selectedClubID === null ? 'border-gray-400 bg-gray-100 text-gray-700' : 'border-gray-200 text-gray-400'
              }`}>
              Không có
            </button>
            {myClubs.map(c => (
              <button key={c.id} type="button"
                onClick={() => setSelectedClubID(c.id)}
                className={`flex-shrink-0 rounded-2xl border-2 px-4 py-2 text-xs font-semibold transition-all ${
                  selectedClubID === c.id ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                {c.name}
              </button>
            ))}
          </div>
          {selectedClubID && (
            <p className="text-[11px] text-green-600 mt-1.5 ml-1">✓ Thành viên CLB sẽ nhận thông báo về trận này</p>
          )}
        </div>
      )}

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
            <Select value={form.sport_type} onValueChange={(v: string) => { setForm((f) => ({ ...f, sport_type: v })); setSelectedTemplate(null) }}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
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
            <Select value={form.skill_level} onValueChange={(v: string) => { setForm((f) => ({ ...f, skill_level: v })); setSelectedTemplate(null); setErrors((e) => ({ ...e, skill_level: undefined })) }}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
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

        {/* Max Slots + Price */}
        <div className="grid grid-cols-2 gap-3">
          <FieldGroup label="Số slot" required error={errors.max_slots} icon={<Users size={14} className="text-gray-400" />}>
            <input type="number" name="max_slots" value={form.max_slots} onChange={handleChange} min={1} max={30} required className={inputClass(errors.max_slots)} />
            <p className="text-[10px] text-gray-400 mt-1">Cần tìm thêm (1–30)</p>
          </FieldGroup>

          <FieldGroup label="Phí / slot (VNĐ)" icon={<Users size={14} className="text-gray-400" />}>
            <input type="number" name="price_per_slot" value={form.price_per_slot} onChange={handleChange} min={0} step={5000} placeholder="0 = Miễn phí" className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-400" />
            <p className="text-[10px] text-gray-400 mt-1">{Number(form.price_per_slot) > 0 ? `${Number(form.price_per_slot).toLocaleString('vi-VN')}đ/người` : 'Miễn phí'}</p>
          </FieldGroup>
        </div>

        {/* Bank Info (shown when price > 0) */}
        {Number(form.price_per_slot) > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">🏦 Thông tin nhận cọc</p>
              <button
                type="button"
                onClick={() => {
                  // Fetch saved bank from user profile and auto-fill
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
                      toast.info('Chưa có STK lưu trong hồ sơ. Nhập lần đầu ở đây.')
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
                <p className="text-[9px] text-blue-500 mt-0.5">VCB, TCB, MB, ACB, BIDV, VPB, TPB, STB...</p>
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
            {/* Warning if bank info differs from saved */}
            {form.bank_account_number && form.bank_account_number.length > 5 && (
              <p className="text-[9px] text-amber-600 bg-amber-50 rounded px-2 py-1">
                ⚠️ Đảm bảo STK chính xác. Nếu khác với lần trước, người chơi có thể chuyển nhầm.
              </p>
            )}
          </div>
        )}

        {/* Recurring Match */}
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="is_recurring"
              checked={form.is_recurring}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 accent-purple-500"
            />
            <div className="flex items-center gap-1.5">
              <RefreshCw size={14} className="text-purple-600" />
              <span className="text-sm font-semibold text-purple-900">Trận cố định (lặp lại)</span>
            </div>
          </label>
          <p className="text-[10px] text-purple-600 ml-7">Hiển thị badge "Hàng tuần" để thu hút người chơi muốn tham gia đều đặn</p>
          {form.is_recurring && (
            <div className="flex gap-3 ml-7">
              <Select value={form.recurrence_type} onValueChange={(v: string) => setForm((f) => ({ ...f, recurrence_type: v }))}>
                <SelectTrigger className="w-[130px] rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Hàng tuần</SelectItem>
                  <SelectItem value="BIWEEKLY">2 tuần / lần</SelectItem>
                </SelectContent>
              </Select>
              <Select value={String(form.recurrence_day_of_week)} onValueChange={(v: string) => setForm((f) => ({ ...f, recurrence_day_of_week: parseInt(v) }))}>
                <SelectTrigger className="flex-1 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Cancellation Policy */}
        <FieldGroup label="Cho phép hủy trước giờ đá" icon={<Clock size={14} className="text-gray-400" />}>
          <Select value={form.cancellation_window_hours} onValueChange={(v: string) => setForm((f) => ({ ...f, cancellation_window_hours: v }))}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 giờ trước</SelectItem>
              <SelectItem value="2">2 giờ trước</SelectItem>
              <SelectItem value="3">3 giờ trước</SelectItem>
              <SelectItem value="6">6 giờ trước</SelectItem>
              <SelectItem value="12">12 giờ trước</SelectItem>
              <SelectItem value="24">24 giờ trước (1 ngày)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-gray-400 mt-1">Quá thời gian này, người chơi sẽ không thể tự hủy</p>
        </FieldGroup>

        {/* Address */}
        <FieldGroup label="Địa chỉ sân" required error={errors.address}>
          <textarea name="address" value={form.address} onChange={handleChange} required rows={2} placeholder="VD: Sân cầu lông ABC, 123 Nguyễn Văn Linh, Q7" className={`w-full rounded-xl border px-4 py-2.5 text-sm resize-none outline-none focus:border-green-400 focus:ring-1 focus:ring-green-100 ${errors.address ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
        </FieldGroup>

        {/* Vị trí sân - Map Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            📍 Vị trí sân <span className="text-red-400">*</span>
          </label>
          <MapPicker
            lat={form.latitude ? parseFloat(form.latitude) : null}
            lng={form.longitude ? parseFloat(form.longitude) : null}
            onLocationSelect={handleMapSelect}
          />
          {form.latitude && form.longitude && (
            <p className="text-[10px] text-green-600 flex items-center gap-1">
              ✅ Tọa độ: {form.latitude}, {form.longitude}
            </p>
          )}
          {errors.location && <p className="text-[11px] text-red-500 flex items-center gap-1">⚠️ {errors.location}</p>}
        </div>

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
