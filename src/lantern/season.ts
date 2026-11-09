// Season of the Thả Thiên Đăng page, picked by the Vietnam calendar date (UTC+7).
// Noel: 1 Nov – 26 Dec, counting down to Christmas. Tết: 27 Dec – 20 Feb, counting down to
// giao thừa. Otherwise a plain starry night. `?mua=noel|tet|den` forces one (previews, tests).

export type SeasonId = 'noel' | 'tet' | 'den';

export interface Season {
  id: SeasonId;
  eyebrow: string;
  title: string;
  sky: string;
  /** Countdown target (ms since epoch) and what it counts to; null when nothing is near. */
  target: number | null;
  targetLabel: string;
  /** Shown once the target has passed. */
  arrived: string;
  wishIdeas: readonly string[];
  fortunes: readonly Fortune[];
}

export interface Fortune {
  rank: string;
  text: string;
}

const VN_OFFSET_MS = 7 * 3600 * 1000;

/** Mùng 1 Tết by Gregorian year, with the year's can chi. */
const TET: Readonly<Record<number, readonly [string, string]>> = {
  2027: ['2027-02-06', 'Đinh Mùi'],
  2028: ['2028-01-26', 'Mậu Thân'],
  2029: ['2029-02-13', 'Kỷ Dậu'],
  2030: ['2030-02-03', 'Canh Tuất'],
};

/** Midnight at the start of `iso` (YYYY-MM-DD) in Vietnam, as epoch ms. */
function vnMidnight(iso: string): number {
  return Date.parse(`${iso}T00:00:00+07:00`);
}

const NOEL_FORTUNES: readonly Fortune[] = [
  { rank: 'Đại Cát', text: 'Ông già Noel thực chất là một vị Hóa Thần lão tổ. Đêm nay ngài ghé động phủ ngươi.' },
  { rank: 'Trung Cát', text: 'Tuần lộc kéo xe vừa đột phá Trúc Cơ, quà của ngươi tới sớm ba ngày.' },
  { rank: 'Tiểu Cát', text: 'Chiếc tất treo đầu giường sẽ có… một viên linh thạch hạ phẩm. Còn hơn không.' },
  { rank: 'Cát', text: 'Tuyết rơi là linh khí kết tinh. Ra đứng hứng: tu vi +1, cảm lạnh +1.' },
  { rank: 'Đại Cát', text: 'Người ngươi thầm thương đang ngồi cách ngươi ba bồ đoàn. Mạnh dạn chúc Giáng Sinh đi.' },
  { rank: 'Bình', text: 'Cây thông nhà ngươi là linh mộc ngàn năm. Đừng quấn đèn nháy nữa, nó chói mắt.' },
  { rank: 'Cát', text: 'Đêm 24 ăn gà rán chính là luyện Phượng Hoàng Niết Bàn Quyết tầng thứ nhất.' },
  { rank: 'Tiểu Cát', text: 'Ví mỏng như giấy dó, nhưng đạo tâm dày như tường thành. Vẫn vui.' },
  { rank: 'Trung Cát', text: 'Một tin nhắn "Merry Christmas" đến muộn sẽ đổi vận cả mùa đông của ngươi.' },
  { rank: 'Đại Cát', text: 'Quà năm nay không phải đồ, mà là một người. Giữ điện thoại sạc đầy.' },
];

const TET_FORTUNES: readonly Fortune[] = [
  { rank: 'Đại Cát', text: 'Năm mới lì xì dày như bí kíp thất truyền, mở mãi không hết trang.' },
  { rank: 'Cát', text: 'Họ hàng hỏi "bao giờ lấy vợ/chồng", ngươi đáp "khi nào Kết Đan". Thoát nạn.' },
  { rank: 'Đại Cát', text: 'Bánh chưng nhà ngươi luộc bằng Tam Muội Chân Hỏa, dẻo tới tận rằm tháng Giêng.' },
  { rank: 'Trung Cát', text: 'Hái lộc đầu năm trúng cành đào ngàn năm tuổi. Tài vận +36.' },
  { rank: 'Tiểu Cát', text: 'Mứt dừa ăn nhiều, tu vi không tăng nhưng cân nặng tăng. Dù sao cũng là tăng.' },
  { rank: 'Cát', text: 'Người xông đất nhà ngươi năm nay là một vị Nguyên Anh lão quái. Cứ cười là được.' },
  { rank: 'Bình', text: 'Đốt pháo là phạm luật, đốt tu vi thì không. Ngồi thiền đón giao thừa cho chắc.' },
  { rank: 'Đại Cát', text: 'Sếp thưởng Tết gấp đôi. (Quẻ này không bảo hành, chỉ bảo hộ tinh thần.)' },
  { rank: 'Trung Cát', text: 'Năm nay ngươi tìm được đạo lữ. Có thể là người, có thể là con mèo. Đều tốt.' },
  { rank: 'Cát', text: 'Ra Giêng thi đâu đỗ đó, deadline nào cũng kịp, kèo nào cũng thắng.' },
];

const DEN_FORTUNES: readonly Fortune[] = [
  { rank: 'Cát', text: 'Đèn bay càng cao, điều ước càng gần. Đèn của ngươi bay hơi chậm, chịu khó đợi.' },
  { rank: 'Đại Cát', text: 'Thiên Đạo vừa đọc lời ước của ngươi và gật gù. Hiếm lắm đấy.' },
  { rank: 'Trung Cát', text: 'Trong ba mươi sáu ngày tới, một cơ duyên nhỏ sẽ gõ cửa. Nhớ mở cửa.' },
  { rank: 'Tiểu Cát', text: 'Ước thì được, nhưng nhớ ngủ sớm. Tu tiên mà thức khuya là tẩu hỏa đó.' },
  { rank: 'Bình', text: 'Gió đang ngược, đèn bay chậm. Không sao, chậm mà chắc như rùa thần.' },
];

const WISH_IDEAS_NOEL = ['Giáng Sinh có người nắm tay', 'Cả nhà bình an, ấm áp', 'Cuối năm được thưởng to', 'Crush rep tin nhắn', 'Thi cuối kỳ qua hết môn'] as const;
const WISH_IDEAS_TET = ['Năm mới đột phá bản thân', 'Ba mẹ khỏe mạnh sống lâu', 'Lì xì dày cộp', 'Năm nay thoát ế', 'Làm ăn phát đạt'] as const;
const WISH_IDEAS_DEN = ['Mọi người bình an', 'Sớm tìm được đạo lữ', 'Công việc suôn sẻ', 'Đỗ nguyện vọng 1'] as const;

/** Vietnam calendar parts of an instant. */
function vnParts(now: number): { y: number; m: number; d: number } {
  const t = new Date(now + VN_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

function noel(y: number): Season {
  return {
    id: 'noel', eyebrow: 'Mùa Giáng Sinh · Tuyết Sơn', title: 'Thả Thiên Đăng', sky: '/ui/sky-noel.jpg',
    target: vnMidnight(`${y}-12-25`), targetLabel: 'tới Giáng Sinh', arrived: 'Giáng Sinh an lành, đạo hữu!',
    wishIdeas: WISH_IDEAS_NOEL, fortunes: NOEL_FORTUNES,
  };
}

function tet(tetYear: number): Season {
  const entry = TET[tetYear];
  const canChi = entry?.[1] ?? '';
  return {
    id: 'tet', eyebrow: canChi ? `Xuân ${canChi} · Đào Hoa Khê` : 'Mùa Xuân · Đào Hoa Khê', title: 'Thả Thiên Đăng', sky: '/ui/sky-tet.jpg',
    target: entry ? vnMidnight(entry[0]) : null, targetLabel: 'tới giao thừa', arrived: canChi ? `Chúc mừng năm mới ${canChi}!` : 'Chúc mừng năm mới!',
    wishIdeas: WISH_IDEAS_TET, fortunes: TET_FORTUNES,
  };
}

function den(): Season {
  return {
    id: 'den', eyebrow: 'Tinh Hà · Đêm Thiên Đăng', title: 'Thả Thiên Đăng', sky: '/ui/sky-den.jpg',
    target: null, targetLabel: '', arrived: '', wishIdeas: WISH_IDEAS_DEN, fortunes: DEN_FORTUNES,
  };
}

export function seasonAt(now: number, force?: string | null): Season {
  const { y, m, d } = vnParts(now);
  // From March on, the next Tết is next year's.
  const tetYear = m >= 3 ? y + 1 : y;
  if (force === 'noel') return noel(m === 12 && d > 25 ? y + 1 : y);
  if (force === 'tet') return tet(tetYear);
  if (force === 'den') return den();
  if (m === 11 || (m === 12 && d <= 26)) return noel(y);
  if (m === 12 || m === 1 || (m === 2 && d <= 20)) return tet(tetYear);
  return den();
}

/** "12 ngày 03:04:05" until `target`, or null once it has passed. */
export function countdown(target: number, now: number): string | null {
  const left = Math.floor((target - now) / 1000);
  if (left <= 0) return null;
  const days = Math.floor(left / 86400);
  const hh = String(Math.floor((left % 86400) / 3600)).padStart(2, '0');
  const mm = String(Math.floor((left % 3600) / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return `${days > 0 ? `${days} ngày ` : ''}${hh}:${mm}:${ss}`;
}

export function pickFortune(season: Season): Fortune {
  return season.fortunes[Math.floor(Math.random() * season.fortunes.length)] as Fortune;
}
