'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Volume2, ArrowRight, Loader2 } from 'lucide-react'
import { getLesson, type Lesson } from '@/lib/lessons'

export default function ChunksPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLesson(slug)
      .then(setLesson)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  function speak(text: string, url?: string) {
    if (url) {
      new Audio(url).play().catch(() => {})
      return
    }
    // Fallback to browser TTS if no audio file
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      speechSynthesis.speak(u)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }
  if (!lesson) return <div className="p-8 text-center text-gray-400">Không tìm thấy bài học.</div>

  return (
    <div className="px-5 pt-6 pb-8">
      <button onClick={() => router.push(`/lesson/${slug}`)} className="text-sm text-gray-400 mb-4">← Bài học</button>
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Chunks & Collocations</h1>
      <p className="text-sm text-gray-400 mb-6">Nghe và lặp lại từng cụm. Đây là cách người bản xứ nói.</p>

      <div className="space-y-4">
        {lesson.chunks?.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <button
              onClick={() => speak(c.phrase, c.audio_url)}
              className="flex items-center gap-2.5 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <Volume2 size={17} />
              </span>
              <span className="text-lg font-extrabold text-gray-900">{c.phrase}</span>
            </button>

            {c.variations && c.variations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.variations.map((v) => (
                  <button
                    key={v}
                    onClick={() => speak(v)}
                    className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 active:bg-indigo-100"
                  >
                    {v}
                  </button>
                ))}
              </div>
            )}

            {c.example && (
              <button
                onClick={() => speak(c.example!)}
                className="mt-3 block w-full rounded-xl bg-gray-50 px-4 py-3 text-left text-sm italic text-gray-700 active:bg-gray-100"
              >
                “{c.example}”
              </button>
            )}

            {c.explanation && (
              <p className="mt-2 text-xs leading-relaxed text-gray-500">💡 {c.explanation}</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push(`/lesson/${slug}/speak`)}
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-transform"
      >
        Tiếp: Nói <ArrowRight size={16} />
      </button>
    </div>
  )
}
