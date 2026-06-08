export const SPORT_MAP: Record<string, { type: string; label: string; emoji: string; partner: string }> = {
  'cau-long':    { type: 'BADMINTON',    label: 'Cầu lông',    emoji: '🏸', partner: 'đối thủ cầu lông' },
  'bong-da':     { type: 'FOOTBALL',     label: 'Bóng đá',     emoji: '⚽', partner: 'bạn đá bóng' },
  'tennis':      { type: 'TENNIS',       label: 'Tennis',      emoji: '🎾', partner: 'đối thủ tennis' },
  'pickleball':  { type: 'PICKLEBALL',   label: 'Pickleball',  emoji: '🏓', partner: 'bạn chơi pickleball' },
  'bong-ro':     { type: 'BASKETBALL',   label: 'Bóng rổ',     emoji: '🏀', partner: 'bạn đánh bóng rổ' },
  'bong-chuyen': { type: 'VOLLEYBALL',   label: 'Bóng chuyền', emoji: '🏐', partner: 'bạn đánh bóng chuyền' },
  'bong-ban':    { type: 'TABLE_TENNIS', label: 'Bóng bàn',    emoji: '🏓', partner: 'đối thủ bóng bàn' },
  'chay-bo':     { type: 'RUNNING',      label: 'Chạy bộ',     emoji: '🏃', partner: 'bạn cùng chạy bộ' },
}

export const CITY_MAP: Record<string, string> = {
  'ho-chi-minh': 'Hồ Chí Minh',
  'ha-noi':      'Hà Nội',
  'da-nang':     'Đà Nẵng',
  'can-tho':     'Cần Thơ',
  'binh-duong':  'Bình Dương',
  'dong-nai':    'Đồng Nai',
  'hai-phong':   'Hải Phòng',
  'nha-trang':   'Nha Trang',
  'hue':         'Huế',
  'vung-tau':    'Vũng Tàu',
}

export const SPORT_CONTENT: Record<string, { intro: string; tips: string; community: string }> = {
  'cau-long': {
    intro: 'Cầu lông là môn thể thao vợt phổ biến nhất Việt Nam, phù hợp mọi lứa tuổi. Chỉ cần một cây vợt, quả cầu và bạn đã sẵn sàng. Trận đấu đơn hoặc đôi đều hấp dẫn — cầu lông rèn luyện phản xạ, sức bền và tinh thần đồng đội.',
    tips: 'Mẹo tìm trận nhanh: lọc theo trình độ (yếu/TB/khá) để khỏi bị lạc trình, chọn khung giờ buổi tối để có nhiều lựa chọn nhất. Sân cầu lông thường đặt theo giờ, hãy xác nhận địa điểm trước khi đến.',
    community: 'Cộng đồng cầu lông nghiệp dư rất thân thiện. Nhiều nhóm đánh thường xuyên vào sáng sớm và tối cuối tuần — đây là cơ hội tốt để kết bạn và cải thiện kỹ thuật thông qua thực chiến.',
  },
  'bong-da': {
    intro: 'Bóng đá phủi là văn hóa thể thao không thể thiếu tại Việt Nam. Sân 5 người, 7 người hay 11 người đều có — bạn chỉ cần đôi giày và tinh thần thi đấu. Đây là cách tuyệt vời để kết bạn, xả stress sau giờ làm.',
    tips: 'Trận bóng đá phủi thường cần 10–14 người. Tham gia sớm để giữ chỗ vì slot luôn đầy nhanh, đặc biệt vào cuối tuần. Nên mang theo áo dự phòng để phân biệt 2 đội.',
    community: 'Các nhóm bóng đá phủi thường chơi cố định hàng tuần — khi đã tham gia một vài buổi, bạn sẽ nhanh chóng trở thành thành viên thân quen và được mời vào nhóm riêng.',
  },
  'tennis': {
    intro: 'Tennis đang bùng nổ tại Việt Nam nhờ chi phí tiếp cận ngày càng dễ hơn. Từ sân công cộng đến câu lạc bộ cao cấp, bạn đều có thể tìm người đánh đôi hoặc đơn phù hợp trình độ của mình.',
    tips: 'Khi tìm trận tennis, hãy chú ý loại mặt sân (đất nện, cứng, thảm) vì ảnh hưởng nhiều đến lối chơi. Trận tennis thường chơi 1–1.5 giờ, 2 set hoặc đặt trước theo thời gian thuê sân.',
    community: 'Cộng đồng tennis nghiệp dư rất năng động. Ngoài việc tìm đối thủ qua CoDuyen, nhiều người còn lập nhóm chat để đặt sân định kỳ — rất tiện để duy trì thói quen tập luyện.',
  },
  'pickleball': {
    intro: 'Pickleball — môn thể thao tăng trưởng nhanh nhất Việt Nam hiện nay — phù hợp với mọi độ tuổi và không đòi hỏi thể lực cao. Dễ học, vui, và cộng đồng cực kỳ thân thiện.',
    tips: 'Pickleball thường chơi đôi (2v2). Nếu chưa có vợt, nhiều sân cho thuê ngay tại chỗ. Trận đấu đến 11 điểm, bên giao bóng mới được tính điểm — luật khá đặc biệt so với các môn vợt khác.',
    community: 'Cộng đồng pickleball Việt Nam còn nhỏ nhưng cực kỳ nhiệt tình. Người mới rất được chào đón và thường được các bạn có kinh nghiệm hướng dẫn kỹ thuật miễn phí trong buổi chơi.',
  },
  'bong-ro': {
    intro: 'Bóng rổ tại Việt Nam đang phát triển mạnh, đặc biệt ở các thành phố lớn. Từ sân ngoài trời công cộng đến nhà thi đấu, bạn có thể tìm trận 3v3 hoặc 5v5 quanh khu vực sống và làm việc.',
    tips: 'Trận bóng rổ phủi thường chơi theo thể thức "win stays" hoặc đặt trước sân. Hãy đến đúng giờ vì sân ngoài trời thường bị chiếm chỗ sớm, nhất là vào buổi tối mát.',
    community: 'Cộng đồng bóng rổ Việt Nam kết nối qua các nhóm địa phương. CoDuyen giúp bạn tìm trận nhanh hơn mà không cần phải chờ admin nhóm chat xử lý.',
  },
  'bong-chuyen': {
    intro: 'Bóng chuyền bãi biển và bóng chuyền trong nhà đều phổ biến tại các thành phố Việt Nam. Đây là môn thể thao đồng đội điển hình — cần 6 người mỗi bên và tinh thần phối hợp cao.',
    tips: 'Trận bóng chuyền cần ít nhất 12 người (6 mỗi bên). Đăng trận trên CoDuyen trước 1–2 ngày để tập hợp đủ người. Sân bãi biển thường chơi miễn phí — chỉ cần mang lưới và bóng.',
    community: 'Bóng chuyền đặc biệt phổ biến ở cơ quan, trường học và khu dân cư. Nếu bạn mới đến thành phố, tìm trận trên CoDuyen là cách nhanh nhất để gia nhập cộng đồng bóng chuyền địa phương.',
  },
  'bong-ban': {
    intro: 'Bóng bàn là môn thể thao trong nhà tiện lợi nhất — chơi được mọi thời tiết, không gian nhỏ, và không tốn nhiều chi phí. Phù hợp cho cả đơn lẫn đôi, bóng bàn rèn phản xạ và sự tập trung tuyệt vời.',
    tips: 'Khi tìm trận bóng bàn, hãy chú ý trình độ của đối thủ để tránh trận quá chênh lệch. Nhiều sân bóng bàn cho thuê theo giờ tại nhà thi đấu hoặc câu lạc bộ thể thao — chi phí thường rất hợp lý.',
    community: 'Cộng đồng bóng bàn tại Việt Nam có lịch sử lâu đời và rất gắn kết. Nhiều câu lạc bộ địa phương tổ chức giải đấu giao hữu hàng tháng — tham gia CoDuyen để không bỏ lỡ sự kiện nào.',
  },
  'chay-bo': {
    intro: 'Chạy bộ là xu hướng lối sống lành mạnh đang bùng nổ tại Việt Nam. Từ chạy buổi sáng quanh hồ đến marathon — cộng đồng running Việt Nam ngày càng đông và nhiệt huyết. Chạy cùng nhóm giúp bạn duy trì động lực lâu dài.',
    tips: 'Nhóm chạy thường đặt lịch cố định (sáng sớm 5–6h hoặc chiều 17–18h). Hãy xác nhận pace của nhóm trước để không bị bỏ lại. Nhiều nhóm có pace range từ 5:30 đến 7:00 phút/km.',
    community: 'Running club tại các thành phố lớn rất sôi động, thường tổ chức chạy nhóm cuối tuần và tham gia các giải marathon lớn. Tìm bạn chạy trên CoDuyen là bước đầu để hòa nhập vào cộng đồng này.',
  },
}

export const CITY_CONTENT: Record<string, string> = {
  'ho-chi-minh': 'TP. Hồ Chí Minh là thành phố thể thao sôi động nhất cả nước với hàng trăm sân từ Bình Thạnh, Gò Vấp đến Quận 7, Thủ Đức. Cơ hội tìm người chơi cùng khu vực rất cao — hầu hết các môn đều có người chơi hàng ngày.',
  'ha-noi': 'Hà Nội có cộng đồng thể thao sôi nổi quanh Hồ Tây, Hồ Hoàn Kiếm và công viên Thống Nhất. Thời tiết 4 mùa tạo nên văn hóa chơi thể thao phong phú — mùa đông phù hợp cho môn trong nhà, mùa hè cho ngoài trời.',
  'da-nang': 'Đà Nẵng — thành phố đáng sống nhất Việt Nam — có khí hậu dễ chịu quanh năm, lý tưởng để chơi thể thao ngoài trời. Bãi biển Mỹ Khê và khu Ngũ Hành Sơn là điểm tụ họp của cộng đồng thể thao địa phương.',
  'can-tho': 'Cần Thơ — thủ phủ miền Tây — đang phát triển hạ tầng thể thao nhanh. Khí hậu ấm áp và lối sống năng động của người miền Tây tạo nên cộng đồng thể thao thân thiện, cởi mở và dễ kết bạn.',
  'binh-duong': 'Bình Dương có mức sống cao và cơ sở vật chất thể thao tốt nhờ khu công nghiệp. Nhiều khu đô thị mới tích hợp sân thể thao hiện đại, lý tưởng để tìm người chơi cùng xóm.',
  'dong-nai': 'Đồng Nai — trung tâm Biên Hòa — đang bùng nổ dân số trẻ và nhu cầu thể thao. Gần TP.HCM nên thường xuyên có giao lưu thể thao liên tỉnh, cộng đồng ngày càng đa dạng.',
  'hai-phong': 'Hải Phòng có truyền thống thể thao lâu đời với tinh thần cạnh tranh cao. Cộng đồng thể thao tại đây gắn kết và thường xuyên tổ chức giải đấu giao hữu nội bộ theo quận huyện.',
  'nha-trang': 'Nha Trang với khí hậu nhiệt đới và bãi biển đẹp tạo môi trường thể thao lý tưởng. Du lịch thể thao đang phát triển — cộng đồng thể thao địa phương ngày càng đa dạng và cởi mở với người mới.',
  'hue': 'Huế có cộng đồng thể thao nhỏ nhưng gắn kết chặt chẽ. Không khí yên tĩnh và thời tiết mát mẻ đặc biệt phù hợp cho các môn cần tập trung như cầu lông, bóng bàn và tennis.',
  'vung-tau': 'Vũng Tàu với bãi biển đẹp và khí hậu ấm quanh năm thu hút đông người chơi thể thao ngoài trời. Cuối tuần, người từ TP.HCM đổ về tạo không khí sôi động — dễ tìm người chơi hơn bất kỳ ngày nào.',
}

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://coduyen.net/api'

export interface SeoMatch {
  id: number
  title: string
  address: string
  match_date: string
  start_time: string
  max_slots: number
  filled_slots: number
  price_per_slot: number
  status: string
}

export async function fetchPublicMatches(sport: string, city: string): Promise<SeoMatch[]> {
  try {
    const res = await fetch(
      `${API_BASE}/v1/public/matches?sport=${encodeURIComponent(sport)}&city=${encodeURIComponent(city)}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.matches || []
  } catch {
    return []
  }
}

export function buildFaqJsonLd(sportLabel: string, cityName: string, partnerLabel: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Tìm người chơi ${sportLabel} tại ${cityName} ở đâu?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CoDuyen là nền tảng tìm ${partnerLabel} theo vị trí thực tế tại ${cityName}. Xem các trận đang tuyển người, lọc theo trình độ (yếu/trung bình/khá), đăng ký và tham gia trong vài phút — hoàn toàn miễn phí.`,
        },
      },
      {
        '@type': 'Question',
        name: `App tìm ${partnerLabel} nào tốt nhất tại ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `CoDuyen là ứng dụng web tìm ${partnerLabel} theo GPS tại ${cityName}, không cần tải về. Hỗ trợ ghép cặp theo trình độ, nhắn tin nhóm, đánh giá uy tín host. Đang hoạt động tại 10 thành phố lớn Việt Nam.`,
        },
      },
      {
        '@type': 'Question',
        name: `Làm sao tìm ${partnerLabel} cùng trình độ tại ${cityName}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Trên CoDuyen, mỗi trận đều có tag trình độ: Yếu, Trung bình, TB+, Khá, Bán chuyên. Chọn đúng level, xem địa chỉ và giờ, nhấn "Xin vào" là xong. Hệ thống tự ghép bạn với người chơi cùng khu vực ${cityName}.`,
        },
      },
      {
        '@type': 'Question',
        name: `Chơi ${sportLabel} tại ${cityName} mất bao nhiêu tiền?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Phí tham gia trận ${sportLabel} trên CoDuyen do host quyết định, thường từ 0đ (miễn phí) đến 100.000đ/người tùy sân và khung giờ. Nhiều trận hoàn toàn miễn phí — chủ yếu để kết bạn và giao lưu.`,
        },
      },
    ],
  }
}
