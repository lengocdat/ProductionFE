'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mic, Square, Play, Check, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { getLesson, completeLesson, saveSpeakAttempt, type Lesson } from '@/lib/lessons'
import { trackEvent } from '@/lib/analytics'
import DonateCard from '@/components/DonateCard'

type RecState = 'idle' | 'recording' | 'recorded'

// Minimal typing for the Web Speech API (no official TS lib types; prefixed on Safari/older Chrome).
interface SpeechRecognitionAlt {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

function getSpeechRecognition(): (new () => SpeechRecognitionAlt) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionAlt
    webkitSpeechRecognition?: new () => SpeechRecognitionAlt
  }
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export default function SpeakPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  const [recState, setRecState] = useState<RecState>('idle')
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const [donateCount, setDonateCount] = useState<number | null>(null)
  const [liveCaption, setLiveCaption] = useState('')
  const [transcript, setTranscript] = useState('')
  const [durationSec, setDurationSec] = useState(0)
  const [speechSupported, setSpeechSupported] = useState(true)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recognitionRef = useRef<SpeechRecognitionAlt | null>(null)
  const transcriptRef = useRef('')
  const startedAtRef = useRef(0)

  useEffect(() => {
    getLesson(slug)
      .then(setLesson)
      .catch(() => {})
      .finally(() => setLoading(false))
    setSpeechSupported(getSpeechRecognition() !== null)
    return () => {
      if (audioURL) URL.revokeObjectURL(audioURL)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      chunksRef.current = []
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioURL(URL.createObjectURL(blob))
        setDurationSec(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)))
        setTranscript(transcriptRef.current.trim())
        setRecState('recorded')
        stream.getTracks().forEach((t) => t.stop())
      }

      transcriptRef.current = ''
      setLiveCaption('')
      setTranscript('')
      const Recognition = getSpeechRecognition()
      if (Recognition) {
        const recognition = new Recognition()
        recognition.lang = 'en-US'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (event: any) => {
          let interim = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const chunkText = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              transcriptRef.current += chunkText + ' '
            } else {
              interim += chunkText
            }
          }
          setLiveCaption(interim)
        }
        recognition.onerror = () => {}
        recognitionRef.current = recognition
        recognition.start()
      }

      rec.start()
      recorderRef.current = rec
      startedAtRef.current = Date.now()
      setRecState('recording')
    } catch {
      toast.error('Không truy cập được micro. Kiểm tra quyền trình duyệt.')
    }
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    recorderRef.current?.stop()
  }

  function retry() {
    setRecState('idle')
    setAudioURL(null)
    setTranscript('')
    setLiveCaption('')
  }

  const chunks = lesson?.chunks || []
  const chunksUsedList = chunks.filter((c) => transcript.toLowerCase().includes(c.phrase.toLowerCase()))
  const wordCount = transcript ? transcript.split(/\s+/).filter(Boolean).length : 0
  const wpm = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0

  async function finish() {
    setFinishing(true)
    try {
      if (speechSupported) {
        await saveSpeakAttempt(slug, {
          transcript,
          duration_sec: durationSec,
          word_count: wordCount,
          chunks_used: chunksUsedList.length,
        })
        trackEvent('speak_attempt', {
          lesson_slug: slug,
          word_count: wordCount,
          chunks_used: chunksUsedList.length,
          chunks_total: chunks.length,
        })
      }
      const res = await completeLesson(slug)
      trackEvent('lesson_complete', { lesson_slug: slug })
      toast.success('Hoàn thành! Các câu đã được thêm vào lịch ôn tập.')

      if (res.completed_count > 0 && res.completed_count % 5 === 0) {
        trackEvent('donate_prompt_shown', { completed_count: res.completed_count })
        setDonateCount(res.completed_count)
        setFinishing(false)
        return
      }
      router.push('/review')
    } catch {
      toast.error('Có lỗi khi lưu tiến độ.')
      setFinishing(false)
    }
  }

  function closeDonate() {
    setDonateCount(null)
    router.push('/review')
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" />
      </div>
    )
  }
  if (!lesson) return <div className="p-8 text-center text-gray-400">Không tìm thấy bài học.</div>

  const prompt = lesson.speak_prompt || 'Describe what you learned in this lesson.'

  return (
    <div className="px-5 pt-6 pb-8">
      <button onClick={() => router.push(`/lesson/${slug}/dialogue`)} className="text-sm text-gray-400 mb-4">← Hội thoại</button>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Nói 1-2 phút</h1>

      <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-6 mb-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-2">Chủ đề</p>
        <p className="text-lg font-bold text-indigo-900">{prompt}</p>
      </div>

      {!speechSupported && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-6">
          Trình duyệt này chưa hỗ trợ nhận diện giọng nói trực tiếp (dùng Chrome/Edge để có nhận xét từ vựng). Bạn vẫn ghi âm và nghe lại được bình thường.
        </p>
      )}

      {/* Recorder */}
      <div className="flex flex-col items-center">
        {recState !== 'recording' ? (
          <button
            onClick={startRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-200 active:scale-95 transition-transform"
          >
            <Mic size={38} />
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-200 animate-pulse"
          >
            <Square size={32} fill="white" />
          </button>
        )}
        <p className="mt-4 text-sm text-gray-400">
          {recState === 'idle' && 'Chạm để thu âm'}
          {recState === 'recording' && 'Đang thu... chạm để dừng'}
          {recState === 'recorded' && 'Nghe lại bản thu của bạn'}
        </p>

        {recState === 'recording' && speechSupported && liveCaption && (
          <p className="mt-3 text-sm text-gray-500 italic text-center px-4">&ldquo;{liveCaption}&rdquo;</p>
        )}

        {audioURL && (
          <audio controls src={audioURL} className="mt-5 w-full">
            <track kind="captions" />
          </audio>
        )}
      </div>

      {recState === 'recorded' && speechSupported && transcript && (
        <div className="mt-6 rounded-3xl bg-gray-50 border border-gray-100 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Bạn đã nói</p>
          <p className="text-sm text-gray-700 mb-4">&ldquo;{transcript}&rdquo;</p>
          <p className="text-xs text-gray-400 mb-4">
            {wordCount} từ · {durationSec}s · ~{wpm} từ/phút
          </p>

          {chunks.length > 0 && (
            <>
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                Cụm từ đã học ({chunksUsedList.length}/{chunks.length})
              </p>
              <div className="space-y-1.5">
                {chunks.map((c) => {
                  const used = chunksUsedList.includes(c)
                  return (
                    <div key={c.id} className="flex items-center gap-2 text-sm">
                      {used ? (
                        <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-gray-300 shrink-0" />
                      )}
                      <span className={used ? 'text-gray-700 font-medium' : 'text-gray-400'}>{c.phrase}</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {recState === 'recorded' && (
        <div className="mt-8 space-y-3">
          <button
            onClick={retry}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"
          >
            <Play size={16} /> Thu lại
          </button>
          <button
            onClick={finish}
            disabled={finishing}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-sm font-bold text-white shadow-md shadow-green-200 active:scale-[0.98] disabled:opacity-50 transition-transform"
          >
            {finishing ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Hoàn thành bài học</>}
          </button>
        </div>
      )}

      {donateCount !== null && (
        <DonateCard
          variant="modal"
          title={`🎉 Bạn vừa hoàn thành bài học thứ ${donateCount}!`}
          message="App này mình làm một mình và giữ miễn phí hoàn toàn cho mọi người học. Nếu thấy hữu ích, ủng hộ mình một ly cà phê để có động lực làm thêm bài học mới nhé ☕"
          onClose={closeDonate}
        />
      )}
    </div>
  )
}
