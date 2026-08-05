'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, SkipForward, Loader2, Headphones, PartyPopper, Sparkles, Repeat, MessagesSquare } from 'lucide-react'
import {
  getListenSession,
  saveListenProgress,
  restartListenPreview,
  playRegionUntilEnd,
  assetUrl,
  TRACKS,
  type ListenItem,
} from '@/lib/lessons'
import { getMe } from '@/lib/auth'
import { trackEvent } from '@/lib/analytics'

const REPEAT_GAP_MS = 1500
const NEXT_GAP_MS = 800
const DIALOGUE_GAP_MS = 500

const DURATIONS = [
  { minutes: 10, label: '10 phút' },
  { minutes: 20, label: '20 phút' },
  { minutes: 30, label: '30 phút' },
  { minutes: 60, label: '1 giờ' },
  { minutes: 120, label: '2 giờ' },
]
const DURATION_KEY = 'ce_listen_minutes'

const REPEATS = [
  { count: 1, label: 'Không lặp' },
  { count: 2, label: 'Lặp 2 lần' },
  { count: 3, label: 'Lặp 3 lần' },
]
const REPEAT_KEY = 'ce_listen_repeats'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// speechSynthesis is unreliable once the phone screen is actually locked
// (as opposed to just dimmed — Wake Lock can't and shouldn't stop a user
// from pressing the power button). Unlike <audio>, it isn't tied into the
// browser's background-media-playback allowance, so onend/onerror can
// simply never fire. The 7s hard timeout below is only a last-resort safety
// net for that silent-failure case — it is NOT the normal exit path, because
// waiting it out means up to 7s of dead air on every item that hits it. The
// visibilitychange listener is the real fix: the moment the tab backgrounds
// mid-utterance (the learner switches to another app — exactly the "listen
// while doing something else" use case this whole page exists for), we
// cancel and resolve immediately instead of sitting through the timeout.
function speak(text: string, lang: string, timeoutMs = 7000): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      document.removeEventListener('visibilitychange', onHidden)
      resolve()
    }
    const onHidden = () => {
      if (document.visibilityState === 'hidden') {
        try {
          speechSynthesis.cancel()
        } catch {}
        finish()
      }
    }
    document.addEventListener('visibilitychange', onHidden)
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.onend = finish
    u.onerror = finish
    try {
      speechSynthesis.speak(u)
    } catch {
      finish()
      return
    }
    setTimeout(finish, timeoutMs)
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
  // Persisted so the learner picks it once ("nghe lâu khi rảnh") instead of
  // re-selecting every time they open the page.
  const [minutes, setMinutes] = useState(10)
  // How many times each phrase plays back-to-back before moving on. Lower
  // this to reach new content sooner instead of re-hearing the same phrase.
  const [repeats, setRepeats] = useState(2)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  const idxRef = useRef(0)
  const itemsRef = useRef<ListenItem[]>([])
  // The loop reads this via ref (not the `repeats` state directly) so a
  // change mid-session takes effect on the very next item instead of only
  // after the next start()/skip() re-closes over the state.
  const repeatsRef = useRef(2)
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

  function loadSession(track: string, mins: number) {
    setLoading(true)
    pause()
    idxRef.current = 0
    setIdx(0)
    setFinished(false)
    getListenSession(mins, track)
      .then((data) => {
        setItems(data)
        itemsRef.current = data
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Switching topic/duration reloads the queue from scratch (different
  // content pool), which throws away progress in the current session. A
  // stray tap on these chips mid-session shouldn't silently cost the
  // learner everything they've already listened to — confirm first once
  // there's actually something to lose.
  function confirmRestart(message: string) {
    if (idxRef.current === 0 && !playingRef.current) return true
    return window.confirm(message)
  }

  function changeTopic(t: string) {
    if (t === topic) return
    if (!confirmRestart('Đổi chủ đề sẽ bắt đầu lại phiên nghe từ đầu. Tiếp tục?')) return
    setTopic(t)
  }

  function selectMinutes(m: number) {
    if (m === minutes) return
    if (!confirmRestart('Đổi thời lượng sẽ bắt đầu lại phiên nghe từ đầu. Tiếp tục?')) return
    setMinutes(m)
    try {
      localStorage.setItem(DURATION_KEY, String(m))
    } catch {}
  }

  // Clears the saved position in the vocabulary queue and reloads — the
  // explicit opt-out from the default "resume where I left off" behavior.
  function restartFromBeginning() {
    if (!window.confirm('Nghe lại từ đầu sẽ xoá tiến độ đã nghe qua và bắt đầu lại toàn bộ từ vựng. Tiếp tục?')) return
    restartListenPreview(topic)
      .catch(() => {})
      .finally(() => loadSession(topic, minutes))
  }

  function selectRepeats(n: number) {
    setRepeats(n)
    repeatsRef.current = n
    try {
      localStorage.setItem(REPEAT_KEY, String(n))
    } catch {}
  }

  // Default the topic filter to what the learner picked at onboarding, once,
  // the first time this page loads (not tied to [topic] so it doesn't fight
  // manual chip taps afterward). Same for the saved session length.
  useEffect(() => {
    getMe()
      .then((u) => {
        if (u.preferred_track) setTopic(u.preferred_track)
      })
      .catch(() => {})
    try {
      const saved = Number(localStorage.getItem(DURATION_KEY))
      if (saved && DURATIONS.some((d) => d.minutes === saved)) setMinutes(saved)
      const savedRepeats = Number(localStorage.getItem(REPEAT_KEY))
      if (savedRepeats && REPEATS.some((r) => r.count === savedRepeats)) {
        setRepeats(savedRepeats)
        repeatsRef.current = savedRepeats
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadSession(topic, minutes)

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
  }, [topic, minutes])

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

        if (item.source === 'dialogue') {
          // The scene tying the lesson's chunks together — a real recorded
          // conversation, so it plays through once like natural speech
          // instead of the phrase drill's context → play → meaning → repeat.
          await playRegionUntilEnd(el, item.start_ms, item.end_ms)
          if (stale()) return
          await sleep(DIALOGUE_GAP_MS)
          if (stale()) return
          idxRef.current += 1
          continue
        }

        // speechSynthesis doesn't reliably run once the screen is actually
        // locked (confirmed on real devices — unlike <audio>, which does).
        // Skip straight to the plain double-play instead of attempting it
        // and eating a multi-second timeout on every single item.
        const screenLikelyOff = document.visibilityState === 'hidden'

        // Never-studied content: set the scene before the bare phrase shows
        // up, so it lands somewhere ("when you're about to deploy, you
        // say...") instead of arriving as an isolated word pair.
        if (item.example && !screenLikelyOff) {
          await speakExample(item.example)
          if (stale()) return
          await sleep(500)
          if (stale()) return
        }

        await playRegionUntilEnd(el, item.start_ms, item.end_ms)
        if (stale()) return

        if (item.meaning_start_ms != null && item.meaning_end_ms != null) {
          // Pre-recorded real audio, in the same lesson.mp3 — plays reliably
          // even with the screen locked, unlike speechSynthesis below.
          await sleep(400)
          if (stale()) return
          await playRegionUntilEnd(el, item.meaning_start_ms, item.meaning_end_ms)
          if (stale()) return
        } else if (item.meaning_vi && !screenLikelyOff) {
          await sleep(400)
          if (stale()) return
          await speakVi(item.meaning_vi)
          if (stale()) return
        } else {
          await sleep(REPEAT_GAP_MS)
          if (stale()) return
        }

        // Extra plays beyond the first, per the learner's chosen repeat
        // count — set to 1 to move on to new content right after the
        // meaning instead of re-hearing the same phrase.
        const extraPlays = Math.max(0, repeatsRef.current - 1)
        for (let r = 0; r < extraPlays; r++) {
          await playRegionUntilEnd(el, item.start_ms, item.end_ms)
          if (stale()) return
          if (r < extraPlays - 1) {
            await sleep(REPEAT_GAP_MS)
            if (stale()) return
          }
        }

        await sleep(NEXT_GAP_MS)
        if (stale()) return

        // Fire-and-forget: only "preview" (never-studied) items matter for
        // resuming — review/upcoming are already tracked via SRS due dates.
        if (item.source === 'preview') {
          saveListenProgress(item.track ?? topic, item.sentence_id).catch(() => {})
        }
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
        onClick={() => changeTopic('')}
        className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
          topic === '' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600'
        }`}
      >
        Tất cả
      </button>
      {TRACKS.map((t) => (
        <button
          key={t.key}
          onClick={() => changeTopic(t.key)}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            topic === t.key ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )

  const durationChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
      {DURATIONS.map((d) => (
        <button
          key={d.minutes}
          onClick={() => selectMinutes(d.minutes)}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            minutes === d.minutes ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>
  )

  const repeatChips = (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-none">
      {REPEATS.map((r) => (
        <button
          key={r.count}
          onClick={() => selectRepeats(r.count)}
          className={`shrink-0 rounded-2xl px-3.5 py-1.5 text-xs font-bold transition-all ${
            repeats === r.count ? 'bg-amber-600 text-white shadow-md shadow-amber-200' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="px-5 pt-8">
        <h1 className="text-xl font-extrabold text-gray-900 mb-6">Nghe liên tục</h1>
        {topicChips}
        {durationChips}
        {repeatChips}
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
        {durationChips}
        {repeatChips}
        <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center text-gray-400">
          <Headphones className="mx-auto mb-3 opacity-40" size={32} />
          <p className="text-sm font-bold text-gray-600">Chưa có nội dung để nghe cho chủ đề này</p>
          <p className="text-xs text-gray-400 mt-1">Thử chọn chủ đề khác hoặc học vài bài trước đã nhé.</p>
        </div>
      </div>
    )
  }

  const card = items[Math.min(idx, items.length - 1)]
  const BADGES = {
    review: { label: 'Ôn tập', icon: Repeat, className: 'bg-indigo-50 text-indigo-600' },
    upcoming: { label: 'Ôn tập', icon: Repeat, className: 'bg-indigo-50 text-indigo-600' },
    preview: { label: 'Làm quen', icon: Sparkles, className: 'bg-amber-50 text-amber-600' },
    dialogue: { label: 'Hội thoại', icon: MessagesSquare, className: 'bg-emerald-50 text-emerald-600' },
  } as const
  const badge = BADGES[card.source]

  return (
    <div className="px-5 pt-8 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-gray-900">Nghe liên tục</h1>
        <span className="text-sm font-medium text-gray-400">{Math.min(idx + 1, items.length)}/{items.length}</span>
      </div>

      {topicChips}
      {durationChips}
      {repeatChips}

      <p className="text-xs text-gray-400 mb-2 leading-relaxed">
        Vừa làm việc khác vừa nghe được — không cần nhìn màn hình. Ưu tiên câu cần ôn trước; cụm từ mới sẽ có tình huống ví dụ + nghĩa tiếng Việt xen giữa, rồi nghe đoạn hội thoại thật dùng các cụm đó nối tiếp nhau thành một tình huống — không phát trần trụi để tránh &quot;vịt nghe sấm&quot;. Màn hình sẽ giữ sáng khi đang phát để âm thanh không bị ngắt. Từ vựng mới sẽ tự động nối tiếp từ chỗ bạn nghe lần trước, không lặp lại từ đầu.
      </p>
      <button onClick={restartFromBeginning} className="mb-4 text-xs font-semibold text-indigo-500 underline underline-offset-2">
        Nghe lại từ đầu toàn bộ từ vựng
      </button>

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
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide mb-4 ${badge.className}`}
            >
              <badge.icon size={11} />
              {badge.label}
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
