import Link from 'next/link'
import ClientAuthRedirect from '@/components/ClientAuthRedirect'

const STEPS = [
  { icon: '🎧', title: 'Listen', desc: 'Nghe audio 1-2 phút, tốc độ người bản xứ. Chưa có chữ — chỉ tập trung nghe.' },
  { icon: '🎙', title: 'Shadow', desc: 'Nhại lại từng câu ngay sau khi nghe. Bắt chước ngữ điệu, không phân tích.' },
  { icon: '🧩', title: 'Chunk', desc: 'Học các cụm từ (collocations) rút ra từ chính audio: build a feature, ship a feature...' },
  { icon: '🗣', title: 'Speak', desc: 'Nói 1-2 phút theo chủ đề. Thu âm và tự nghe lại.' },
  { icon: '🔁', title: 'Review', desc: 'Ôn lại bằng audio theo lịch SRS — không phải quiz ABCD.' },
]

export default function LandingPage() {
  return (
    <>
      <ClientAuthRedirect />
      <div className="min-h-screen bg-white font-sans">
        <nav className="sticky top-0 z-40 flex items-center justify-between px-5 py-4 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎧</span>
            <span className="text-lg font-extrabold text-indigo-700">Chunk English</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
              Đăng nhập
            </Link>
            <Link href="/register" className="rounded-full bg-indigo-500 px-4 py-1.5 text-sm font-bold text-white hover:bg-indigo-600 transition-colors shadow-sm">
              Bắt đầu
            </Link>
          </div>
        </nav>

        <section className="px-5 pt-14 pb-12 text-center bg-gradient-to-b from-indigo-50 to-white">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-semibold mb-5">
            Input → Shadow → Chunk → Speak
          </div>
          <h1 className="text-[2.1rem] leading-tight font-extrabold text-gray-900 mb-4">
            Học nói tiếng Anh<br />
            <span className="text-indigo-600">như trẻ em học nói</span>
          </h1>
          <p className="text-base text-gray-500 max-w-xs mx-auto mb-8 leading-relaxed">
            Nghe trước, nhại trước, rồi mới phân tích. Dành cho Developer và Product Owner muốn giao tiếp tự nhiên.
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <Link
              href="/register"
              className="rounded-2xl bg-indigo-500 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600 active:scale-[0.98] transition-all"
            >
              Bắt đầu miễn phí
            </Link>
            <Link
              href="/login"
              className="rounded-2xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Đã có tài khoản? Đăng nhập
            </Link>
          </div>
        </section>

        <section className="px-5 py-10">
          <p className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-6">
            5 bước mỗi bài học
          </p>
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <span className="text-2xl shrink-0 mt-0.5">{s.icon}</span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{i + 1}. {s.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-10 bg-gradient-to-b from-white to-indigo-50 text-center">
          <h2 className="text-xl font-extrabold text-gray-900 mb-2">Mở lên là học luôn</h2>
          <p className="text-sm text-gray-500 mb-6">Không menu phức tạp, không game hóa. Chỉ nghe, nhại và nói.</p>
          <Link
            href="/register"
            className="inline-block rounded-2xl bg-indigo-500 px-10 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600 active:scale-[0.98] transition-all"
          >
            Tham gia Chunk English
          </Link>
        </section>

        <footer className="px-5 py-6 bg-gray-900 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xl">🎧</span>
            <span className="text-sm font-bold text-white">Chunk English</span>
          </div>
          <p className="text-[11px] text-gray-500">© 2026 Chunk English. Học tiếng Anh theo phương pháp shadowing.</p>
        </footer>
      </div>
    </>
  )
}
