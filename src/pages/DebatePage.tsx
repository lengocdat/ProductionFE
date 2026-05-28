import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Swords, Clock } from 'lucide-react'

interface Topic {
  id: string
  title: string
  category: string
  age_group: string
}

interface DebateRoom {
  id: string
  topic_id: string
  status: string
  message_count: number
  created_at: string
}

export default function DebatePage() {
  const navigate = useNavigate()
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [stance, setStance] = useState<'agree' | 'disagree' | null>(null)
  const [waiting, setWaiting] = useState(false)

  const { data: topics, isLoading } = useQuery({
    queryKey: ['debate-topics'],
    queryFn: async () => {
      const { data } = await api.get('/debate/topics')
      return (data.topics || []) as Topic[]
    },
  })

  // Fetch active rooms
  const { data: myRooms } = useQuery({
    queryKey: ['debate-my-rooms'],
    queryFn: async () => {
      const { data } = await api.get('/debate/my-rooms')
      return (data.rooms || []) as DebateRoom[]
    },
  })

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/debate/join', {
        topic_id: selectedTopic,
        stance,
      })
      return data
    },
    onSuccess: (data) => {
      if (data.status === 'matched') {
        navigate(`/debate/${data.room_id}`)
      } else {
        setWaiting(true)
        // Poll for match
        const interval = setInterval(async () => {
          try {
            const { data: retryData } = await api.post('/debate/join', {
              topic_id: selectedTopic,
              stance,
            })
            if (retryData.status === 'matched') {
              clearInterval(interval)
              navigate(`/debate/${retryData.room_id}`)
            }
          } catch {
            clearInterval(interval)
            setWaiting(false)
          }
        }, 3000)
        // Timeout after 2 minutes
        setTimeout(() => {
          clearInterval(interval)
          setWaiting(false)
        }, 120000)
      }
    },
  })

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải...</div>
  }

  if (waiting) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Clock className="h-12 w-12 animate-pulse text-primary" />
        <h2 className="text-lg font-semibold">Đang tìm đối thủ...</h2>
        <p className="text-sm text-muted-foreground">Chờ tối đa 2 phút</p>
        <button
          onClick={() => setWaiting(false)}
          className="mt-4 rounded-xl border border-border px-6 py-2 text-sm"
        >
          Huỷ
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-6 text-center">
        <Swords className="mx-auto mb-2 h-10 w-10 text-primary" />
        <h1 className="text-xl font-bold">Blind Debate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tranh luận ẩn danh — Tiết lộ danh tính nếu cả hai đồng ý
        </p>
      </div>

      {/* Active Rooms */}
      {myRooms && myRooms.length > 0 && (
        <div className="mb-6 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Cuộc tranh luận đang diễn ra:</h3>
          {myRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => navigate(`/debate/${room.id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
            >
              <div>
                <p className="text-sm font-medium">
                  {room.status === 'revealed' ? '✨ Đã tiết lộ' : '🎭 Ẩn danh'}
                </p>
                <p className="text-xs text-muted-foreground">{room.message_count} tin nhắn</p>
              </div>
              <span className="text-xs text-primary">Tiếp tục →</span>
            </button>
          ))}
        </div>
      )}

      {/* Topics */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Chọn chủ đề hôm nay:</h3>
        {topics?.map((topic) => (
          <button
            key={topic.id}
            onClick={() => setSelectedTopic(topic.id)}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${
              selectedTopic === topic.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <p className="font-medium">{topic.title}</p>
            <div className="mt-1 flex gap-2">
              <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                {topic.category}
              </span>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                {topic.age_group}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Stance selection */}
      {selectedTopic && (
        <div className="mt-6 animate-fade-in">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">Chọn phe:</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setStance('agree')}
              className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                stance === 'agree'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-border hover:border-green-300'
              }`}
            >
              👍 Đồng ý
            </button>
            <button
              onClick={() => setStance('disagree')}
              className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-colors ${
                stance === 'disagree'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-border hover:border-red-300'
              }`}
            >
              👎 Phản đối
            </button>
          </div>
        </div>
      )}

      {/* Join button */}
      {selectedTopic && stance && (
        <button
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          className="mt-6 w-full animate-fade-in rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {joinMutation.isPending ? 'Đang tìm...' : '⚔️ Bắt đầu tranh luận'}
        </button>
      )}
    </div>
  )
}
