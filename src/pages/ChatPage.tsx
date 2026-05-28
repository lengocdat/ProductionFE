import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { wsClient } from '@/lib/ws'
import { useAuth } from '@/contexts/AuthContext'
import type { Message } from '@/types'
import { ArrowLeft, Send } from 'lucide-react'
import { cn, formatTime } from '@/lib/utils'

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // If matchId is "list", redirect to matches page
  if (matchId === 'list') {
    navigate('/matches', { replace: true })
    return null
  }

  // Fetch initial messages
  const { data } = useQuery({
    queryKey: ['messages', matchId],
    queryFn: async () => {
      const { data } = await api.get(`/messages/${matchId}?limit=50`)
      return (data.messages || []) as Message[]
    },
    enabled: !!matchId && matchId !== 'list',
  })

  useEffect(() => {
    if (data) {
      setMessages([...data].reverse())
    }
  }, [data])

  // Listen for real-time messages
  useEffect(() => {
    function handleNewMessage(msg: Message) {
      if (msg.match_id === matchId) {
        setMessages((prev) => {
          // Skip if this is our own message (already added optimistically)
          if (msg.sender_id === user?.id) {
            // Replace optimistic message with real one (has real ID)
            const withoutOptimistic = prev.filter(
              (m) => !(m.id.startsWith('temp-') && m.content === msg.content)
            )
            return [...withoutOptimistic, msg]
          }
          return [...prev, msg]
        })
        // Mark as read
        wsClient.send('read', { match_id: matchId })
      }
    }

    wsClient.on('new_message', handleNewMessage)
    return () => { wsClient.off('new_message', handleNewMessage) }
  }, [matchId, user?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !matchId) return

    const content = input.trim()
    setInput('')

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      match_id: matchId,
      sender_id: user!.id,
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])

    // Send via WebSocket
    wsClient.send('message', { match_id: matchId, content })

    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button onClick={() => navigate('/matches')} className="text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-semibold">Chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto max-w-md space-y-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id
            return (
              <div key={msg.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                    isMine
                      ? 'rounded-br-md bg-primary text-white'
                      : 'rounded-bl-md bg-card text-foreground'
                  )}
                >
                  <p>{msg.content}</p>
                  <p className={cn('mt-1 text-[10px]', isMine ? 'text-white/60' : 'text-muted-foreground')}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-border bg-white px-4 py-3">
        <div className="mx-auto flex max-w-md gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 rounded-full border border-input bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Nhập tin nhắn..."
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
