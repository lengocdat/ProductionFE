import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import type { MatchWithProfile } from '@/types'
import { Heart, MessageCircle } from 'lucide-react'
import { getInitials, formatTime } from '@/lib/utils'

export default function MatchesPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const { data } = await api.get('/matches')
      return (data.matches || []) as MatchWithProfile[]
    },
  })

  const matches = data || []

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Heart className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">Matches</h1>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Heart className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Chưa có match nào</p>
          <p className="text-sm text-muted-foreground">Tiếp tục khám phá để tìm Cơ Duyên!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((item) => (
            <button
              key={item.match.id}
              onClick={() => navigate(`/chat/${item.match.id}`)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm transition-colors hover:bg-card"
            >
              {/* Avatar */}
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-primary/10">
                {item.other_user.avatar_urls?.length > 0 ? (
                  <img
                    src={item.other_user.avatar_urls[0]}
                    alt={item.other_user.full_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary/50">
                    {getInitials(item.other_user.full_name)}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{item.other_user.full_name}</h3>
                  {item.last_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(item.last_message.created_at)}
                    </span>
                  )}
                </div>
                {item.last_message ? (
                  <p className="truncate text-sm text-muted-foreground">{item.last_message.content}</p>
                ) : (
                  <p className="text-sm text-primary">Gửi lời chào đầu tiên! 👋</p>
                )}
              </div>

              <MessageCircle size={18} className="flex-shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
