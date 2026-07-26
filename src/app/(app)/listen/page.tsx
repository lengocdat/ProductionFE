'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, SkipForward, Loader2, Headphones, PartyPopper, Sparkles, Repeat } from 'lucide-react'
import { getListenSession, playRegionUntilEnd, assetUrl, type ListenItem } from '@/lib/lessons'
import { trackEvent } from '@/lib/analytics'

const REPEAT_GAP_MS = 1500
const NEXT_GAP_MS = 800

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default function ListenPage() {
  const router = useRouter()
  const [items, setItems] = useState<ListenItem[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  const idxRef = useRef(0)
  const itemsRef = useRef<ListenItem[]>([])

  useEffect(() => {
    getListenSession(10)
      .then((data) => {
        setItems(data)
        itemsRef.current = data
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => {
      playingRef.current = false
    }
  }, [])

  async function runLoop() {
    const el = audioRef.current
    if (!el) return

    while (playingRef.current && idxRef.current < itemsRef.current.length) {
      const item = itemsRef.current[idxRef.current]
      setIdx(idxRef.current)

      if (item.audio_url) {
        const url = assetUrl(item.audio_url)
        if (!el.src.endsWith(url)) el.src = url

        await playRegionUntilEnd(el, item.start_ms, item.end_ms)
        if (!playingRef.current) break
        await sleep(REPEAT_GAP_MS)
        if (!playingRef.current) break
        await playRegionUntilEnd(el, item.start_ms, item.end_ms)
        if (!playingRef.current) break
        await sleep(NEXT_GAP_MS)
      }

      idxRef.current += 1
    }

    if (idxRef.current >= itemsRef.current.length) {
      setFinished(true)
      trackEvent('listen_session_complete', { total_items: itemsRef.current.length })
    }
    playingRef.current = false
    setPlaying(false)
  }

  function start() {
    if (playingRef.current) return
    if (idxRef.current >= itemsRef.current.length) {
      idxRef.current = 0
      setFinished(false)
    }
    playingRef.current = true
    setPlaying(true)
    trackEvent('listen_session_start', { total_items: itemsRef.current.length })
    runLoop()
  }

  function pause() {
    playingRef.current = false
    audioRef.current?.pause()
    setPlaying(false)
  }

  function skip() {
    audioRef.current?.pause()
    if (idxRef.current < itemsRef.current.length - 1) {
      idxRef.current += 1
      setIdx(idxRef.current)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-5 pt-8">
        <h1 className="text-xl font-extrabold text-gray-900 mb-8">Nghe liên tục</h1>
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400">
          <Headphones className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có nội dung để nghe</p>
          <p className="text-xs text-gray-400 mt-1">Học vài bài trước đã nhé.</p>
        </div>
      </div>
    )
  }

  const card = items[Math.min(idx, items.length - 1)]
  const isPreview = card.source === 'preview'

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-gray-900">Nghe liên tục</h1>
        <span className="text-sm font-medium text-gray-400">{Math.min(idx + 1, items.length)}/{items.length}</span>
      </div>

      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Vừa làm việc khác vừa nghe được — mỗi câu phát 2 lần, tự động qua câu tiếp theo. Ưu tiên câu cần ôn trước.
      </p>

      {card.audio_url && <audio ref={audioRef} preload="auto" />}

      {finished ? (
        <div className="rounded-3xl bg-green-50 border border-green-100 p-10 text-center">
          <PartyPopper className="mx-auto mb-3 text-green-500" size={40} />
          <p className="text-lg font-bold text-gray-900">Xong phiên nghe!</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">Đã nghe qua {items.length} câu.</p>
          <button
            onClick={start}
            className="rounded-2xl bg-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-transform"
          >
            Nghe lại từ đầu
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-3xl bg-white border border-gray-100 p-8 shadow-sm text-center">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide mb-4 ${
                isPreview ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {isPreview ? <Sparkles size={11} /> : <Repeat size={11} />}
              {isPreview ? 'Làm quen' : 'Ôn tập'}
            </span>

            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">{card.lesson_title}</p>

            <button
              onClick={playing ? pause : start}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
            >
              {playing ? <Pause size={30} /> : <Play size={30} className="ml-1" />}
            </button>

            <p className="mt-5 text-lg font-semibold leading-relaxed text-gray-900">{card.text}</p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={playing ? pause : start}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-transform"
            >
              {playing ? <><Pause size={16} /> Tạm dừng</> : <><Play size={16} /> Bắt đầu nghe</>}
            </button>
            <button
              onClick={skip}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 text-sm font-semibold text-gray-600 active:bg-gray-50"
            >
              <SkipForward size={16} />
            </button>
          </div>
        </>
      )}

      <button onClick={() => router.push('/review')} className="mt-6 w-full text-center text-xs text-gray-400">
        ← Về ôn tập kiểu thẻ
      </button>
    </div>
  )
}
