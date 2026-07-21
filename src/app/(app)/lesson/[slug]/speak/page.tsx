'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Mic, Square, Play, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getLesson, completeLesson, type Lesson } from '@/lib/lessons'

type RecState = 'idle' | 'recording' | 'recorded'

export default function SpeakPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)

  const [recState, setRecState] = useState<RecState>('idle')
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    getLesson(slug)
      .then(setLesson)
      .catch(() => {})
      .finally(() => setLoading(false))
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
        setRecState('recorded')
        stream.getTracks().forEach((t) => t.stop())
      }
      rec.start()
      recorderRef.current = rec
      setRecState('recording')
    } catch {
      toast.error('Không truy cập được micro. Kiểm tra quyền trình duyệt.')
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  async function finish() {
    setFinishing(true)
    try {
      await completeLesson(slug)
      toast.success('Hoàn thành! Các câu đã được thêm vào lịch ôn tập.')
      router.push('/review')
    } catch {
      toast.error('Có lỗi khi lưu tiến độ.')
      setFinishing(false)
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

  const prompt = lesson.speak_prompt || 'Describe what you learned in this lesson.'

  return (
    <div className="px-5 pt-6 pb-8">
      <button onClick={() => router.push(`/lesson/${slug}/dialogue`)} className="text-sm text-gray-400 mb-4">← Hội thoại</button>
      <h1 className="text-xl font-extrabold text-gray-900 mb-6">Nói 1-2 phút</h1>

      <div className="rounded-3xl bg-indigo-50 border border-indigo-100 p-6 mb-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-2">Chủ đề</p>
        <p className="text-lg font-bold text-indigo-900">{prompt}</p>
      </div>

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

        {audioURL && (
          <audio controls src={audioURL} className="mt-5 w-full">
            <track kind="captions" />
          </audio>
        )}
      </div>

      {recState === 'recorded' && (
        <div className="mt-8 space-y-3">
          <button
            onClick={() => { setRecState('idle'); setAudioURL(null) }}
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
    </div>
  )
}
