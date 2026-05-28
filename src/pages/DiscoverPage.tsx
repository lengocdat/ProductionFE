import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Profile, SwipeResponse } from '@/types'
import { Heart, X, Star, MapPin, GraduationCap, Sparkles } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

export default function DiscoverPage() {
  const queryClient = useQueryClient()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipeAnim, setSwipeAnim] = useState<'left' | 'right' | null>(null)
  const [matchPopup, setMatchPopup] = useState<Profile | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['discover'],
    queryFn: async () => {
      const { data } = await api.get('/discover?limit=10')
      return (data.profiles || []) as Profile[]
    },
  })

  const swipeMutation = useMutation({
    mutationFn: async ({ targetId, action }: { targetId: string; action: string }) => {
      const { data } = await api.post('/swipe', { target_id: targetId, action_type: action })
      return data as SwipeResponse
    },
    onSuccess: (result) => {
      if (result.is_match && data && data[currentIndex]) {
        setMatchPopup(data[currentIndex])
      }
    },
  })

  const profiles = data || []
  const currentProfile = profiles[currentIndex]

  function handleSwipe(action: 'like' | 'dislike' | 'super_like') {
    if (!currentProfile) return

    setSwipeAnim(action === 'dislike' ? 'left' : 'right')
    swipeMutation.mutate({ targetId: currentProfile.user_id, action })

    setTimeout(() => {
      setSwipeAnim(null)
      if (currentIndex < profiles.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Refetch when cards run out
        queryClient.invalidateQueries({ queryKey: ['discover'] })
        setCurrentIndex(0)
      }
    }, 400)
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Sparkles className="h-8 w-8 animate-pulse text-primary" />
      </div>
    )
  }

  if (!currentProfile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Hết hồ sơ rồi!</h2>
        <p className="text-sm text-muted-foreground">Quay lại sau để xem thêm Cơ Duyên mới nhé</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-4 py-4">
      {/* Match Popup */}
      {matchPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="animate-slide-up rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-romantic animate-pulse-glow">
              <Heart className="h-10 w-10 text-white animate-heart-beat" fill="white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">It's a Match!</h2>
            <p className="mt-2 text-muted-foreground">Bạn và {matchPopup.full_name} đã thích nhau 💕</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setMatchPopup(null)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-card transition-colors"
              >
                Tiếp tục
              </button>
              <button
                onClick={() => { setMatchPopup(null); window.location.href = '/matches' }}
                className="flex-1 rounded-xl bg-gradient-romantic py-2.5 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all"
              >
                Nhắn tin ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div
        className={cn(
          'relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-lg transition-transform',
          swipeAnim === 'right' && 'animate-swipe-right',
          swipeAnim === 'left' && 'animate-swipe-left'
        )}
      >
        {/* Photo */}
        <div className="relative h-96 bg-card">
          {currentProfile.avatar_urls?.length > 0 ? (
            <img
              src={currentProfile.avatar_urls[0]}
              alt={currentProfile.full_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-primary/10">
              <span className="text-5xl font-bold text-primary/40">
                {getInitials(currentProfile.full_name)}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 text-white">
            <h2 className="text-xl font-bold">{currentProfile.full_name}</h2>
            {currentProfile.school && (
              <p className="flex items-center gap-1 text-sm opacity-90">
                <GraduationCap size={14} /> {currentProfile.school}
              </p>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          {currentProfile.bio && (
            <p className="mb-3 text-sm text-muted-foreground">{currentProfile.bio}</p>
          )}
          {currentProfile.interests?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentProfile.interests.slice(0, 5).map((interest) => (
                <span key={interest} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  {interest}
                </span>
              ))}
            </div>
          )}
          {currentProfile.mbti && (
            <span className="mt-2 inline-block rounded-full bg-card px-2.5 py-1 text-xs font-medium">
              {currentProfile.mbti}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={() => handleSwipe('dislike')}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-white shadow-md transition-all hover:scale-110 hover:border-red-300 hover:shadow-lg active:scale-95"
        >
          <X className="h-6 w-6 text-muted-foreground" />
        </button>
        <button
          onClick={() => handleSwipe('super_like')}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-95"
        >
          <Star className="h-5 w-5 text-white" fill="white" />
        </button>
        <button
          onClick={() => handleSwipe('like')}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-romantic shadow-md transition-all hover:scale-110 hover:shadow-lg active:scale-95 animate-pulse-glow"
        >
          <Heart className="h-6 w-6 text-white" fill="white" />
        </button>
      </div>
    </div>
  )
}
