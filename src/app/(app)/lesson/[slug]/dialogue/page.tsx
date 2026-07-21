'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Play, ArrowRight, Loader2 } from 'lucide-react'
import { getLesson, assetUrl, playRegion, type Lesson } from '@/lib/lessons'

export default function DialoguePage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    getLesson(slug)
      .then(setLesson)
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => cancelRef.current?.()
  }, [slug])

  // First speaker is left-aligned; everyone else on the right side.
  const firstSpeaker = useMemo(
    () => lesson?.dialogue?.[0]?.speaker ?? '',
    [lesson],
  )

  function playTurn(idx: number, startMs: number, endMs: number) {
    const el = audioRef.current
    if (!el) return
    cancelRef.current?.()
    setActiveIdx(idx)
    cancelRef.current = playRegion(el, startMs, endMs)
  }

  function playAll() {
    const el = audioRef.current
    const turns = lesson?.dialogue
    if (!el || !turns || turns.length === 0) return
    cancelRef.current?.()
    setActiveIdx(null)
    cancelRef.current = playRegion(el, turns[0].start_ms, turns[turns.length - 1].end_ms)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }
  if (!lesson) return <div className="p-8 text-center text-gray-400">Không tìm thấy bài học.</div>

  const turns = lesson.dialogue || []

  return (
    <div className="px-5 pt-6 pb-8">
      {lesson.audio_url && <audio ref={audioRef} src={assetUrl(lesson.audio_url)} preload="auto" />}

      <button onClick={() => router.push(`/lesson/${slug}/chunks`)} className="text-sm text-gray-400 mb-4">← Chunks</button>
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Hội thoại</h1>
      <p className="text-sm text-gray-400 mb-5">Nghe 2 người nói chuyện. Chạm từng lượt để nghe & nhại lại.</p>

      {turns.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 p-8 text-center text-gray-400">Bài này chưa có hội thoại.</div>
      ) : (
        <>
          <button
            onClick={playAll}
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm active:scale-95 transition-transform"
          >
            <Play size={15} fill="white" /> Nghe cả đoạn
          </button>

          <div className="space-y-3">
            {turns.map((t) => {
              const left = t.speaker === firstSpeaker
              return (
                <div key={t.id} className={`flex ${left ? 'justify-start' : 'justify-end'}`}>
                  <button
                    onClick={() => playTurn(t.idx, t.start_ms, t.end_ms)}
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-left text-[15px] leading-relaxed shadow-sm transition-colors ${
                      left
                        ? 'bg-white border border-gray-100 text-gray-800'
                        : 'bg-indigo-500 text-white'
                    } ${activeIdx === t.idx ? 'ring-2 ring-indigo-300' : ''}`}
                  >
                    <span className={`mb-0.5 block text-[10px] font-bold uppercase tracking-wide ${left ? 'text-indigo-500' : 'text-indigo-100'}`}>
                      {t.speaker}
                    </span>
                    {t.text}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}

      <button
        onClick={() => router.push(`/lesson/${slug}/speak`)}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-transform"
      >
        Tiếp: Nói <ArrowRight size={16} />
      </button>
    </div>
  )
}
