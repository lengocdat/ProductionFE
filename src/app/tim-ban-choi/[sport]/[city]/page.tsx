import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Clock, Users, UserPlus } from 'lucide-react'
import {
  SPORT_MAP, CITY_MAP, SPORT_CONTENT, CITY_CONTENT,
  fetchPublicMatches, buildFaqJsonLd, type SeoMatch,
} from '@/lib/seo-sports'

const PARTNER_CONTENT: Record<string, string> = {
  'cau-long': 'Bạn cần một người đánh cầu lông thường xuyên — không phải chỉ một trận rồi thôi. Đối tác cố định giúp bạn tiến bộ nhanh hơn, giữ thói quen tập luyện, và tạo nên những buổi sáng sớm đáng nhớ.',
  'bong-da': 'Một nhóm đá bóng thường xuyên là điều nhiều người tìm kiếm nhưng khó tìm. Khi đã có nhóm phù hợp trình độ và lịch sinh hoạt, bạn sẽ không bao giờ bỏ lỡ một buổi tập nào.',
  'tennis': 'Tennis đòi hỏi đối thủ cùng trình độ — đánh với người quá mạnh hoặc quá yếu đều không vui. CoDuyen giúp bạn tìm đúng người, đúng sân, đúng khung giờ.',
  'pickleball': 'Pickleball thường chơi đôi nên cần ít nhất 3 người khác. CoDuyen kết nối bạn với cộng đồng pickleball địa phương — từ người mới bắt đầu đến tay chơi có kinh nghiệm.',
  'bong-ro': 'Sân bóng rổ ngoài trời luôn thiếu người. CoDuyen giúp bạn tập hợp đủ người cho một trận 3v3 hoặc 5v5, hoặc tìm nhóm chơi thường xuyên mà không cần qua nhóm chat lộn xộn.',
  'bong-chuyen': 'Bóng chuyền cần tối thiểu 12 người mỗi trận. Tìm đủ người là thử thách lớn nhất — CoDuyen giải quyết bằng cách kết nối bạn với cộng đồng bóng chuyền tại địa phương.',
  'bong-ban': 'Bóng bàn có thể chơi bất cứ lúc nào, nhưng cần đối thủ xứng tầm mới thú vị. CoDuyen giúp bạn tìm người chơi cùng trình độ trong khu vực, xây dựng lịch đấu giao hữu đều đặn.',
  'chay-bo': 'Chạy bộ một mình dễ bỏ cuộc. Chạy cùng người khác — cùng pace, cùng lịch — giúp bạn duy trì thói quen và tạo thêm động lực. CoDuyen kết nối bạn với running group phù hợp.',
}

export async function generateMetadata(
  { params }: { params: { sport: string; city: string } }
): Promise<Metadata> {
  const sportInfo = SPORT_MAP[params.sport]
  const cityName = CITY_MAP[params.city]
  if (!sportInfo || !cityName) return { title: 'CoDuyen' }

  const title = `Tìm bạn chơi ${sportInfo.label} tại ${cityName} — Kết nối cộng đồng | CoDuyen`
  const description = `Tìm ${sportInfo.partner} thường xuyên tại ${cityName}. Ghép trận theo trình độ, kết bạn với cộng đồng ${sportInfo.label} địa phương. Miễn phí trên CoDuyen.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://coduyen.net/tim-ban-choi/${params.sport}/${params.city}`,
      siteName: 'CoDuyen',
      images: [{ url: 'https://coduyen.net/og-match.png', width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://coduyen.net/tim-ban-choi/${params.sport}/${params.city}`,
    },
  }
}

export async function generateStaticParams() {
  return Object.keys(SPORT_MAP).flatMap(sport =>
    Object.keys(CITY_MAP).map(city => ({ sport, city }))
  )
}

export default async function FindPartnerPage(
  { params }: { params: { sport: string; city: string } }
) {
  const sportInfo = SPORT_MAP[params.sport]
  const cityName = CITY_MAP[params.city]

  if (!sportInfo || !cityName) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Không tìm thấy trang</p>
      </div>
    )
  }

  const matches: SeoMatch[] = await fetchPublicMatches(sportInfo.type, cityName)
  const sportContent = SPORT_CONTENT[params.sport]
  const cityContent = CITY_CONTENT[params.city]
  const partnerText = PARTNER_CONTENT[params.sport] ?? ''

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Tìm bạn chơi ${sportInfo.label} thường xuyên tại ${cityName} ở đâu?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CoDuyen là cách nhanh nhất để tìm ${sportInfo.partner} thường xuyên tại ${cityName}. Tạo hồ sơ, xem trận đang mở, xin tham gia và kết bạn với người chơi trong khu vực — hoàn toàn miễn phí.`,
        },
      },
      {
        '@type': 'Question',
        name: `Làm sao kết bạn với cộng đồng ${sportInfo.label} tại ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Tham gia các trận giao lưu ${sportInfo.label} trên CoDuyen là cách nhanh nhất để hòa nhập cộng đồng ${sportInfo.label} tại ${cityName}. Mỗi trận là một cơ hội gặp người chơi cùng trình độ và lập nhóm chơi cố định.`,
        },
      },
      {
        '@type': 'Question',
        name: `${sportInfo.label} tại ${cityName} có cần phí tham gia không?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Nhiều trận ${sportInfo.label} trên CoDuyen miễn phí — chủ yếu để giao lưu kết bạn. Một số trận có phí thuê sân chia đều cho các thành viên, thường từ 30.000–100.000đ/người tùy địa điểm và thành phố.`,
        },
      },
      {
        '@type': 'Question',
        name: `Người mới bắt đầu chơi ${sportInfo.label} có thể tham gia không?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Hoàn toàn có thể. CoDuyen phân loại trận theo trình độ: Mới bắt đầu, Yếu, Trung bình và Khá. Người mới hãy tìm trận có tag "Yếu" hoặc "Vui vẻ" tại ${cityName} — các host thường rất chào đón người mới và sẵn sàng chỉ dạy.`,
        },
      },
    ],
  }

  const relatedSports = Object.entries(SPORT_MAP).filter(([s]) => s !== params.sport).slice(0, 4)
  const relatedCities = Object.entries(CITY_MAP).filter(([c]) => c !== params.city).slice(0, 5)

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-4 pt-10 pb-8 text-white">
        <p className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider">CoDuyen · {cityName}</p>
        <h1 className="text-2xl font-black leading-tight mb-1">
          {sportInfo.emoji} Tìm bạn chơi {sportInfo.label}<br />tại {cityName}
        </h1>
        <p className="text-blue-200 text-sm mb-3 font-medium">Kết nối cộng đồng · Chơi thường xuyên · Miễn phí</p>
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-2xl shadow-lg"
          >
            <UserPlus size={14} /> Đăng ký miễn phí
          </Link>
          <Link
            href={`/tim-keo/${params.sport}/${params.city}`}
            className="inline-flex items-center gap-2 bg-blue-500/40 border border-white/30 text-white font-semibold text-sm px-4 py-2.5 rounded-2xl"
          >
            Xem trận đang mở →
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Why find a partner */}
        {partnerText && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tại sao cần bạn chơi thường xuyên?</p>
            <p className="text-sm text-gray-700 leading-relaxed">{partnerText}</p>
          </div>
        )}

        {/* How it works */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Cách tìm {sportInfo.partner} trên CoDuyen</h2>
          <div className="space-y-3">
            {[
              { step: '1', title: 'Đăng ký miễn phí', desc: 'Tạo hồ sơ với trình độ và khu vực của bạn tại ' + cityName },
              { step: '2', title: 'Tìm trận phù hợp', desc: `Lọc trận ${sportInfo.label} theo trình độ, địa chỉ và thời gian` },
              { step: '3', title: 'Tham gia và kết bạn', desc: 'Xin vào trận, nhắn tin, và trở thành thành viên nhóm chơi cố định' },
            ].map(item => (
              <div key={item.step} className="flex gap-3 bg-white rounded-2xl border border-gray-100 p-4">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0">{item.step}</div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active matches */}
        {matches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
              Buổi chơi đang tuyển thành viên
            </h2>
            <div className="space-y-3">
              {matches.slice(0, 5).map((m: SeoMatch) => (
                <Link key={m.id} href={`/m/${m.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="font-semibold text-gray-800 text-sm leading-snug mb-2">{m.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={11} />{m.address}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{m.match_date} · {m.start_time?.slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><Users size={11} />Còn {m.max_slots - m.filled_slots} chỗ</span>
                  </div>
                </Link>
              ))}
            </div>
            {matches.length > 5 && (
              <Link href={`/tim-keo/${params.sport}/${params.city}`}
                className="block text-center text-sm font-semibold text-blue-600 mt-3">
                Xem tất cả {matches.length} buổi chơi →
              </Link>
            )}
          </div>
        )}

        {/* Sport + city content */}
        {sportContent && (
          <div className="mb-8 space-y-4">
            <h2 className="text-base font-bold text-gray-800">
              Cộng đồng {sportInfo.label} tại {cityName}
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{sportContent.community}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{sportContent.intro}</p>
            {cityContent && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 mb-2">Thể thao tại {cityName}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{cityContent}</p>
              </div>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="mb-8 space-y-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">Câu hỏi thường gặp</h2>
          {faqJsonLd.mainEntity.map((item, i) => (
            <details key={i} className="bg-white rounded-2xl border border-gray-100 p-4 group">
              <summary className="text-sm font-semibold text-gray-800 cursor-pointer list-none flex justify-between items-center">
                {item.name}
                <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{item.acceptedAnswer.text}</p>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 mb-8 text-center">
          <p className="font-bold text-gray-800 mb-1">Sẵn sàng tìm {sportInfo.partner}?</p>
          <p className="text-xs text-gray-500 mb-4">Miễn phí · Không cần tải app · Bắt đầu trong 60 giây</p>
          <Link href="/register"
            className="inline-block bg-blue-600 text-white font-bold text-sm px-6 py-3 rounded-2xl">
            Tìm bạn ngay
          </Link>
        </div>

        {/* Related cities */}
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tìm bạn chơi ở thành phố khác</p>
          <div className="flex flex-wrap gap-2">
            {relatedCities.map(([slug, name]) => (
              <Link key={slug} href={`/tim-ban-choi/${params.sport}/${slug}`}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors">
                {sportInfo.emoji} {name}
              </Link>
            ))}
          </div>
        </div>

        {/* Related sports */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Tìm bạn chơi môn khác tại {cityName}</p>
          <div className="flex flex-wrap gap-2">
            {relatedSports.map(([slug, info]) => (
              <Link key={slug} href={`/tim-ban-choi/${slug}/${params.city}`}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-blue-300 hover:text-blue-700 transition-colors">
                {info.emoji} {info.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
