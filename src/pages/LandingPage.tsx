import { Link } from 'react-router-dom'
import { Heart, Users, Brain, Shield, MessageCircle, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Hero */}
      <header className="px-4 py-6">
        <nav className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-romantic">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">CơDuyên</span>
          </div>
          <div className="flex gap-3">
            <Link to="/login" className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-white transition-colors">
              Đăng nhập
            </Link>
            <Link to="/register" className="rounded-xl bg-gradient-romantic px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg transition-all">
              Đăng ký
            </Link>
          </div>
        </nav>
      </header>

      <main className="px-4">
        {/* Hero Section */}
        <section className="mx-auto max-w-4xl py-16 text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Hẹn hò tri thức
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">dành cho sinh viên</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Kết nối sâu qua sở thích, tính cách và tranh luận trí tuệ. Không chỉ là ngoại hình — mà là tâm hồn đồng điệu.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/register" className="rounded-xl bg-gradient-romantic px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Bắt đầu miễn phí
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Miễn phí hoàn toàn · Xác minh sinh viên · An toàn</p>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-4xl py-12">
          <h2 className="text-center text-2xl font-bold mb-10">Tại sao chọn CơDuyên?</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Brain className="h-6 w-6" />}
              title="Thuật toán Cơ Duyên"
              desc="Ghép đôi dựa trên sở thích, MBTI, phong cách tranh luận — không chỉ ngoại hình."
            />
            <Feature
              icon={<Shield className="h-6 w-6" />}
              title="Xác minh sinh viên"
              desc="Chỉ sinh viên thật mới được xác minh. Email .edu.vn hoặc LinkedIn verification."
            />
            <Feature
              icon={<MessageCircle className="h-6 w-6" />}
              title="Blind Debate"
              desc="Tranh luận ẩn danh trước, tiết lộ danh tính sau. Kết nối qua trí tuệ, không bias."
            />
            <Feature
              icon={<Users className="h-6 w-6" />}
              title="Cộng đồng tri thức"
              desc="Dành riêng cho sinh viên và người có học thức. Chất lượng hơn số lượng."
            />
            <Feature
              icon={<Sparkles className="h-6 w-6" />}
              title="Ice-breaker thông minh"
              desc="AI gợi ý câu mở đầu dựa trên sở thích chung. Không bao giờ hết chuyện."
            />
            <Feature
              icon={<Heart className="h-6 w-6" />}
              title="Kết nối sâu"
              desc="5 Cơ Duyên mỗi ngày — chọn lọc kỹ, trân trọng từng kết nối."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-4xl py-12">
          <h2 className="text-center text-2xl font-bold mb-10">Cách hoạt động</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <Step num="1" title="Tạo hồ sơ" desc="Điền sở thích, MBTI, triết lý sống. Càng chi tiết càng được ghép đôi chính xác." />
            <Step num="2" title="Khám phá" desc="Xem gợi ý mỗi ngày. Swipe phải nếu thích, trái nếu chưa hợp." />
            <Step num="3" title="Kết nối" desc="Match rồi? Chat ngay hoặc thử Blind Debate để hiểu nhau sâu hơn." />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl py-16 text-center">
          <h2 className="text-2xl font-bold">Sẵn sàng tìm Cơ Duyên?</h2>
          <p className="mt-2 text-muted-foreground">Đăng ký ngay — hoàn toàn miễn phí.</p>
          <Link to="/register" className="mt-6 inline-block rounded-xl bg-gradient-romantic px-8 py-3.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
            Đăng ký ngay
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white px-4 py-8">
        <div className="mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          <p>© 2026 CơDuyên. Hẹn hò tri thức dành cho sinh viên Việt Nam.</p>
          <p className="mt-1">Liên hệ: contact@coduyen.net</p>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold">
        {num}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
