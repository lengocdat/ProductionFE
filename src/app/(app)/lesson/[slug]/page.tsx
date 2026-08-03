'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Play, Pause, Eye, ArrowRight, Volume2, Loader2 } from 'lucide-react'
import { getLesson, mmss, assetUrl, playRegion, type Lesson } from '@/lib/lessons'

export default function LessonPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  const [listens, setListens] = useState(0)
  const [showTranscript, setShowTranscript] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    getLesson(slug)
      .then(setLesson)
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => cancelRef.current?.()
  }, [slug])

  // Full-lesson playback: play the whole file start to finish.
  function togglePlay() {
    const el = audioRef.current
    if (!el) return
    cancelRef.current?.()
    setActiveIdx(null)
    if (playing) {
      el.pause()
    } else {
      el.currentTime = 0
      setCurrentTime(0)
      el.play().catch(() => {})
    }
  }

  function onEnded() {
    setPlaying(false)
    setCurrentTime(0)
    setListens((n) => {
      const next = n + 1
      if (next >= 3) setShowTranscript(true)
      return next
    })
  }

  // Shadow one sentence: seek to its region and stop at the end.
  function playSentence(idx: number, startMs: number, endMs: number) {
    const el = audioRef.current
    if (!el) return
    cancelRef.current?.()
    setActiveIdx(idx)
    cancelRef.current = playRegion(el, startMs, endMs)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }
  if (!lesson) {
    return <div className="p-8 text-center text-gray-400">Không tìm thấy bài học.</div>
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <button onClick={() => router.push('/home')} className="text-sm text-gray-400 mb-4">← Trang chủ</button>

      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-medium text-indigo-500">{lesson.subtitle || lesson.track}</p>
        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{lesson.cefr_level}</span>
      </div>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{lesson.title}</h1>

      {/* Single audio element drives both full playback and shadowing */}
      {lesson.audio_url && (
        <audio
          ref={audioRef}
          src={assetUrl(lesson.audio_url)}
          preload="auto"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={onEnded}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />
      )}

      {/* Player */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 p-8 text-white text-center shadow-lg shadow-indigo-200 mb-6">
        <button
          onClick={togglePlay}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-indigo-600 shadow-xl active:scale-95 transition-transform"
        >
          {playing && activeIdx === null ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" className="ml-1" />}
        </button>

        {activeIdx === null && (
          <div className="mx-auto mt-4 h-1.5 w-full max-w-xs rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-white transition-[width] duration-150"
              style={{
                width: `${lesson.duration_sec ? Math.min(100, (currentTime / lesson.duration_sec) * 100) : 0}%`,
              }}
            />
          </div>
        )}

        <p className="mt-4 text-sm text-indigo-100">
          {listens < 3
            ? `Nghe lần ${listens + 1}/3 — chưa có chữ, chỉ tập trung nghe`
            : 'Đã nghe đủ 3 lần'}
        </p>
        <p className="text-xs text-indigo-200 mt-1">
          {activeIdx === null && (playing || currentTime > 0)
            ? `${mmss(Math.floor(currentTime))} / ${mmss(lesson.duration_sec)}`
            : mmss(lesson.duration_sec)}
        </p>
      </div>

      {/* Reveal transcript */}
      {!showTranscript ? (
        <button
          onClick={() => setShowTranscript(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
        >
          <Eye size={16} /> Hiện transcript {listens < 3 ? '(nên nghe 3 lần trước)' : ''}
        </button>
      ) : (
        <>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
            Transcript · chạm để nghe & nhại từng câu
          </p>
          <div className="space-y-2.5">
            {lesson.sentences?.map((s) => (
              <button
                key={s.id}
                onClick={() => playSentence(s.idx, s.start_ms, s.end_ms)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left shadow-sm transition-colors ${
                  activeIdx === s.idx ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white active:bg-indigo-50'
                }`}
              >
                <Volume2 size={18} className="mt-0.5 shrink-0 text-indigo-500" />
                <span className="text-[15px] leading-relaxed text-gray-800">{s.text}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push(`/lesson/${slug}/chunks`)}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-transform"
          >
            Tiếp: Chunks <ArrowRight size={16} />
          </button>
        </>
      )}
    </div>
  )
}
