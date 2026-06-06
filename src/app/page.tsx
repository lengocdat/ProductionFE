import Link from 'next/link'
import ClientAuthRedirect from '@/components/ClientAuthRedirect'
import SportIcon from '@/components/SportIcon'

const SPORTS = [
  'BADMINTON', 'FOOTBALL', 'PICKLEBALL', 'TENNIS',
  'TABLE_TENNIS', 'BASKETBALL', 'VOLLEYBALL', 'RUNNING',
]
const SPORT_LABELS: Record<string, string> = {
  BADMINTON: 'Cầu Lông', FOOTBALL: 'Bóng Đá', PICKLEBALL: 'Pickleball',
  TENNIS: 'Tennis', TABLE_TENNIS: 'Bóng Bàn', BASKETBALL: 'Bóng Rổ',
  VOLLEYBALL: 'Bóng Chuyền', RUNNING: 'Chạy Bộ',
}

const FEATURES = [
  {
    icon: '🎯',
    title: 'Ghép trận thông minh',
    desc: 'Hệ thống tự động tính độ tương thích theo trình độ, khoảng cách và lịch trình của bạn.',
  },
  {
    icon: '💬',
    title: 'Chat trong trận',
    desc: 'Nhắn tin trực tiếp với host và những người chơi cùng trận ngay trên app.',
  },
  {
    icon: '🏆',
    title: 'Thành tựu & Huy hiệu',
    desc: 'Kiếm badge theo từng môn thể thao, leo rank và xây dựng hồ sơ đáng tin cậy.',
  },
  {
    icon: '🛒',
    title: 'Chợ đồ thể thao',
    desc: 'Mua bán vợt, giày, phụ kiện đã qua sử dụng với người chơi đã được xác minh.',
  },
]

const STATS = [
  { value: '8', label: 'Môn thể thao' },
  { value: '500+', label: 'Trận mỗi tháng' },
  { value: '4.8★', label: 'Đánh giá trung bình' },
  { value: '3', label: 'Thành phố' },
]

export default function LandingPage() {
  return (
    <>
      <ClientAuthRedirect />
      <div className="min-h-screen bg-white font-sans">
        {/* Nav */}
        <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="CoDuyen" className="w-8 h-8" />
            <span className="text-lg font-extrabold text-green-700">CoDuyen</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
              Đăng nhập
            </Link>
            <Link href="/register" className="rounded-full bg-green-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-green-600 transition-colors shadow-sm">
              Đăng ký miễn phí
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="px-5 pt-14 pb-12 text-center bg-gradient-to-b from-green-50 to-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs font-semibold mb-5">
            🇻🇳 Dành riêng cho người chơi Việt Nam
          </div>
          <h1 className="text-[2.1rem] leading-tight font-extrabold text-gray-900 mb-4">
            Tìm trận thể thao<br />
            <span className="text-green-600">gần bạn, ngay hôm nay</span>
          </h1>
          <p className="text-base text-gray-500 max-w-xs mx-auto mb-8 leading-relaxed">
            Kết nối với người chơi cùng trình độ. Ghép trận nhanh, chat trực tiếp, đánh giá tin cậy.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link
              href="/register"
              className="rounded-2xl bg-green-500 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 active:scale-[0.98] transition-all"
            >
              Tham gia ngay — Miễn phí
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-green-600 py-5">
          <div className="grid grid-cols-4 divide-x divide-green-500">
            {STATS.map((s) => (
              <div key={s.label} className="text-center px-2">
                <p className="text-lg font-extrabold text-white">{s.value}</p>
                <p className="text-[10px] font-medium text-green-200 leading-tight mt-px">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Sports grid */}
        <section className="px-5 py-10">
          <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-5">8 Môn thể thao</p>
          <div className="grid grid-cols-4 gap-3">
            {SPORTS.map((sport) => (
              <div key={sport} className="flex flex-col items-center gap-1.5 rounded-2xl bg-gray-50 py-4 px-1 hover:bg-green-50 transition-colors">
                <SportIcon sport={sport} size={32} />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{SPORT_LABELS[sport]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="px-5 py-6 bg-gray-50">
          <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-6">Tại sao chọn CoDuyen?</p>
          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <span className="text-2xl shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="px-5 py-10">
          <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-6">Chỉ 3 bước</p>
          <div className="space-y-5">
            {[
              { step: '01', title: 'Tạo hồ sơ', desc: 'Chọn môn thể thao và trình độ của bạn — mất 60 giây.' },
              { step: '02', title: 'Tìm trận gần bạn', desc: 'Lọc theo ngày, giờ, trình độ và khoảng cách. Xem ngay trận phù hợp.' },
              { step: '03', title: 'Tham gia & Đánh giá', desc: 'Xin join, chat với host, ra sân và đánh giá sau trận.' },
            ].map((item) => (
              <div key={item.step} className="flex gap-4 items-start">
                <span className="shrink-0 w-9 h-9 rounded-full bg-green-500 text-white text-sm font-extrabold flex items-center justify-center shadow-sm">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA bottom */}
        <section className="px-5 py-10 bg-gradient-to-b from-white to-green-50 text-center">
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Sẵn sàng ra sân?</h2>
          <p className="text-sm text-gray-500 mb-6">Đăng ký miễn phí, không cần thẻ tín dụng.</p>
          <Link
            href="/register"
            className="inline-block rounded-2xl bg-green-500 px-10 py-4 text-base font-bold text-white shadow-lg shadow-green-200 hover:bg-green-600 active:scale-[0.98] transition-all"
          >
            Tham gia CoDuyen
          </Link>
        </section>

        {/* Footer */}
        <footer className="px-5 py-6 bg-gray-900 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/favicon.svg" alt="CoDuyen" className="w-6 h-6" />
            <span className="text-sm font-bold text-white">CoDuyen</span>
          </div>
          <p className="text-[11px] text-gray-500">© 2025 CoDuyen. Nền tảng tìm trận thể thao Việt Nam.</p>
          <div className="flex justify-center gap-4 mt-3">
            <Link href="/register" className="text-[11px] text-gray-400 hover:text-white">Đăng ký</Link>
            <Link href="/login" className="text-[11px] text-gray-400 hover:text-white">Đăng nhập</Link>
          </div>
        </footer>
      </div>
    </>
  )
}
