import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowLeft, Send, Eye } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

interface DebateMessage {
  id: string
  room_id: string
  sender_id: string
  content: string
  created_at: string
}

interface DebateRoom {
  id: string
  topic_id: string
  user_a_id: string
  user_b_id: string
  user_a_stance: string
  user_b_stance: string
  status: string
  user_a_reveal: boolean
  user_b_reveal: boolean
  message_count: number
  expires_at: string
}

export default function DebateRoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data, refetch } = useQuery({
    queryKey: ['debate-room', roomId],
    queryFn: async () => {
      const { data } = await api.get(`/debate/room/${roomId}`)
      return data as { room: DebateRoom; messages: DebateMessage[]; can_reveal: boolean; other_profile?: any }
    },
    refetchInterval: 3000, // Poll every 3s for new messages
    enabled: !!roomId,
  })

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.post(`/debate/room/${roomId}/message`, { content })
      return data
    },
    onSuccess: () => refetch(),
  })

  const revealMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/debate/reveal/${roomId}`)
      return data
    },
    onSuccess: () => refetch(),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages])

  const room = data?.room
  const messages = data?.messages || []
  const canReveal = data?.can_reveal || false

  // Determine my alias
  const isUserA = room?.user_a_id === user?.id
  const myStance = isUserA ? room?.user_a_stance : room?.user_b_stance

  function getAlias(senderId: string): string {
    if (room?.status === 'revealed' && data?.other_profile) {
      if (senderId === user?.id) return 'Bạn'
      return data.other_profile.full_name
    }
    if (senderId === room?.user_a_id) return 'Người 1'
    return 'Người 2'
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    sendMutation.mutate(input.trim())
    setInput('')
  }

  if (!room) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Đang tải...</div>
  }

  const isExpired = room.status === 'expired' || room.status === 'ended'

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/debate')} className="text-muted-foreground">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Blind Debate</h2>
            <p className="text-xs text-muted-foreground">
              {room.status === 'revealed' ? '✨ Đã tiết lộ' : `Ẩn danh • ${room.message_count}/20 tin`}
            </p>
          </div>
          {canReveal && room.status === 'active' && (
            <button
              onClick={() => revealMutation.mutate()}
              disabled={revealMutation.isPending}
              className="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent"
            >
              <Eye size={14} /> Tiết lộ
            </button>
          )}
        </div>
        {/* Stance indicator */}
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className={`rounded-full px-2 py-0.5 ${myStance === 'agree' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Bạn: {myStance === 'agree' ? 'Đồng ý' : 'Phản đối'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-md space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div className="max-w-[75%]">
                  <p className={cn('mb-0.5 text-[10px]', isMine ? 'text-right' : 'text-left', 'text-muted-foreground')}>
                    {getAlias(msg.sender_id)}
                  </p>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm',
                      isMine
                        ? 'rounded-br-md bg-primary text-white'
                        : 'rounded-bl-md bg-card text-foreground'
                    )}
                  >
                    <p>{msg.content}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Reveal prompt */}
          {canReveal && room.status === 'active' && (
            <div className="text-center">
              <div className="inline-block rounded-xl bg-accent/10 px-4 py-2 text-xs text-accent">
                🎭 Đã đủ điều kiện tiết lộ danh tính!
              </div>
            </div>
          )}

          {/* Revealed info */}
          {room.status === 'revealed' && data?.other_profile && (
            <div className="text-center">
              <div className="inline-block rounded-xl bg-green-50 px-4 py-3">
                <p className="text-sm font-medium text-green-700">✨ Cả hai đã tiết lộ!</p>
                <p className="mt-1 text-xs text-green-600">
                  Đối phương: {data.other_profile.full_name}
                  {data.other_profile.school && ` • ${data.other_profile.school}`}
                </p>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="text-center">
              <div className="inline-block rounded-xl bg-card px-4 py-2 text-xs text-muted-foreground">
                Cuộc tranh luận đã kết thúc
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {!isExpired && (
        <form onSubmit={handleSend} className="border-t border-border bg-white px-4 py-3">
          <div className="mx-auto flex max-w-md gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Nhập tin nhắn..."
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!input.trim() || sendMutation.isPending}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
