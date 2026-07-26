'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Volume2, Loader2, PartyPopper, Headphones } from 'lucide-react'
import { getReviews, gradeReview, assetUrl, playRegion, type ReviewCard } from '@/lib/lessons'
import { trackEvent } from '@/lib/analytics'

const GRADES = [
  { q: 0, label: 'Lại', color: 'bg-red-500' },
  { q: 3, label: 'Khó', color: 'bg-orange-500' },
  { q: 4, label: 'Tốt', color: 'bg-indigo-500' },
  { q: 5, label: 'Dễ', color: 'bg-green-500' },
]

export default function ReviewPage() {
  const router = useRouter()
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [loading, setLoading] = useState(true)
  const [pos, setPos] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    getReviews()
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => cancelRef.current?.()
  }, [])

  function play(c: ReviewCard) {
    const el = audioRef.current
    if (el && c.audio_url) {
      cancelRef.current?.()
      cancelRef.current = playRegion(el, c.start_ms, c.end_ms)
      return
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(c.text)
      u.lang = 'en-US'
      speechSynthesis.speak(u)
    }
  }

  async function grade(q: number) {
    const card = cards[pos]
    if (!card) return
    try {
      await gradeReview(card.sentence_id, q)
      trackEvent('review_grade', { quality: q })
    } catch {}
    setRevealed(false)
    setPos((p) => p + 1)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }

  const card = cards[pos]

  if (!card) {
    return (
      <div className="px-5 pt-8">
        <h1 className="text-xl font-extrabold text-gray-900 mb-8">Ôn tập</h1>
        <div className="rounded-3xl bg-green-50 border border-green-100 p-10 text-center">
          <PartyPopper className="mx-auto mb-3 text-green-500" size={40} />
          <p className="text-lg font-bold text-gray-900">Xong hết rồi!</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">
            Không còn câu nào cần ôn hôm nay. Quay lại sau nhé.
          </p>
          <button
            onClick={() => router.push('/listen')}
            className="inline-flex items-center gap-2 rounded-2xl bg-white border border-green-200 px-5 py-3 text-sm font-semibold text-green-700 shadow-sm active:bg-green-50"
          >
            <Headphones size={16} /> Nghe liên tục thay vào đó
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pt-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-extrabold text-gray-900">Ôn tập</h1>
        <span className="text-sm font-medium text-gray-400">{pos + 1}/{cards.length}</span>
      </div>

      <button
        onClick={() => router.push('/listen')}
        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 mb-6"
      >
        <Headphones size={13} /> Hay nghe liên tục rảnh tay?
      </button>

      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">{card.lesson_title}</p>

      {card.audio_url && (
        <audio key={card.audio_url} ref={audioRef} src={assetUrl(card.audio_url)} preload="auto" />
      )}

      <div className="rounded-3xl bg-white border border-gray-100 p-8 shadow-sm text-center">
        <button
          onClick={() => play(card)}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
        >
          <Volume2 size={32} />
        </button>
        <p className="mt-4 text-sm text-gray-400">Nghe và nhại lại</p>

        {revealed ? (
          <p className="mt-5 text-lg font-semibold leading-relaxed text-gray-900">{card.text}</p>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="mt-5 text-sm font-semibold text-indigo-600 underline underline-offset-4"
          >
            Hiện câu
          </button>
        )}
      </div>

      {revealed && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button
              key={g.q}
              onClick={() => grade(g.q)}
              className={`${g.color} rounded-xl py-3 text-sm font-bold text-white active:scale-95 transition-transform`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
