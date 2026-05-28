import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/types'
import { Camera, ChevronRight } from 'lucide-react'

const INTERESTS = [
  // Giải trí
  'Đọc sách', 'Phim ảnh', 'Âm nhạc', 'Gaming', 'Anime/Manga', 'K-pop',
  'Podcast', 'Stand-up comedy', 'Board game', 'Karaoke',
  // Thể thao & Sức khoẻ
  'Gym', 'Yoga', 'Chạy bộ', 'Bơi lội', 'Đạp xe', 'Cầu lông',
  'Bóng đá', 'Tennis', 'Hiking', 'Thiền',
  // Sáng tạo
  'Nhiếp ảnh', 'Vẽ tranh', 'Viết lách', 'Thiết kế', 'Làm video',
  'Handmade/DIY', 'Khiêu vũ',
  // Ẩm thực & Lifestyle
  'Nấu ăn', 'Cà phê', 'Trà sữa', 'Ăn vặt', 'Wine/Cocktail',
  'Du lịch', 'Camping', 'Thiên nhiên',
  // Tri thức
  'Công nghệ', 'Startup', 'Tâm lý học', 'Triết học', 'Lịch sử',
  'Khoa học', 'Tài chính', 'Ngoại ngữ',
  // Xã hội
  'Tình nguyện', 'Động vật', 'Môi trường', 'Nghệ thuật',
]

const PERSONALITY_TYPES = [
  { code: 'INTJ', emoji: '🧠', label: 'Chiến lược gia' },
  { code: 'INTP', emoji: '🔬', label: 'Nhà tư duy' },
  { code: 'ENTJ', emoji: '👑', label: 'Người lãnh đạo' },
  { code: 'ENTP', emoji: '💡', label: 'Nhà phát minh' },
  { code: 'INFJ', emoji: '🌙', label: 'Người cố vấn' },
  { code: 'INFP', emoji: '🦋', label: 'Người mơ mộng' },
  { code: 'ENFJ', emoji: '🌟', label: 'Người truyền cảm hứng' },
  { code: 'ENFP', emoji: '🎭', label: 'Người khám phá' },
  { code: 'ISTJ', emoji: '📋', label: 'Người đáng tin cậy' },
  { code: 'ISFJ', emoji: '🛡️', label: 'Người bảo vệ' },
  { code: 'ESTJ', emoji: '⚡', label: 'Người tổ chức' },
  { code: 'ESFJ', emoji: '🤝', label: 'Người quan tâm' },
  { code: 'ISTP', emoji: '🔧', label: 'Thợ thủ công' },
  { code: 'ISFP', emoji: '🎨', label: 'Nghệ sĩ' },
  { code: 'ESTP', emoji: '🏄', label: 'Người hành động' },
  { code: 'ESFP', emoji: '🎉', label: 'Người giải trí' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    gender: '',
    birth_date: '',
    school: '',
    major: '',
    bio: '',
    mbti: '',
    looking_for: 'both',
    interests: [] as string[],
    debate_style: '',
    life_philosophy: '',
  })

  // Load existing profile for editing
  const { data: existingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile')
      return data.profile as Profile
    },
  })

  useEffect(() => {
    if (existingProfile) {
      setForm({
        full_name: existingProfile.full_name || '',
        gender: existingProfile.gender || '',
        birth_date: existingProfile.birth_date || '',
        school: existingProfile.school || '',
        major: existingProfile.major || '',
        bio: existingProfile.bio || '',
        mbti: existingProfile.mbti || '',
        looking_for: existingProfile.looking_for || 'both',
        interests: existingProfile.interests || [],
        debate_style: existingProfile.debate_style || '',
        life_philosophy: existingProfile.life_philosophy || '',
      })
    }
  }, [existingProfile])

  function toggleInterest(interest: string) {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }))
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      await api.put('/profile', {
        ...form,
        // Preserve existing photos and favorites when editing
        avatar_urls: existingProfile?.avatar_urls || [],
        favorite_books: existingProfile?.favorite_books || [],
        favorite_movies: existingProfile?.favorite_movies || [],
      })
      // Refresh user state so has_profile becomes true, then navigate
      await refreshUser()
      // Small delay to ensure React state is committed before navigation
      setTimeout(() => navigate('/discover'), 50)
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi tạo hồ sơ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-secondary px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* Progress */}
        <div className="mb-6 flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-border'}`} />
          ))}
        </div>

        <div className="animate-fade-in rounded-2xl bg-white p-6 shadow-md">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Thông tin cơ bản</h2>
              <div>
                <label className="mb-1 block text-sm font-medium">Họ tên</label>
                <input
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Tên hiển thị"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Giới tính</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: 'Nam' }, { v: 'female', l: 'Nữ' }, { v: 'other', l: 'Khác' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, gender: v })}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${form.gender === v ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ngày sinh</label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Muốn tìm</label>
                <div className="flex gap-2">
                  {[{ v: 'male', l: 'Nam' }, { v: 'female', l: 'Nữ' }, { v: 'both', l: 'Cả hai' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, looking_for: v })}
                      className={`flex-1 rounded-xl border py-2 text-sm font-medium transition-colors ${form.looking_for === v ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Học vấn & Công việc</h2>
              <div>
                <label className="mb-1 block text-sm font-medium">Trường học</label>
                <input
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="VD: ĐH Bách Khoa HCM"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ngành học</label>
                <input
                  value={form.major}
                  onChange={(e) => setForm({ ...form, major: e.target.value })}
                  className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="VD: Khoa học máy tính"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Giới thiệu bản thân</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  rows={3}
                  placeholder="Viết vài dòng về bạn..."
                  maxLength={500}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Sở thích</h2>
              <p className="text-sm text-muted-foreground">Chọn ít nhất 3 sở thích</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      form.interests.includes(interest)
                        ? 'border-primary bg-primary text-white'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">Tính cách</h2>
              <div>
                <label className="mb-1 block text-sm font-medium">MBTI (tuỳ chọn)</label>
                <div className="grid grid-cols-4 gap-2">
                  {MBTI_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm({ ...form, mbti: type })}
                      className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                        form.mbti === type ? 'border-primary bg-primary text-white' : 'border-border'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Phong cách tranh luận</label>
                <div className="flex gap-2">
                  {[{ v: 'logical', l: '🧠 Logic' }, { v: 'emotional', l: '💝 Cảm xúc' }, { v: 'balanced', l: '⚖️ Cân bằng' }].map(({ v, l }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, debate_style: v })}
                      className={`flex-1 rounded-xl border py-2 text-sm transition-colors ${form.debate_style === v ? 'border-primary bg-primary/5 text-primary' : 'border-border'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Triết lý sống</label>
                <textarea
                  value={form.life_philosophy}
                  onChange={(e) => setForm({ ...form, life_philosophy: e.target.value })}
                  className="w-full rounded-xl border border-input px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  rows={2}
                  placeholder="Điều gì quan trọng nhất với bạn?"
                  maxLength={300}
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="rounded-xl border border-border px-4 py-2 text-sm">
                Quay lại
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!form.full_name || !form.gender)}
                className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Tiếp <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Hoàn tất'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
