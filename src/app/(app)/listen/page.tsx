'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, SkipForward, Loader2, Headphones, PartyPopper, Sparkles, Repeat } from 'lucide-react'
import { getListenSession, playRegionUntilEnd, assetUrl, TRACKS, type ListenItem } from '@/lib/lessons'
import { getMe } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'

const REPEAT_GAP_MS = 1500
const NEXT_GAP_MS = 800

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

// Speaks the Vietnamese meaning aloud — used for "preview" (never-studied)
// items, where English-only audio would just be noise. Never rejects: if
// speech synthesis isn't available, resolves immediately so the session
// keeps going.
const speakVi = (text: string) => speak(text, 'vi-VN')

// Speaks the example sentence in English — gives a bare phrase somewhere to
// land ("when you're about to deploy, you say...") instead of handing over
// an isolated word pair with no situation around it.
const speakExample = (text: string) => speak(text, 'en-US')

// Shows now-playing info + play/pause/next controls on the lock screen /
// notification shade, so the session is genuinely usable without looking
// at the phone.
function updateMediaSession(item: ListenItem) {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: item.text,
    artist: item.lesson_title,
    album: 'Chunk English',
  })
}

export default function ListenPage() {
  const router = useRouter()
  const [items, setItems] = useState<ListenItem[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)
  const [topic, setTopic] = useState('')

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  const idxRef = useRef(0)
  const itemsRef = useRef<ListenItem[]>([])
  // Bumped whenever the target index changes from outside the loop's own
  // iteration (i.e. skip()); a running loop checks it after every await and
  // bails out cleanly instead of finishing the item it was mid-way through.
  const genRef = useRef(0)
  // The phone's own auto-lock timeout suspends the whole tab — including
  // audio that's actively playing — once the screen goes dark. Holding a
  // wake lock keeps the screen on for the duration of the session so that
  // never happens; released as soon as playback stops.
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // Permission/support edge cases (e.g. low battery mode) — session
      // still works, it just won't stop the screen from sleeping.
    }
  }

  async function releaseWakeLock() {
    try {
      await wakeLockRef.current?.release()
    } catch {}
    wakeLockRef.current = null
  }

  function loadSession(track: string) {
    setLoading(true)
    pause()
    idxRef.current = 0
    setIdx(0)
    setFinished(false)
    getListenSession(10, track)
      .then((data) => {
        setItems(data)
        itemsRef.current = data
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Default the topic filter to what the learner picked at onboarding, once,
  // the first time this page loads (not tied to [topic] so it doesn't fight
  // manual chip taps afterward).
  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.preferred_track) setTopic(u.preferred_track)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadSession(topic)

    // Re-acquire if the OS released it on a visibility change (e.g. brief
    // app switch) but the session is still meant to be playing.
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && playingRef.current && !wakeLockRef.current) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      playingRef.current = false
      document.removeEventListener('visibilitychange', onVisibility)
      releaseWakeLock()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic])

  async function runLoop() {
    const el = audioRef.current
    if (!el) return
    const myGen = genRef.current
    const stale = () => genRef.current !== myGen || !playingRef.current

    while (playingRef.current && idxRef.current < itemsRef.current.length) {
      const item = itemsRef.current[idxRef.current]
      setIdx(idxRef.current)
      updateMediaSession(item)

      if (item.audio_url) {
        const url = assetUrl(item.audio_url)
        if (!el.src.endsWith(url)) el.src = url

        // Never-studied content: set the scene before the bare phrase shows
        // up, so it lands somewhere ("when you're about to deploy, you
        // say...") instead of arriving as an isolated word pair.
        if (item.example) {
          await speakExample(item.example)
          if (stale()) return
          await sleep(500)
          if (stale()) return
        }

        await playRegionUntilEnd(el, item.start_ms, item.end_ms)
        if (stale()) return

        if (item.meaning_vi) {
          await sleep(400)
          if (stale()) return
          await speakVi(item.meaning_vi)
          if (stale()) return
        } else {
          await sleep(REPEAT_GAP_MS)
          if (stale()) return
        }

        await playRegionUntilEnd(el, item.start_ms, item.end_ms)
        if (stale()) return

        await sleep(NEXT_GAP_MS)
        if (stale()) return
      }

      idxRef.current += 1
    }

    if (idxRef.current >= itemsRef.current.length) {
      setFinished(true)
      trackEvent('listen_session_complete', { total_items: itemsRef.current.length })
    }
    playingRef.current = false
    setPlaying(false)
    releaseWakeLock()
  }

  function start() {
    if (idxRef.current >= itemsRef.current.length) {
      idxRef.current = 0
      setFinished(false)
    }
    if (playingRef.current) return
    playingRef.current = true
    setPlaying(true)
    requestWakeLock()
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing'
      navigator.mediaSession.setActionHandler('play', start)
      navigator.mediaSession.setActionHandler('pause', pause)
      navigator.mediaSession.setActionHandler('nexttrack', skip)
    }
    trackEvent('listen_session_start', { total_items: itemsRef.current.length })
    runLoop()
  }

  function pause() {
    playingRef.current = false
    genRef.current += 1
    audioRef.current?.pause()
    setPlaying(false)
    releaseWakeLock()
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'
  }

  function skip() {
    if (idxRef.current >= itemsRef.current.length - 1) return
    idxRef.current += 1
    setIdx(idxRef.current)
    genRef.current += 1
    audioRef.current?.pause()
    if (playingRef.current) runLoop()
  }

  const topicChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
      <button
        onClick={() => setTopic('')}
        className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
          topic === '' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600'
        }`}
      >
        Tất cả
      </button>
      {TRACKS.map((t) => (
        <button
          key={t.key}
          onClick={() => setTopic(t.key)}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            topic === t.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">Nghe liên tục</h1>
        {topicChips}
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500" />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="px-5 pt-8">
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">Nghe liên tục</h1>
        {topicChips}
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400">
          <Headphones className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có nội dung để nghe cho chủ đề này</p>
          <p className="text-xs text-gray-400 mt-1">Thử chọn chủ đề khác hoặc học vài bài trước đã nhé.</p>
        </div>
      </div>
    )
  }

  const card = items[Math.min(idx, items.length - 1)]
  const isPreview = card.source === 'preview'

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-gray-900">Nghe liên tục</h1>
        <span className="text-sm font-medium text-gray-400">{Math.min(idx + 1, items.length)}/{items.length}</span>
      </div>

      {topicChips}

      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        Vừa làm việc khác vừa nghe được — không cần nhìn màn hình. Ưu tiên câu cần ôn trước; cụm từ mới sẽ có tình huống ví dụ + nghĩa tiếng Việt xen giữa, không phát trần trụi để tránh &quot;vịt nghe sấm&quot;. Màn hình sẽ giữ sáng khi đang phát để âm thanh không bị ngắt.
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

            {card.example && (
              <p className="mt-5 text-sm italic text-gray-400 leading-relaxed">&ldquo;{card.example}&rdquo;</p>
            )}
            <p className="mt-2 text-lg font-semibold leading-relaxed text-gray-900">{card.text}</p>
            {card.meaning_vi && <p className="mt-2 text-sm text-amber-600">{card.meaning_vi}</p>}
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
