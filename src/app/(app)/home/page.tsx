'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play, Check, Headphones, Sparkles, ChevronRight, Layers, BarChart2, Repeat, Flag, Presentation } from 'lucide-react'
import { listLessons, mmss, TRACKS, CEFR_LEVELS, getRoadmap, type Lesson, type Roadmap } from '@/lib/lessons'
import { getMe } from '@/lib/auth'

const CEFR_COLORS: Record<string, { bg: string; text: string; border: string; tag: string }> = {
  A1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', tag: 'bg-emerald-500' },
  A2: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', tag: 'bg-teal-500' },
  B1: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', tag: 'bg-indigo-500' },
  B2: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', tag: 'bg-violet-500' },
  C1: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', tag: 'bg-amber-500' },
}

export default function HomePage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [track, setTrack] = useState<string>('everyday')
  const [cefrLevel, setCefrLevel] = useState<string>('A1') // Mặc định mở phần Dễ nhất A1 trước
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)

  // Ưu tiên chủ đề/trình độ đã chọn lúc onboarding thay vì mặc định cứng.
  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.preferred_track) setTrack(u.preferred_track)
        if (u.preferred_level) setCefrLevel(u.preferred_level)
      })
      .catch(() => {})
    getRoadmap().then(setRoadmap).catch(() => {})
  }, [])

  // Fetch dữ liệu on-demand khi chuyển Track hoặc chuyển Cấp độ
  useEffect(() => {
    setLoading(true)
    listLessons(track, cefrLevel)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false))
  }, [track, cefrLevel])

  const today = lessons[0]

  return (
    <div className="px-5 pt-8 pb-12 max-w-xl mx-auto">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🎧</span>
          <div>
            <h1 className="text-xl font-extrabold text-indigo-900 tracking-tight">Chunk English</h1>
            <p className="text-xs font-medium text-gray-500">Học Tiếng Anh theo lộ trình từ Dễ đến Khó</p>
          </div>
        </div>
      </header>

      {/* "What do I do right now" — the whole point of the roadmap: open the
          app, don't think, just do the next thing it shows you. */}
      {roadmap && (
        <div className="mb-6 rounded-3xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-200">
                Giai đoạn {roadmap.stage.number}/3
              </span>
              <span className="text-[10px] font-semibold text-indigo-200">
                {roadmap.completed_count}{roadmap.stage.max_lessons > 0 ? `/${roadmap.stage.max_lessons}` : ''} bài
              </span>
            </div>
            <p className="text-base font-extrabold mb-1">{roadmap.stage.name}</p>
            <p className="text-xs text-indigo-100 leading-relaxed">{roadmap.stage.goal}</p>
            {roadmap.stage.max_lessons > 0 && (
              <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${Math.min(100, (roadmap.completed_count / roadmap.stage.max_lessons) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {roadmap.next_lessons.length > 0 && (
            <div className="p-4 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1">Tiếp theo</p>
              {roadmap.next_lessons.map((l) => (
                <Link
                  key={l.id}
                  href={`/lesson/${l.slug}`}
                  className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 active:bg-gray-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                    <Play size={15} fill="currentColor" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">{l.title}</p>
                    <p className="text-xs text-gray-400">{l.track} · {l.cefr_level}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 shrink-0" />
                </Link>
              ))}
              {roadmap.due_reviews > 0 && (
                <Link
                  href="/review"
                  className="flex items-center gap-3 rounded-2xl bg-amber-50 p-3 active:bg-amber-100"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                    <Repeat size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-amber-900">{roadmap.due_reviews} câu cần ôn hôm nay</p>
                    <p className="text-xs text-amber-600">Ôn trước khi học bài mới sẽ nhớ lâu hơn</p>
                  </div>
                  <ChevronRight size={16} className="text-amber-300 shrink-0" />
                </Link>
              )}
            </div>
          )}

          {roadmap.next_lessons.length === 0 && (
            <div className="p-4 flex items-center gap-2 text-sm text-gray-500">
              <Flag size={16} className="text-indigo-500 shrink-0" />
              Bạn đã học hết bài phù hợp giai đoạn này — khám phá thêm ở danh sách bên dưới.
            </div>
          )}
        </div>
      )}

      {/* Entry point to hands-free listening — was previously buried inside
          Ôn tập, so users doing something else with their hands never saw it. */}
      <Link
        href="/listen"
        className="mb-6 flex items-center gap-3.5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Headphones size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Đang làm việc khác? Nghe liên tục</p>
          <p className="text-xs text-emerald-50">Không cần nhìn màn hình — học trong lúc rảnh tay</p>
        </div>
        <ChevronRight size={18} className="text-white/70 shrink-0" />
      </Link>

      {/* Entry point to the Presentation Library — the Tech Leader roadmap
          (Opening, Architecture, Q&A...) chained into full talks. */}
      <Link
        href="/presentation"
        className="mb-6 flex items-center gap-3.5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-lg shadow-amber-200 active:scale-[0.98] transition-all"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20">
          <Presentation size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Presentation Library</p>
          <p className="text-xs text-amber-50">Ghép module thành bài thuyết trình hoàn chỉnh</p>
        </div>
        <ChevronRight size={18} className="text-white/70 shrink-0" />
      </Link>

      {/* 1. Track Filter Tabs (Everyday, Developer, Product, Meeting, Speaking) */}
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <Layers size={13} /> Chọn Chủ Đề
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TRACKS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTrack(t.key)}
              className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                track === t.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CEFR Level Filter Tabs (Từ Dễ A1 -> Khó C1) - Fetch Data On-Demand */}
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
          <BarChart2 size={13} /> Cấp Độ (Từ Dễ đến Khó)
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CEFR_LEVELS.map((lvl) => {
            const isActive = cefrLevel === lvl.key
            return (
              <button
                key={lvl.key}
                onClick={() => setCefrLevel(lvl.key)}
                className={`flex flex-col items-center justify-center rounded-xl py-2 px-1 text-center transition-all border ${
                  isActive
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm font-extrabold'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 font-medium'
                }`}
              >
                <span className="text-xs">{lvl.label}</span>
                <span className={`text-[9px] mt-0.5 px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-indigo-200 text-indigo-800 font-bold' : 'text-gray-400'
                }`}>
                  {lvl.badge}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading indicator */}
      {loading ? (
        <div className="flex h-[35vh] flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 rounded-full border-3 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-semibold text-gray-400">Đang tải bài học ({cefrLevel})...</p>
        </div>
      ) : lessons.length > 0 ? (
        <>
          {/* Featured Hero Lesson */}
          {today && (
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" /> Bài Học Nổi Bật
              </p>
              <Link
                href={`/lesson/${today.slug}`}
                className="block rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide">
                    {today.cefr_level}
                  </span>
                  <span className="text-xs font-medium text-indigo-100">{today.subtitle || today.track}</span>
                </div>
                <h2 className="text-2xl font-extrabold mb-5 leading-tight">{today.title}</h2>
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white text-indigo-900 px-4 py-2 text-xs font-bold shadow-sm">
                    <Play size={14} fill="currentColor" /> Bắt đầu ngay
                  </span>
                  <span className="text-xs font-semibold text-indigo-200">{mmss(today.duration_sec)}</span>
                </div>
              </Link>
            </div>
          )}

          {/* List of Lessons */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Danh sách bài học {cefrLevel !== 'ALL' ? `cấp độ ${cefrLevel}` : ''} ({lessons.length} bài)
              </p>
            </div>
            <div className="space-y-3">
              {lessons.map((l) => {
                const color = CEFR_COLORS[l.cefr_level] || CEFR_COLORS.A1
                return (
                  <Link
                    key={l.id}
                    href={`/lesson/${l.slug}`}
                    className={`flex items-center gap-3.5 rounded-2xl bg-white border ${color.border} p-4 shadow-sm hover:shadow-md active:scale-[0.99] transition-all`}
                  >
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bg} ${color.text}`}>
                      {l.completed ? <Check size={20} /> : <Play size={18} fill="currentColor" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="truncate text-sm font-bold text-gray-900">{l.title}</p>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{l.subtitle || l.track} · {mmss(l.duration_sec)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`rounded-lg px-2 py-1 text-[10px] font-extrabold ${color.bg} ${color.text}`}>
                        {l.cefr_level}
                      </span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400 my-4">
          <Headphones className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có bài học cho cấp độ {cefrLevel}</p>
          <p className="text-xs text-gray-400 mt-1">Vui lòng chọn cấp độ khác hoặc chọn Tất cả.</p>
        </div>
      )}
    </div>
  )
}
