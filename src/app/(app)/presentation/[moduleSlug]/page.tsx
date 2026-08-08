'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, PlusCircle, Sparkles, Clock, ArrowDown, CheckSquare, Volume2, PartyPopper } from 'lucide-react'
import {
  getPresentationModule,
  listPresentationPhases,
  getAdjacentModules,
  playRegion,
  type PresentationModule,
  type PresentationPhase,
  type VocabularyItem,
  type DrillLine,
} from '@/lib/presentation'
import { addToDraft, getDraftModuleIds } from '@/lib/presentationDraft'

// DrillLineRow renders one shadowable phrase with a play button when audio
// is available for it (start_ms/end_ms present and non-zero-length).
function DrillLineRow({
  line,
  onPlay,
  className,
}: {
  line: DrillLine
  onPlay: (() => void) | null
  className: string
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onPlay && (
        <button
          onClick={onPlay}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white active:scale-90 transition-all"
        >
          <Volume2 size={12} />
        </button>
      )}
      <span className="flex-1">{line.text}</span>
    </div>
  )
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
        <span>{emoji}</span> {title}
      </p>
      {children}
    </div>
  )
}

// Groups vocabulary by category when any item carries one, preserving
// first-seen category order; otherwise returns a single unlabeled group.
function groupVocabulary(items: VocabularyItem[]): { category: string | null; items: VocabularyItem[] }[] {
  if (!items.some((v) => v.category)) {
    return [{ category: null, items }]
  }
  const order: string[] = []
  const byCategory = new Map<string, VocabularyItem[]>()
  for (const v of items) {
    const cat = v.category || 'Khác'
    if (!byCategory.has(cat)) {
      byCategory.set(cat, [])
      order.push(cat)
    }
    byCategory.get(cat)!.push(v)
  }
  return order.map((category) => ({ category, items: byCategory.get(category)! }))
}

export default function PresentationModulePage() {
  const params = useParams<{ moduleSlug: string }>()
  const router = useRouter()
  const [module, setModule] = useState<PresentationModule | null>(null)
  const [phases, setPhases] = useState<PresentationPhase[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const playLine = (line: DrillLine) => {
    if (!audioRef.current || line.start_ms === undefined || line.end_ms === undefined) return
    playRegion(audioRef.current, line.start_ms, line.end_ms)
  }
  const canPlay = (line: DrillLine) =>
    module?.audio_url && line.start_ms !== undefined && line.end_ms !== undefined && line.end_ms > line.start_ms

  useEffect(() => {
    getPresentationModule(params.moduleSlug)
      .then(setModule)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
    listPresentationPhases().then(setPhases).catch(() => setPhases([]))
    setDraftCount(getDraftModuleIds().length)
  }, [params.moduleSlug])

  const vocabGroups = useMemo(() => groupVocabulary(module?.vocabulary || []), [module])
  const { next, phase } = useMemo(
    () => (phases.length > 0 ? getAdjacentModules(phases, params.moduleSlug) : { next: null, prev: null, phase: null }),
    [phases, params.moduleSlug]
  )

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="animate-spin h-8 w-8 rounded-full border-3 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  if (notFound || !module) {
    return (
      <div className="px-5 pt-8 pb-12 max-w-xl mx-auto text-center text-gray-400">
        <p className="text-sm font-bold text-gray-600">Không tìm thấy module này</p>
        <Link href="/presentation" className="text-xs text-amber-600 font-semibold mt-2 inline-block">
          ← Về lộ trình
        </Link>
      </div>
    )
  }

  const handleAddToDraft = () => {
    const ids = addToDraft(module.id)
    setDraftCount(ids.length)
    toast.success(`Đã thêm "${module.title}" vào bản nháp deck (${ids.length} module)`)
  }

  return (
    <div className="px-5 pt-6 pb-40 max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1 text-xs font-bold text-gray-500 active:text-gray-700"
      >
        <ArrowLeft size={14} /> Quay lại
      </button>

      {module.audio_url && <audio ref={audioRef} src={module.audio_url} preload="none" />}

      <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{module.title}</h1>

      {!module.has_content ? (
        <div className="mt-6 rounded-3xl bg-gray-50 border border-gray-100 p-8 text-center text-gray-400">
          <Clock className="mx-auto mb-3 opacity-40" size={28} />
          <p className="text-sm font-bold text-gray-600">Nội dung đang được biên soạn</p>
          <p className="text-xs text-gray-400 mt-1">Module này sẽ theo đúng template khi ra mắt.</p>
        </div>
      ) : (
        <>
          {module.goal && (
            <Section emoji="🎯" title="Goal">
              <p className="text-sm text-gray-700 leading-relaxed rounded-2xl bg-amber-50 border border-amber-100 p-4">
                {module.goal}
              </p>
            </Section>
          )}

          {module.scenario && (
            <Section emoji="🎬" title="Scenario">
              <p className="text-sm text-gray-700 leading-relaxed rounded-2xl bg-violet-50 border border-violet-100 p-4 whitespace-pre-line">
                {module.scenario}
              </p>
            </Section>
          )}

          {(module.ai_role || module.user_role) && (
            <Section emoji="🎭" title="Roles">
              <div className="grid grid-cols-2 gap-2">
                {module.ai_role && (
                  <div className="rounded-2xl bg-white border border-gray-100 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">AI</p>
                    <p className="text-sm font-bold text-gray-900">{module.ai_role.role}</p>
                    {module.ai_role.behavior && module.ai_role.behavior.length > 0 && (
                      <ul className="mt-1.5 space-y-0.5">
                        {module.ai_role.behavior.map((b, i) => (
                          <li key={i} className="text-xs text-gray-500">• {b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {module.user_role && (
                  <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400 mb-1">Bạn</p>
                    <p className="text-sm font-bold text-amber-900">{module.user_role}</p>
                  </div>
                )}
              </div>
            </Section>
          )}

          {module.simulator_steps && module.simulator_steps.length > 0 && (
            <Section emoji="💬" title="Conversation Flow">
              <ol className="space-y-2">
                {module.simulator_steps.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-white border border-gray-100 p-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 text-white text-[10px] font-extrabold mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-800 italic">&ldquo;{s.question}&rdquo;</p>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {module.detect_keywords && module.detect_keywords.length > 0 && (
            <Section emoji="🔎" title="Detect">
              <div className="flex flex-wrap gap-1.5">
                {module.detect_keywords.map((k, i) => (
                  <span key={i} className="rounded-full bg-violet-50 border border-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                    {k}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {module.evaluation_rubric && module.evaluation_rubric.length > 0 && (
            <Section emoji="📊" title="Evaluation">
              <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {module.evaluation_rubric.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-gray-800">{c.label}</p>
                    <p className="text-xs font-bold text-violet-600 shrink-0">{c.weight_percent}%</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.simulator_categories && module.simulator_categories.length > 0 && (
            <Section emoji="🗂" title="Categories">
              <div className="flex flex-wrap gap-1.5">
                {module.simulator_categories.map((c, i) => (
                  <span key={i} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                    {c}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {module.simulator_difficulty && (
            <Section emoji="🎚" title="Difficulty">
              {module.simulator_difficulty.summary && (
                <p className="text-sm font-semibold text-gray-800">{module.simulator_difficulty.summary}</p>
              )}
              {module.simulator_difficulty.levels && module.simulator_difficulty.levels.length > 0 && (
                <div className="space-y-2">
                  {module.simulator_difficulty.levels.map((lvl, i) => (
                    <div key={i} className="rounded-xl bg-white border border-gray-100 p-3">
                      <p className="text-sm font-bold text-gray-900 mb-1">{lvl.name}</p>
                      {lvl.features && lvl.features.length > 0 && (
                        <ul className="space-y-0.5">
                          {lvl.features.map((f, j) => (
                            <li key={j} className="text-xs text-gray-500">• {f}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {module.thinking_in_english && (
            <Section emoji="🧠" title="Thinking in English">
              <p className="text-sm text-gray-700 leading-relaxed rounded-2xl bg-indigo-50 border border-indigo-100 p-4 whitespace-pre-line">
                {module.thinking_in_english}
              </p>
            </Section>
          )}

          {module.blocks && module.blocks.length > 0 && (
            <Section emoji="🧩" title="Patterns">
              <div className="space-y-3">
                {module.blocks.map((b, i) => (
                  <div key={i} className="rounded-2xl bg-white border border-gray-100 p-4">
                    <p className="text-sm font-extrabold text-gray-900 mb-1">{b.title}</p>
                    {b.description && <p className="text-xs text-gray-500 mb-2">{b.description}</p>}
                    {b.sentences && b.sentences.length > 0 && (
                      <ul className="space-y-1 mb-2">
                        {b.sentences.map((s, j) => (
                          <li key={j}>
                            <DrillLineRow
                              line={s}
                              onPlay={canPlay(s) ? () => playLine(s) : null}
                              className="text-sm font-semibold text-gray-800 rounded-lg bg-gray-50 px-3 py-1.5"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    {b.examples && b.examples.length > 0 && (
                      <div className="mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Ví dụ</p>
                        <ul className="space-y-1">
                          {b.examples.map((ex, j) => (
                            <li key={j} className="text-xs text-gray-600 italic pl-2 border-l-2 border-amber-200">
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {b.tip && (
                      <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">👉 {b.tip}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.formula_steps && module.formula_steps.length > 0 && (
            <Section emoji="🧭" title="Cấu trúc">
              <div className="space-y-3">
                {module.formula_steps.map((flow, fi) => (
                  <div key={fi} className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2 text-center">
                      {flow.label}
                    </p>
                    <div className="flex flex-col items-center gap-1">
                      {flow.steps.map((step, i) => (
                        <div key={i} className="flex flex-col items-center">
                          <span className="text-sm font-bold text-gray-800">{step}</span>
                          {i < flow.steps.length - 1 && <ArrowDown size={14} className="text-gray-300 my-1" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.timing_table && module.timing_table.length > 0 && (
            <Section emoji="⏱" title="Suggested Timing">
              <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden divide-y divide-gray-100">
                {module.timing_table.map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-gray-800">{row.section}</p>
                    <p className="text-xs font-bold text-gray-500 shrink-0">{row.time}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.worked_examples && module.worked_examples.length > 0 && (
            <Section emoji="🎤" title="Worked Examples">
              <div className="space-y-3">
                {module.worked_examples.map((ex, i) => (
                  <div key={i} className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">{ex.label}</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{ex.text}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.transitions && module.transitions.length > 0 && (
            <Section emoji="🔄" title="Transition Library">
              <div className="space-y-2">
                {module.transitions.map((t, i) => (
                  <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{t.label}</p>
                    <p className="text-sm text-gray-700 italic">&ldquo;{t.text}&rdquo;</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.vocabulary && module.vocabulary.length > 0 && (
            <Section emoji="📚" title={`Vocabulary (${module.vocabulary.length})`}>
              <div className="space-y-3">
                {vocabGroups.map((group, gi) => (
                  <div key={gi}>
                    {group.category && (
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{group.category}</p>
                    )}
                    <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden divide-y divide-gray-100">
                      {group.items.map((v, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5">
                          <p className="text-sm font-bold text-gray-900">{v.word}</p>
                          {v.meaning_vi && <p className="text-xs text-gray-400">{v.meaning_vi}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.native_tips && module.native_tips.length > 0 && (
            <Section emoji="💬" title="Native Tip">
              <div className="space-y-2">
                {module.native_tips.map((n, i) => (
                  <div key={i} className="rounded-xl bg-violet-50 border border-violet-100 p-3 space-y-1">
                    <p className="text-xs text-rose-500">❌ {n.wrong}</p>
                    {n.right.map((r, j) => (
                      <p key={j} className="text-sm font-semibold text-violet-900">✅ {r}</p>
                    ))}
                    {n.note && <p className="text-xs text-violet-500">{n.note}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.common_mistakes && module.common_mistakes.length > 0 && (
            <Section emoji="❌" title="Common Mistakes">
              <div className="space-y-2">
                {module.common_mistakes.map((m, i) => (
                  <div key={i} className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                    <p className="text-xs text-rose-600 line-through">{m.wrong}</p>
                    <p className="text-sm text-emerald-700 font-semibold mt-1">✅ {m.correct}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.speaking_drill && module.speaking_drill.length > 0 && (
            <Section emoji="🗣" title="Speaking Drill">
              <p className="text-xs text-gray-400 mb-2">Đọc to mỗi câu 5 lần, không cần quá nhanh.</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                {module.speaking_drill.map((s, i) => (
                  <li key={i}>
                    <DrillLineRow
                      line={s}
                      onPlay={canPlay(s) ? () => playLine(s) : null}
                      className="text-sm text-gray-700 rounded-xl bg-white border border-gray-100 px-3 py-2"
                    />
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {module.presentation_challenge && (
            <Section emoji="🎯" title="Presentation Challenge">
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {module.presentation_challenge.instruction}
                  {module.presentation_challenge.duration_seconds
                    ? ` (${module.presentation_challenge.duration_seconds}s)`
                    : ''}
                </p>
                {module.presentation_challenge.topics && module.presentation_challenge.topics.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Chọn một chủ đề</p>
                    <ul className="space-y-1">
                      {module.presentation_challenge.topics.map((t, i) => (
                        <li key={i} className="text-xs text-gray-600">• {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {module.presentation_challenge.structure && module.presentation_challenge.structure.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Cấu trúc</p>
                    <p className="text-xs text-gray-600">{module.presentation_challenge.structure.join(' → ')}</p>
                  </div>
                )}
                {module.presentation_challenge.requirements && module.presentation_challenge.requirements.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Requirements</p>
                    <ul className="space-y-1">
                      {module.presentation_challenge.requirements.map((r, i) => (
                        <li key={i} className="text-xs text-gray-600">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {module.presentation_challenge.note && (
                  <p className="text-xs text-amber-700 font-semibold">{module.presentation_challenge.note}</p>
                )}
                {module.presentation_challenge.reflection_questions && module.presentation_challenge.reflection_questions.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Sau khi ghi hình, tự hỏi</p>
                    <ul className="space-y-1">
                      {module.presentation_challenge.reflection_questions.map((r, i) => (
                        <li key={i} className="text-xs text-gray-600">• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {module.homework && (
            <Section emoji="📝" title="Homework">
              <div className="rounded-2xl bg-white border border-gray-100 p-4 space-y-3">
                <p className="text-sm text-gray-700 leading-relaxed">{module.homework.instruction}</p>
                {module.homework.example_topics && module.homework.example_topics.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Ví dụ có thể là</p>
                    <ul className="space-y-1">
                      {module.homework.example_topics.map((t, i) => (
                        <li key={i} className="text-xs text-gray-600">• {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {module.homework.feedback_points && module.homework.feedback_points.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Sau khi bạn viết xong, mình sẽ</p>
                    <ul className="space-y-1">
                      {module.homework.feedback_points.map((t, i) => (
                        <li key={i} className="text-xs text-gray-600">• {t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {module.ai_prompt && (
            <Section emoji="🤖" title="AI Practice Prompt">
              <p className="text-xs text-gray-600 leading-relaxed rounded-2xl bg-indigo-50 border border-indigo-100 p-4 font-mono whitespace-pre-line">
                {module.ai_prompt}
              </p>
            </Section>
          )}

          {module.readiness_checklist && module.readiness_checklist.length > 0 && (
            <Section emoji="📌" title="Before You Present">
              <div className="space-y-1.5">
                {module.readiness_checklist.map((q, i) => (
                  <div key={i} className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                    <p className="text-sm text-amber-900">{q}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.completion_checklist && module.completion_checklist.length > 0 && (
            <Section emoji="✅" title="Completion Checklist">
              <div className="space-y-1.5">
                {module.completion_checklist.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-xl bg-white border border-gray-100 px-3 py-2">
                    <CheckSquare size={15} className="text-gray-300 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{c}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {module.closing_note && (
            <p className="text-xs text-gray-400 italic text-center mt-2 mb-4">{module.closing_note}</p>
          )}
        </>
      )}

      {module.has_content && (
        <div className="fixed bottom-20 left-0 right-0 px-5 max-w-xl mx-auto space-y-2">
          {/* Primary CTA — always tells the learner exactly what to tap next. */}
          {next ? (
            <Link
              href={`/presentation/${next.slug}`}
              className="flex items-center justify-between gap-2 rounded-2xl bg-amber-500 py-3.5 px-5 text-sm font-bold text-white shadow-lg shadow-amber-200 active:scale-[0.98] transition-all"
            >
              <span className="truncate">Tiếp theo: {next.title}</span>
              <ArrowRight size={16} className="shrink-0" />
            </Link>
          ) : (
            <Link
              href="/presentation/library"
              className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3.5 px-5 text-sm font-bold text-white shadow-lg shadow-amber-200 active:scale-[0.98] transition-all"
            >
              <PartyPopper size={16} /> Đã xong toàn bộ lộ trình — Xem thư viện
            </Link>
          )}

          {/* Secondary: only lesson-type modules can go into a deck script. */}
          {module.module_type === 'lesson' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToDraft}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-white border border-amber-200 py-2.5 text-xs font-bold text-amber-700 shadow-sm active:scale-[0.98] transition-all"
              >
                <PlusCircle size={14} /> Thêm vào Deck
              </button>
              {draftCount > 0 && (
                <Link
                  href="/presentation/library/new"
                  className="flex items-center gap-1.5 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-bold text-amber-700 shadow-sm active:scale-[0.98] transition-all"
                >
                  <Sparkles size={14} /> {draftCount}
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
