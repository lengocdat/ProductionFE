export type BadgeTier = 1 | 2 | 3
export type BadgeGroup = 'hoat_dong' | 'thuong_gia' | 'bau_so' | 'choi_dep' | 'premium'

export interface BadgeData {
  id: number
  name: string
  description: string
  iconUrl: string
  tier: BadgeTier
  group: BadgeGroup
  groupLabel: string
  currentValue: number
  targetValue: number
  isUnlocked: boolean
  isEquipped: boolean
}

export const MOCK_BADGES: BadgeData[] = [
  // ⚔️ Hoạt Động (Match participation)
  {
    id: 1,
    name: 'Tân Binh Năng Nổ',
    description: 'Tham gia 10+ trận đấu',
    iconUrl: '/badges/warrior-1.svg',
    tier: 1,
    group: 'hoat_dong',
    groupLabel: 'Hoạt động',
    currentValue: 10,
    targetValue: 10,
    isUnlocked: true,
    isEquipped: false,
  },
  {
    id: 2,
    name: 'Chiến Binh Sân Cỏ',
    description: 'Tham gia 50+ trận đấu',
    iconUrl: '/badges/warrior-2.svg',
    tier: 2,
    group: 'hoat_dong',
    groupLabel: 'Hoạt động',
    currentValue: 48,
    targetValue: 50,
    isUnlocked: false,
    isEquipped: false,
  },
  {
    id: 3,
    name: 'Huyền Thoại Thể Thao',
    description: 'Tham gia 100+ trận đấu',
    iconUrl: '/badges/warrior-3.svg',
    tier: 3,
    group: 'hoat_dong',
    groupLabel: 'Hoạt động',
    currentValue: 48,
    targetValue: 100,
    isUnlocked: false,
    isEquipped: false,
  },

  // 🛒 Thương Gia (Marketplace)
  {
    id: 4,
    name: 'Người Bán Tập Sự',
    description: 'Bán thành công 5+ sản phẩm',
    iconUrl: '/badges/seller-1.svg',
    tier: 1,
    group: 'thuong_gia',
    groupLabel: 'Thương gia',
    currentValue: 5,
    targetValue: 5,
    isUnlocked: true,
    isEquipped: false,
  },
  {
    id: 5,
    name: 'Thương Gia Uy Tín',
    description: 'Bán thành công 20+ sản phẩm',
    iconUrl: '/badges/seller-2.svg',
    tier: 2,
    group: 'thuong_gia',
    groupLabel: 'Thương gia',
    currentValue: 20,
    targetValue: 20,
    isUnlocked: true,
    isEquipped: true,
  },
  {
    id: 6,
    name: 'Lão Đại Thương Trường',
    description: 'Bán thành công 50+ sản phẩm',
    iconUrl: '/badges/seller-3.svg',
    tier: 3,
    group: 'thuong_gia',
    groupLabel: 'Thương gia',
    currentValue: 32,
    targetValue: 50,
    isUnlocked: false,
    isEquipped: false,
  },

  // 🏟️ Bầu Sô (Hosting)
  {
    id: 7,
    name: 'Bầu Sô Khởi Nghiệp',
    description: 'Tổ chức thành công 5+ trận',
    iconUrl: '/badges/host-1.svg',
    tier: 1,
    group: 'bau_so',
    groupLabel: 'Bầu sô',
    currentValue: 5,
    targetValue: 5,
    isUnlocked: true,
    isEquipped: false,
  },
  {
    id: 8,
    name: 'Host Chuyên Nghiệp',
    description: 'Tổ chức thành công 20+ trận',
    iconUrl: '/badges/host-2.svg',
    tier: 2,
    group: 'bau_so',
    groupLabel: 'Bầu sô',
    currentValue: 14,
    targetValue: 20,
    isUnlocked: false,
    isEquipped: false,
  },
  {
    id: 9,
    name: 'Ông Trùm Cáp Kèo',
    description: 'Tổ chức thành công 50+ trận',
    iconUrl: '/badges/host-3.svg',
    tier: 3,
    group: 'bau_so',
    groupLabel: 'Bầu sô',
    currentValue: 14,
    targetValue: 50,
    isUnlocked: false,
    isEquipped: false,
  },

  // ⭐ Chơi Đẹp (Ratings)
  {
    id: 10,
    name: 'Gương Mặt Thân Quen',
    description: 'Nhận 20+ đánh giá 5 sao',
    iconUrl: '/badges/star-1.svg',
    tier: 1,
    group: 'choi_dep',
    groupLabel: 'Chơi đẹp',
    currentValue: 20,
    targetValue: 20,
    isUnlocked: true,
    isEquipped: false,
  },
  {
    id: 11,
    name: 'Ngôi Sao Cộng Đồng',
    description: 'Nhận 50+ đánh giá 5 sao',
    iconUrl: '/badges/star-2.svg',
    tier: 2,
    group: 'choi_dep',
    groupLabel: 'Chơi đẹp',
    currentValue: 37,
    targetValue: 50,
    isUnlocked: false,
    isEquipped: false,
  },
  {
    id: 12,
    name: 'Đại Sứ Fair-Play',
    description: 'Nhận 100+ đánh giá 5 sao',
    iconUrl: '/badges/star-3.svg',
    tier: 3,
    group: 'choi_dep',
    groupLabel: 'Chơi đẹp',
    currentValue: 37,
    targetValue: 100,
    isUnlocked: false,
    isEquipped: false,
  },

  // 💎 Premium
  {
    id: 13,
    name: 'Thành Viên Premium',
    description: 'Đặc quyền Radar & Không quảng cáo',
    iconUrl: '/badges/premium.svg',
    tier: 2,
    group: 'premium',
    groupLabel: 'Premium',
    currentValue: 1,
    targetValue: 1,
    isUnlocked: true,
    isEquipped: false,
  },
  {
    id: 14,
    name: 'Nhà Tài Trợ Kim Cương',
    description: 'Gia hạn Premium liên tục > 6 tháng',
    iconUrl: '/badges/premium-gold.svg',
    tier: 3,
    group: 'premium',
    groupLabel: 'Premium',
    currentValue: 3,
    targetValue: 6,
    isUnlocked: false,
    isEquipped: false,
  },
]

export const BADGE_GROUPS = [
  { key: 'all', label: 'Tất cả', icon: '🏆' },
  { key: 'hoat_dong', label: 'Hoạt động', icon: '⚔️' },
  { key: 'thuong_gia', label: 'Thương gia', icon: '🛒' },
  { key: 'bau_so', label: 'Bầu sô', icon: '🏟️' },
  { key: 'choi_dep', label: 'Chơi đẹp', icon: '⭐' },
  { key: 'premium', label: 'Premium', icon: '💎' },
]
