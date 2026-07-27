'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { setPreferences } from '@/lib/auth'
import { TRACKS } from '@/lib/lessons'
import { trackEvent } from '@/lib/analytics'

const GOALS: Record<string, string> = {
  everyday: 'Giao tiếp đời sống hàng ngày',
  developer: 'Công việc lập trình / kỹ thuật',
  product: 'Công việc sản phẩm',
  meeting: 'Họp hành, làm việc nhóm',
  speaking: 'Luyện nói, thuyết trình nâng cao',
}

const LEVELS = [
  { key: 'A1', label: 'Tôi biết vài từ và câu đơn giản — chào hỏi, số đếm, đồ vật quen thuộc.' },
  { key: 'A2', label: 'Tôi có thể nói về công việc hàng ngày, gọi món ăn, hỏi đường bằng câu đơn giản.' },
  { key: 'B1', label: 'Tôi trao đổi công việc cơ bản qua email/chat được, kể lại được một câu chuyện ngắn.' },
  { key: 'B2', label: 'Tôi họp, trình bày ý kiến, tranh luận nhẹ bằng tiếng Anh khá tự nhiên.' },
  { key: 'C1', label: 'Tôi thuyết trình, đàm phán, xử lý tình huống phức tạp bằng tiếng Anh trôi chảy.' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<'goal' | 'level'>('goal')
  const [goal, setGoal] = useState('')
  const [level, setLevel] = useState('')
  const [saving, setSaving] = useState(false)

  async function finish(track: string, lvl: string) {
    setSaving(true)
    try {
      await setPreferences(track, lvl)
      trackEvent('onboarding_complete', { track, level: lvl })
    } catch {}
    router.replace('/home')
  }

  function skip() {
    finish('everyday', 'B1')
  }

  if (step === 'goal') {
    return (
      <div className="px-5 pt-10 pb-8">
        <h1 className="text-xl font-extrabold text-gray-900 mb-1">Bạn muốn học tiếng Anh để làm gì?</h1>
        <p className="text-sm text-gray-400 mb-8">Giúp app gợi ý đúng bài học cho bạn trước tiên.</p>

        <div className="space-y-3">
          {TRACKS.map((t) => (
            <button
              key={t.key}
              onClick={() => setGoal(t.key)}
              className={`w-full flex items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                goal === t.key
                  ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <span className={`text-sm font-semibold ${goal === t.key ? 'text-indigo-900' : 'text-gray-700'}`}>
                {GOALS[t.key] || t.label}
              </span>
              {goal === t.key && <Check size={18} className="text-indigo-500 shrink-0" />}
            </button>
          ))}
        </div>

        <button
          onClick={() => setStep('level')}
          disabled={!goal}
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] disabled:opacity-40 transition-transform"
        >
          Tiếp theo <ArrowRight size={16} />
        </button>

        <button onClick={skip} className="mt-4 w-full text-center text-xs text-gray-400">
          Bỏ qua, vào học luôn
        </button>
      </div>
    )
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Trình độ hiện tại của bạn?</h1>
      <p className="text-sm text-gray-400 mb-8">Chọn câu đúng nhất với bạn — không cần chính xác tuyệt đối.</p>

      <div className="space-y-3">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLevel(l.key)}
            className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
              level === l.key ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-gray-200 bg-white'
            }`}
          >
            <span
              className={`shrink-0 mt-0.5 rounded-lg px-2 py-0.5 text-[10px] font-extrabold ${
                level === l.key ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {l.key}
            </span>
            <span className={`text-sm leading-relaxed ${level === l.key ? 'text-indigo-900 font-medium' : 'text-gray-600'}`}>
              {l.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => finish(goal, level)}
        disabled={!level || saving}
        className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] disabled:opacity-40 transition-transform"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <>Bắt đầu học <ArrowRight size={16} /></>}
      </button>

      <button onClick={() => setStep('goal')} className="mt-4 w-full text-center text-xs text-gray-400">
        ← Quay lại
      </button>
    </div>
  )
}
