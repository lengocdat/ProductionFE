'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Volume2, ArrowRight, Loader2, Mic, CheckCircle2, Sparkles, Square } from 'lucide-react'
import { getLesson, assetUrl, playRegion, type Lesson, type Chunk } from '@/lib/lessons'
import { getSpeechRecognition, roughlyMatches, type SpeechRecognitionAlt } from '@/lib/speech'
import { trackEvent } from '@/lib/analytics'

const TARGET_REPS = 2 // say it correctly this many times before it feels "done"

function speak(text: string) {
  if ('speechSynthesis' in window) {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    speechSynthesis.speak(u)
  }
}

// Repeat-after-me widget for a single chunk: mic in, live check against the
// phrase (or a variation), counts correct reps. Never blocks progress —
// speech recognition on short utterances is noisy, so this encourages
// rather than gates.
function RepeatPractice({ chunk }: { chunk: Chunk }) {
  const [supported] = useState(() => getSpeechRecognition() !== null)
  const [listening, setListening] = useState(false)
  const [reps, setReps] = useState(0)
  const [lastHeard, setLastHeard] = useState('')
  const [lastOk, setLastOk] = useState<boolean | null>(null)
  const recognitionRef = useRef<SpeechRecognitionAlt | null>(null)

  function start() {
    const Recognition = getSpeechRecognition()
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const said = event.results[event.results.length - 1][0].transcript as string
      const targets = [chunk.phrase, ...(chunk.variations || [])]
      const ok = targets.some((t) => roughlyMatches(said, t))
      setLastHeard(said)
      setLastOk(ok)
      if (ok) {
        setReps((r) => {
          const next = r + 1
          if (next === TARGET_REPS) trackEvent('chunk_repeat_mastered', { phrase: chunk.phrase })
          return next
        })
      }
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  if (!supported) return null

  const done = reps >= TARGET_REPS

  return (
    <div className="mt-3 flex items-center gap-3">
      <button
        onClick={listening ? stop : start}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm active:scale-95 transition-transform ${
          done ? 'bg-green-500' : listening ? 'bg-red-500 animate-pulse' : 'bg-gray-800'
        }`}
      >
        {listening ? <Square size={16} fill="white" /> : done ? <CheckCircle2 size={20} /> : <Mic size={18} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          {Array.from({ length: TARGET_REPS }).map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < reps ? 'bg-green-500' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-xs text-gray-400">
          {done
            ? 'Nói tốt rồi! Nhớ lâu hơn vì bạn đã tự nói ra.'
            : listening
              ? 'Đang nghe... nói cụm từ ra nhé'
              : `Bấm mic, nói lại cụm này (${reps}/${TARGET_REPS} lần đúng)`}
        </p>
        {lastHeard && !listening && (
          <p className={`text-xs mt-0.5 ${lastOk ? 'text-green-600' : 'text-amber-600'}`}>
            Bạn nói: &ldquo;{lastHeard}&rdquo;{lastOk ? '' : ' — thử lại nhé'}
          </p>
        )}
      </div>
    </div>
  )
}

// Final "ghép câu" challenge: say one sentence using at least two of the
// lesson's chunks — moves from repeating isolated phrases to actually
// combining them, closer to real spontaneous speech.
function CombineChallenge({ chunks }: { chunks: Chunk[] }) {
  const [supported] = useState(() => getSpeechRecognition() !== null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognitionAlt | null>(null)

  function start() {
    const Recognition = getSpeechRecognition()
    if (!Recognition) return
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    let full = ''
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) full += event.results[i][0].transcript + ' '
      }
      setTranscript(full.trim())
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    full = ''
    setTranscript('')
    recognition.start()
    setListening(true)
  }

  function stop() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  if (!supported || chunks.length < 2) return null

  const usedChunks = chunks.filter((c) => roughlyMatches(transcript, c.phrase))

  return (
    <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles size={14} className="text-indigo-500" />
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">Thử ghép câu</p>
      </div>
      <p className="text-sm text-indigo-900 mb-4">
        Nói một câu của riêng bạn, dùng ít nhất 2 cụm từ vừa học ở trên.
      </p>

      <button
        onClick={listening ? stop : start}
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg active:scale-95 transition-transform ${
          listening ? 'bg-red-500 animate-pulse shadow-red-200' : 'bg-indigo-500 shadow-indigo-200'
        }`}
      >
        {listening ? <Square size={22} fill="white" /> : <Mic size={24} />}
      </button>

      {transcript && !listening && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">&ldquo;{transcript}&rdquo;</p>
          <p className="text-xs font-semibold text-indigo-600 mb-1.5">
            Đã dùng {usedChunks.length}/{chunks.length} cụm từ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chunks.map((c) => (
              <span
                key={c.id}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  usedChunks.includes(c) ? 'bg-green-100 text-green-700' : 'bg-white text-gray-400'
                }`}
              >
                {c.phrase}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ChunksPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    getLesson(slug)
      .then(setLesson)
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => cancelRef.current?.()
  }, [slug])

  // Play the chunk's region of the lesson audio.
  function playChunk(startMs: number, endMs: number) {
    const el = audioRef.current
    if (!el) return
    cancelRef.current?.()
    cancelRef.current = playRegion(el, startMs, endMs)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }
  if (!lesson) return <div className="p-8 text-center text-gray-400">Không tìm thấy bài học.</div>

  const chunks = lesson.chunks || []

  return (
    <div className="px-5 pt-6 pb-8">
      {lesson.audio_url && <audio ref={audioRef} src={assetUrl(lesson.audio_url)} preload="auto" />}

      <button onClick={() => router.push(`/lesson/${slug}`)} className="text-sm text-gray-400 mb-4">← Bài học</button>
      <h1 className="text-xl font-extrabold text-gray-900 mb-1">Chunks & Collocations</h1>
      <p className="text-sm text-gray-400 mb-6">Nghe, rồi tự nói lại ra tiếng — nói càng nhiều lần càng nhớ lâu.</p>

      <div className="space-y-4 mb-4">
        {chunks.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white border border-gray-100 p-5 shadow-sm">
            <button
              onClick={() => playChunk(c.start_ms, c.end_ms)}
              className="flex items-center gap-2.5 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <Volume2 size={17} />
              </span>
              <span className="text-lg font-extrabold text-gray-900">{c.phrase}</span>
            </button>

            {c.meaning_vi && (
              <p className="mt-1.5 pl-[46px] text-sm font-medium text-indigo-600">{c.meaning_vi}</p>
            )}

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

            <RepeatPractice chunk={c} />
          </div>
        ))}
      </div>

      <div className="mb-6">
        <CombineChallenge chunks={chunks} />
      </div>

      <button
        onClick={() => router.push(`/lesson/${slug}/dialogue`)}
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-sm font-bold text-white shadow-md shadow-indigo-200 active:scale-[0.98] transition-transform"
      >
        Tiếp: Hội thoại <ArrowRight size={16} />
      </button>
    </div>
  )
}
