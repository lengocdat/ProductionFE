'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { clsx } from 'clsx'
import SportIcon from '@/components/SportIcon'

// ─── Types ──────────────────────────────────────────────────────────────────

type DurationKey = 'NEVER' | 'LT6M' | '6TO12M' | '1TO2Y' | '2TO5Y' | 'GT5Y'
type TrainingKey = 'SELF' | 'FRIENDS' | 'COACH' | 'CLUB'
type CompetitionKey = 'CASUAL' | 'SERIOUS' | 'CLUB' | 'REGIONAL'
type SportKey = 'BADMINTON' | 'FOOTBALL' | 'TENNIS' | 'TABLE_TENNIS' | 'BASKETBALL' | 'VOLLEYBALL' | 'RUNNING' | 'PICKLEBALL'

const SPORTS: { key: SportKey; label: string; icon: string }[] = [
  { key: 'BADMINTON',    label: 'Cầu lông',    icon: '🏸' },
  { key: 'FOOTBALL',     label: 'Bóng đá',     icon: '⚽' },
  { key: 'TENNIS',       label: 'Tennis',      icon: '🎾' },
  { key: 'TABLE_TENNIS', label: 'Bóng bàn',    icon: '🏓' },
  { key: 'BASKETBALL',   label: 'Bóng rổ',     icon: '🏀' },
  { key: 'VOLLEYBALL',   label: 'Bóng chuyền', icon: '🏐' },
  { key: 'RUNNING',      label: 'Chạy bộ',     icon: '🏃' },
  { key: 'PICKLEBALL',   label: 'Pickleball',  icon: '' },
]

const DURATION_OPTIONS: { key: DurationKey; label: string; sub: string; score: number }[] = [
  { key: 'NEVER',   label: 'Chưa từng chơi',     sub: 'Tôi muốn thử lần đầu',              score: 0 },
  { key: 'LT6M',    label: 'Dưới 6 tháng',        sub: 'Mới bắt đầu tập',                   score: 1 },
  { key: '6TO12M',  label: '6 – 12 tháng',        sub: 'Đã quen các kỹ năng cơ bản',        score: 2 },
  { key: '1TO2Y',   label: '1 – 2 năm',           sub: 'Chơi đều đặn, tương đối ổn định',   score: 3 },
  { key: '2TO5Y',   label: '2 – 5 năm',           sub: 'Có kỹ thuật, thường xuyên tập',     score: 4 },
  { key: 'GT5Y',    label: 'Hơn 5 năm',           sub: 'Chơi lâu năm, kinh nghiệm tốt',    score: 5 },
]

const TRAINING_OPTIONS: { key: TrainingKey; label: string; sub: string; score: number }[] = [
  { key: 'SELF',    label: 'Tự học',             sub: 'Xem video, thử nghiệm tự mình',       score: 0 },
  { key: 'FRIENDS', label: 'Học từ bạn bè',      sub: 'Bạn bè chỉ dẫn, chơi cùng nhau',     score: 1 },
  { key: 'COACH',   label: 'Có HLV hướng dẫn',   sub: 'Thuê hoặc nhờ HLV chỉ dạy kỹ thuật', score: 2 },
  { key: 'CLUB',    label: 'Học bài bản tại CLB', sub: 'Học có hệ thống ở trung tâm/CLB',    score: 3 },
]

const COMPETITION_OPTIONS: { key: CompetitionKey; label: string; sub: string; score: number }[] = [
  { key: 'CASUAL',   label: '😊 Giao lưu vui vẻ',    sub: 'Chơi cho vui, không cần thắng thua',        score: 0 },
  { key: 'SERIOUS',  label: '💪 Chơi nghiêm túc',     sub: 'Cạnh tranh với bạn bè, thích thắng',        score: 1 },
  { key: 'CLUB',     label: '🏅 Thi đấu CLB/giải nhỏ', sub: 'Đã tham gia giải đấu nội bộ hay địa phương', score: 2 },
  { key: 'REGIONAL', label: '🏆 Thi đấu giải tỉnh+',  sub: 'Tham dự giải tỉnh/quốc gia/chuyên nghiệp',  score: 3 },
]

const SKILL_LEVELS = [
  { key: 'BEGINNER',           label: 'Mới bắt đầu',      color: 'bg-gray-100 text-gray-700',    desc: 'Chưa quen các kỹ năng cơ bản. Phù hợp để giao lưu học hỏi.' },
  { key: 'LOWER_INTERMEDIATE', label: 'Trung bình yếu',   color: 'bg-teal-100 text-teal-700',    desc: 'Biết cơ bản, đang luyện tập để tiến bộ.' },
  { key: 'INTERMEDIATE',       label: 'Trung bình',        color: 'bg-blue-100 text-blue-700',    desc: 'Chơi được, có thể tham gia hầu hết các trận giao lưu.' },
  { key: 'UPPER_INTERMEDIATE', label: 'Trung bình khá',   color: 'bg-indigo-100 text-indigo-700', desc: 'Kỹ thuật tốt, ổn định và có chiến thuật.' },
  { key: 'ADVANCED',           label: 'Khá – Giỏi',       color: 'bg-orange-100 text-orange-700', desc: 'Thi đấu CLB, kỹ thuật cạnh tranh.' },
  { key: 'SEMI_PRO',           label: 'Bán chuyên',       color: 'bg-red-100 text-red-700',      desc: 'Thi đấu giải tỉnh/quốc gia, gần chuyên nghiệp.' },
]

// ─── Score → SkillLevel mapping ─────────────────────────────────────────────

function calcSkillLevel(durScore: number, trainScore: number, compScore: number): string {
  const total = durScore * 0.45 + trainScore * 0.3 + compScore * 0.25
  if (total < 0.6)  return 'BEGINNER'
  if (total < 1.4)  return 'LOWER_INTERMEDIATE'
  if (total < 2.3)  return 'INTERMEDIATE'
  if (total < 3.1)  return 'UPPER_INTERMEDIATE'
  if (total < 3.9)  return 'ADVANCED'
  return 'SEMI_PRO'
}

function getSkillIndex(key: string): number {
  return SKILL_LEVELS.findIndex(s => s.key === key)
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ONBOARDING_DRAFT_KEY = 'onboarding_draft'

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')

  // Answers
  const [sports, setSports] = useState<SportKey[]>(['BADMINTON'])
  const [duration, setDuration] = useState<DurationKey | null>(null)
  const [training, setTraining] = useState<TrainingKey | null>(null)
  const [competition, setCompetition] = useState<CompetitionKey | null>(null)
  const [finalSkill, setFinalSkill] = useState<string>('INTERMEDIATE')
  const [saving, setSaving] = useState(false)

  // Auth guard + restore draft
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/login'); return }
    apiFetch<{ user: { username: string; skill_level: string } }>('/auth/me')
      .then(d => setUsername(d.user.username))
      .catch(() => router.replace('/login'))
    // Restore draft
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.step) setStep(draft.step)
        if (draft.sports) setSports(draft.sports)
        if (draft.duration) setDuration(draft.duration)
        if (draft.training) setTraining(draft.training)
        if (draft.competition) setCompetition(draft.competition)
      }
    } catch {}
  }, [router])

  // Save draft on every answer change
  useEffect(() => {
    if (step === 0) return
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ step, sports, duration, training, competition }))
    } catch {}
  }, [step, sports, duration, training, competition])

  // When entering result step, calculate
  useEffect(() => {
    if (step === 4) {
      const dur  = DURATION_OPTIONS.find(o => o.key === duration)?.score ?? 0
      const train = TRAINING_OPTIONS.find(o => o.key === training)?.score ?? 0
      const comp  = COMPETITION_OPTIONS.find(o => o.key === competition)?.score ?? 0
      setFinalSkill(calcSkillLevel(dur, train, comp))
    }
  }, [step, duration, training, competition])

  function toggleSport(key: SportKey) {
    setSports(prev =>
      prev.includes(key) ? (prev.length > 1 ? prev.filter(s => s !== key) : prev) : [...prev, key]
    )
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await apiFetch('/auth/profile', { method: 'PATCH', json: { skill_level: finalSkill } })
    } catch {}
    localStorage.setItem('onboarding_done', '1')
    localStorage.removeItem(ONBOARDING_DRAFT_KEY)
    router.replace('/feed')
  }

  const canNext = (
    step === 0 ? true :
    step === 1 ? sports.length > 0 :
    step === 2 ? duration !== null :
    step === 3 ? training !== null && competition !== null :
    true
  )

  const totalSteps = 5
  const progress = ((step) / (totalSteps - 1)) * 100

  const skillInfo = SKILL_LEVELS.find(s => s.key === finalSkill) ?? SKILL_LEVELS[2]
  const skillIdx  = getSkillIndex(finalSkill)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col">
      {/* Progress bar */}
      {step > 0 && step < 4 && (
        <div className="h-1 w-full bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col px-5 py-6 max-w-md mx-auto w-full">

        {/* ── Step 0: Welcome ───────────────────────────────────── */}
        {step === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-6">🏆</div>
            <h1 className="text-2xl font-black text-white mb-2">
              Chào {username || 'bạn'}!
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              Chỉ mất <span className="text-green-400 font-semibold">30 giây</span> để chúng tôi tìm trận phù hợp nhất với bạn.
            </p>
            <p className="text-gray-600 text-xs mb-10">Trả lời 3 câu hỏi đơn giản về trình độ của bạn</p>

            <div className="w-full space-y-3 mb-8">
              {[
                { icon: '🎯', text: 'Đề xuất trận khớp với trình độ bạn' },
                { icon: '🤝', text: 'Kết nối với người chơi cùng cấp' },
                { icon: '⚡', text: 'Không còn trận quá dễ hay quá khó' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl bg-gray-900 border border-gray-800 px-4 py-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <span className="text-sm text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 py-4 text-base font-black text-white shadow-lg shadow-green-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Bắt đầu <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* ── Step 1: Sports ───────────────────────────────────── */}
        {step === 1 && (
          <div className="flex-1 flex flex-col">
            <StepHeader step={1} total={3} title="Bạn thường chơi môn nào?" sub="Chọn 1 hoặc nhiều môn (nhấn để chọn/bỏ)" />
            <div className="grid grid-cols-2 gap-3 mt-6 flex-1">
              {SPORTS.map(sport => (
                <button
                  key={sport.key}
                  onClick={() => toggleSport(sport.key)}
                  className={clsx(
                    'flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.97]',
                    sports.includes(sport.key)
                      ? 'border-green-500 bg-green-500/10 shadow-sm'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                  )}
                >
                  <SportIcon sport={sport.key} size={26} className="shrink-0" />
                  <div>
                    <p className={clsx('text-sm font-semibold', sports.includes(sport.key) ? 'text-green-400' : 'text-white')}>
                      {sport.label}
                    </p>
                    {sports.includes(sport.key) && (
                      <div className="mt-0.5 w-3 h-3 rounded-full bg-green-500 flex items-center justify-center">
                        <Check size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: Duration ──────────────────────────────────── */}
        {step === 2 && (
          <div className="flex-1 flex flex-col">
            <StepHeader step={2} total={3} title="Bạn đã chơi được bao lâu?" sub="Tính tổng thời gian từ khi bắt đầu đến nay" />
            <div className="space-y-2.5 mt-6 flex-1">
              {DURATION_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setDuration(opt.key)}
                  className={clsx(
                    'w-full flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all active:scale-[0.99]',
                    duration === opt.key
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                  )}
                >
                  <div className={clsx(
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                    duration === opt.key ? 'border-green-500 bg-green-500' : 'border-gray-600'
                  )}>
                    {duration === opt.key && <Check size={11} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-semibold', duration === opt.key ? 'text-green-400' : 'text-white')}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{opt.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3: Training + Competition ────────────────────── */}
        {step === 3 && (
          <div className="flex-1 flex flex-col overflow-y-auto">
            <StepHeader step={3} total={3} title="Cách bạn học và chơi?" sub="Chọn mô tả gần nhất với bạn" />

            <div className="mt-5 space-y-5 flex-1">
              {/* Training */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Bạn học chơi như thế nào?</p>
                <div className="space-y-2">
                  {TRAINING_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setTraining(opt.key)}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        training === opt.key
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                      )}
                    >
                      <div className={clsx(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        training === opt.key ? 'border-blue-400 bg-blue-400' : 'border-gray-600'
                      )}>
                        {training === opt.key && <Check size={9} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-medium', training === opt.key ? 'text-blue-300' : 'text-white')}>{opt.label}</p>
                        <p className="text-[10px] text-gray-500">{opt.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Competition */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Mức độ thi đấu của bạn?</p>
                <div className="space-y-2">
                  {COMPETITION_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setCompetition(opt.key)}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        competition === opt.key
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                      )}
                    >
                      <div className={clsx(
                        'h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        competition === opt.key ? 'border-purple-400 bg-purple-400' : 'border-gray-600'
                      )}>
                        {competition === opt.key && <Check size={9} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx('text-sm font-medium', competition === opt.key ? 'text-purple-300' : 'text-white')}>{opt.label}</p>
                        <p className="text-[10px] text-gray-500">{opt.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Result ────────────────────────────────────── */}
        {step === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Trình độ của bạn</p>
            <div className={clsx('rounded-2xl px-6 py-3 text-xl font-black mb-2', skillInfo.color)}>
              {skillInfo.label}
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs mb-6">{skillInfo.desc}</p>

            {/* Level scale */}
            <div className="w-full rounded-2xl bg-gray-900 border border-gray-800 p-4 mb-6">
              <p className="text-[10px] text-gray-500 mb-3 uppercase font-bold tracking-wide">Điều chỉnh nếu chưa đúng</p>
              <div className="flex items-center gap-1.5">
                {SKILL_LEVELS.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => setFinalSkill(s.key)}
                    className={clsx(
                      'flex-1 rounded-xl py-2.5 text-[10px] font-bold transition-all',
                      finalSkill === s.key
                        ? s.color + ' ring-2 ring-offset-2 ring-gray-900 ring-green-500 scale-105'
                        : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                    )}
                  >
                    {i === 0 ? 'Yếu' : i === 1 ? 'TB-' : i === 2 ? 'TB' : i === 3 ? 'TB+' : i === 4 ? 'Khá' : 'Pro'}
                  </button>
                ))}
              </div>
              {/* Arrow indicator */}
              <div className="flex mt-1">
                {SKILL_LEVELS.map((_, i) => (
                  <div key={i} className="flex-1 flex justify-center">
                    {i === skillIdx && <div className="w-1 h-1 rounded-full bg-green-400" />}
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 py-4 text-base font-black text-white shadow-xl shadow-green-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Đang lưu...' : 'Xác nhận & Bắt đầu khám phá!'}
            </button>
            <p className="text-[10px] text-gray-600 mt-3">Bạn có thể thay đổi trình độ bất cứ lúc nào trong hồ sơ</p>
          </div>
        )}

        {/* ── Navigation ────────────────────────────────────────── */}
        {step > 0 && step < 4 && (
          <div className="flex gap-3 mt-6 shrink-0">
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1 rounded-2xl border border-gray-700 px-5 py-3.5 text-sm text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-all"
            >
              <ChevronLeft size={16} /> Quay lại
            </button>
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="flex-1 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 py-3.5 text-sm font-black text-white disabled:opacity-40 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              {step === 3 ? 'Xem kết quả' : 'Tiếp theo'} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helper Components ───────────────────────────────────────────────────────

function StepHeader({ step, total, title, sub }: { step: number; total: number; title: string; sub: string }) {
  return (
    <div className="shrink-0">
      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
        Bước {step}/{total}
      </p>
      <h2 className="text-xl font-black text-white leading-snug">{title}</h2>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  )
}
