'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, MapPin } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { clsx } from 'clsx'

const SPORTS = [
  { value: 'BADMINTON',    emoji: '🏸', label: 'Cầu lông' },
  { value: 'FOOTBALL',     emoji: '⚽', label: 'Bóng đá' },
  { value: 'TENNIS',       emoji: '🎾', label: 'Tennis' },
  { value: 'PICKLEBALL',   emoji: '🏓', label: 'Pickleball' },
  { value: 'BASKETBALL',   emoji: '🏀', label: 'Bóng rổ' },
  { value: 'VOLLEYBALL',   emoji: '🏐', label: 'Bóng chuyền' },
  { value: 'TABLE_TENNIS', emoji: '🏓', label: 'Bóng bàn' },
  { value: 'RUNNING',      emoji: '🏃', label: 'Chạy bộ' },
]

const CITIES = [
  'Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ',
  'Bình Dương', 'Đồng Nai', 'Hải Phòng', 'Nha Trang',
  'Huế', 'Vũng Tàu', 'Long An', 'Khác',
]

const SKILLS = [
  { value: 'BEGINNER',     label: '🟢 Mới chơi' },
  { value: 'INTERMEDIATE', label: '🟡 Trung bình' },
  { value: 'ADVANCED',     label: '🟠 Khá' },
  { value: 'SEMI_PRO',     label: '🔴 Bán chuyên' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep]         = useState(1)
  const [sports, setSports]     = useState<string[]>([])
  const [city, setCity]         = useState('')
  const [skill, setSkill]       = useState('INTERMEDIATE')
  const [saving, setSaving]     = useState(false)

  function toggleSport(v: string) {
    setSports(prev => prev.includes(v) ? prev.filter(s => s !== v) : [...prev, v])
  }

  async function finish() {
    setSaving(true)
    // Save to localStorage for feed pre-filtering
    if (sports.length > 0) localStorage.setItem('pref_sport', sports[0])
    if (city) localStorage.setItem('pref_city', city)
    localStorage.setItem('pref_skill', skill)

    // Persist skill level to profile (best-effort)
    try {
      await apiFetch('/auth/profile', { method: 'PATCH', json: { skill_level: skill } })
    } catch { /* ignore */ }

    localStorage.setItem('onboarding_done', '1')
    router.replace('/feed')
  }

  // Step 1: Sport
  if (step === 1) return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-8 flex flex-col">
      <div className="mb-1">
        <div className="flex gap-1 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className={clsx('h-1 flex-1 rounded-full', i <= step ? 'bg-green-500' : 'bg-gray-100')} />
          ))}
        </div>
        <p className="text-xs font-semibold text-green-600 mb-1">Bước 1 / 3</p>
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Bạn chơi môn<br />thể thao nào?</h1>
        <p className="text-sm text-gray-500 mt-1">Chọn một hoặc nhiều môn</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-6 flex-1">
        {SPORTS.map(s => (
          <button key={s.value} onClick={() => toggleSport(s.value)}
            className={clsx(
              'flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all',
              sports.includes(s.value)
                ? 'border-green-500 bg-green-50'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
            )}>
            <span className="text-2xl">{s.emoji}</span>
            <span className={clsx('text-sm font-semibold', sports.includes(s.value) ? 'text-green-700' : 'text-gray-700')}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep(2)}
        disabled={sports.length === 0}
        className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-sm font-black text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
      >
        Tiếp theo <ChevronRight size={16} />
      </button>
    </div>
  )

  // Step 2: City
  if (step === 2) return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-8 flex flex-col">
      <div className="mb-6">
        <div className="flex gap-1 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className={clsx('h-1 flex-1 rounded-full', i <= step ? 'bg-green-500' : 'bg-gray-100')} />
          ))}
        </div>
        <p className="text-xs font-semibold text-green-600 mb-1">Bước 2 / 3</p>
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Bạn ở thành phố<br />nào?</h1>
        <p className="text-sm text-gray-500 mt-1">Để hiển thị trận đấu gần bạn</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 flex-1">
        {CITIES.map(c => (
          <button key={c} onClick={() => setCity(c)}
            className={clsx(
              'flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-left transition-all',
              city === c
                ? 'border-green-500 bg-green-50'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
            )}>
            <MapPin size={14} className={city === c ? 'text-green-600' : 'text-gray-400'} />
            <span className={clsx('text-sm font-semibold', city === c ? 'text-green-700' : 'text-gray-700')}>{c}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep(3)}
        disabled={!city}
        className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-sm font-black text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
      >
        Tiếp theo <ChevronRight size={16} />
      </button>
    </div>
  )

  // Step 3: Skill level
  return (
    <div className="min-h-screen bg-white px-5 pt-12 pb-8 flex flex-col">
      <div className="mb-6">
        <div className="flex gap-1 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className={clsx('h-1 flex-1 rounded-full', i <= step ? 'bg-green-500' : 'bg-gray-100')} />
          ))}
        </div>
        <p className="text-xs font-semibold text-green-600 mb-1">Bước 3 / 3</p>
        <h1 className="text-2xl font-black text-gray-900 leading-tight">Trình độ của<br />bạn thế nào?</h1>
        <p className="text-sm text-gray-500 mt-1">Để ghép trận phù hợp hơn</p>
      </div>

      <div className="space-y-3 flex-1">
        {SKILLS.map(s => (
          <button key={s.value} onClick={() => setSkill(s.value)}
            className={clsx(
              'w-full flex items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left transition-all',
              skill === s.value
                ? 'border-green-500 bg-green-50'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
            )}>
            <span className={clsx('text-base font-bold flex-1', skill === s.value ? 'text-green-700' : 'text-gray-700')}>
              {s.label}
            </span>
            {skill === s.value && (
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={finish}
        disabled={saving}
        className="mt-6 w-full rounded-2xl bg-green-500 py-4 text-sm font-black text-white disabled:opacity-40 shadow-lg shadow-green-200"
      >
        {saving ? 'Đang lưu...' : '🎉 Bắt đầu tìm trận!'}
      </button>
    </div>
  )
}
