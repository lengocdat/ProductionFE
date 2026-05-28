export interface User {
  id: string
  email: string
  verified_status: 'pending' | 'verified_student' | 'verified_degree'
  is_premium: boolean
  coin_balance: number
  has_profile: boolean
}

export interface Profile {
  user_id: string
  full_name: string
  gender: 'male' | 'female' | 'other'
  birth_date?: string
  school: string
  major: string
  bio: string
  mbti: string
  looking_for: 'male' | 'female' | 'both'
  interests: string[]
  avatar_urls: string[]
  favorite_books: string[]
  favorite_movies: string[]
  debate_style: string
  life_philosophy: string
  latitude?: number
  longitude?: number
}

export interface Match {
  id: string
  user_a_id: string
  user_b_id: string
  matched_at: string
  is_active: boolean
}

export interface MatchWithProfile {
  match: Match
  other_user: Profile
  last_message?: Message
}

export interface Message {
  id: string
  match_id: string
  sender_id: string
  content: string
  read_at?: string
  created_at: string
}

export interface SwipeResponse {
  swiped: boolean
  is_match: boolean
  match_id: string
}
