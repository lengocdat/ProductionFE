// Test Linh Căn: the content and scoring, free of React and the DOM so every path can be checked by script.
// It is a joke personality test: no fortune-telling claims, no religion, and it stays free.

export const ROOT_IDS = ['phe', 'ngu', 'bang', 'hoa', 'kim', 'moc', 'tho', 'phong'] as const;
export type RootId = (typeof ROOT_IDS)[number];

export type Root = {
  id: RootId;
  name: string;
  school: string;
  verdict: string;
  skill: string;
  weakness: string;
  mate: RootId;
  nemesis: RootId;
  tint: string;
};

export const ROOTS: Readonly<Record<RootId, Root>> = {
  phe: {
    id: 'phe', name: 'Phế Linh Căn', school: 'hệ Deadline', tint: '#e8743c',
    verdict: 'Bình thường tu vi bằng không. Còn 2 tiếng là đến hạn thì đột phá ba tầng liền.',
    skill: 'Làm trong một đêm việc của ba tuần',
    weakness: 'Câu "em gửi sớm hơn được không?"',
    mate: 'ngu', nemesis: 'tho',
  },
  ngu: {
    id: 'ngu', name: 'Thiên Linh Căn', school: 'hệ Ngủ Nướng', tint: '#8f9df0',
    verdict: 'Tư chất trời cho, nhưng trời cho xong đạo hữu ngủ tiếp.',
    skill: 'Tắt báo thức khi chưa mở mắt',
    weakness: 'Cuộc họp lúc 8 giờ sáng',
    mate: 'moc', nemesis: 'phe',
  },
  bang: {
    id: 'bang', name: 'Băng Linh Căn', school: 'hệ Seen Không Rep', tint: '#7fd6ea',
    verdict: 'Đạo tâm lạnh như băng. Tin nhắn đã xem từ tháng trước vẫn đang được cân nhắc.',
    skill: 'Thả một cái tim để kết thúc mọi cuộc trò chuyện',
    weakness: 'Người gọi điện không báo trước',
    mate: 'tho', nemesis: 'phong',
  },
  hoa: {
    id: 'hoa', name: 'Hỏa Linh Căn', school: 'hệ Cà Khịa', tint: '#f0523c',
    verdict: 'Linh lực bùng nổ nhất ở phần bình luận. Một câu của người lạ đủ để đạo hữu xuất quan.',
    skill: 'Phản biện ba đoạn, có dẫn nguồn',
    weakness: 'Người trả lời đúng một chữ "ok"',
    mate: 'phong', nemesis: 'moc',
  },
  kim: {
    id: 'kim', name: 'Kim Linh Căn', school: 'hệ Săn Sale', tint: '#f2c14e',
    verdict: 'Nhìn thấu mọi giá gốc ảo. Tiết kiệm được rất nhiều tiền bằng cách mua thêm.',
    skill: 'Ghép ba mã giảm giá trong một đơn',
    weakness: 'Dòng chữ "chỉ còn 2 sản phẩm"',
    mate: 'bang', nemesis: 'ngu',
  },
  moc: {
    id: 'moc', name: 'Mộc Linh Căn', school: 'hệ Chữa Lành', tint: '#67c587',
    verdict: 'Thở một hơi là thấy mọi chuyện rồi sẽ qua. Cái cây trên bàn thì chưa chắc.',
    skill: 'Biến một ly trà thành một buổi trị liệu',
    weakness: 'Tin nhắn "mình nói chuyện chút nhé"',
    mate: 'kim', nemesis: 'hoa',
  },
  tho: {
    id: 'tho', name: 'Thổ Linh Căn', school: 'hệ Nằm Im', tint: '#c49a6c',
    verdict: 'Cẩu đạo chính tông. Không ai biết đạo hữu mạnh đến đâu, kể cả đạo hữu.',
    skill: 'Biến mất khỏi nhóm chat khi có việc cần làm',
    weakness: 'Câu "bạn nào xung phong không?"',
    mate: 'bang', nemesis: 'hoa',
  },
  phong: {
    id: 'phong', name: 'Phong Linh Căn', school: 'hệ Hóng Drama', tint: '#c58af0',
    verdict: 'Tin đồn chưa kịp đến tông môn bên cạnh, đạo hữu đã có đủ ảnh chụp màn hình.',
    skill: 'Tìm ra tài khoản phụ của bất kỳ ai',
    weakness: 'Câu "thôi không kể nữa đâu"',
    mate: 'hoa', nemesis: 'bang',
  },
};

export type Question = { text: string; options: ReadonlyArray<{ text: string; root: RootId }> };

export const QUESTIONS: readonly Question[] = [
  {
    text: '8 giờ sáng thứ Hai, đạo hữu đang…',
    options: [
      { text: 'Còn trong chăn, báo thức đã tắt lần thứ năm', root: 'ngu' },
      { text: 'Mở danh sách deadline, nhìn một lúc rồi đóng lại', root: 'phe' },
      { text: 'Đọc hết nhóm chat, không trả lời ai', root: 'bang' },
      { text: 'Lướt xem cuối tuần ai chia tay ai', root: 'phong' },
    ],
  },
  {
    text: 'Trưởng lão nhắn lúc 10 giờ tối: "Em rảnh không?"',
    options: [
      { text: 'Đã xem. Mai tính.', root: 'bang' },
      { text: 'Trả lời ngay, cuối câu có dấu chấm rất lạnh', root: 'hoa' },
      { text: 'Giả chết. Giữ mạng là trên hết.', root: 'tho' },
      { text: 'Nhận lời, rồi 3 giờ sáng mới bắt đầu làm', root: 'phe' },
    ],
  },
  {
    text: 'Linh thạch cuối tháng vừa về tài khoản',
    options: [
      { text: 'Mở giỏ hàng đã canh từ tuần trước', root: 'kim' },
      { text: 'Mua thêm cây cảnh và nến thơm', root: 'moc' },
      { text: 'Cất đi, không kể với ai', root: 'tho' },
      { text: 'Ăn mừng bằng một giấc thật dài', root: 'ngu' },
    ],
  },
  {
    text: 'Một người lạ cà khịa đạo hữu trên mạng',
    options: [
      { text: 'Viết phản hồi ba đoạn, có dẫn nguồn', root: 'hoa' },
      { text: 'Hít thở. Người ta chắc cũng đang mệt.', root: 'moc' },
      { text: 'Chụp màn hình gửi ngay vào nhóm bạn thân', root: 'phong' },
      { text: 'Ngủ đã, tỉnh dậy tính sau', root: 'ngu' },
    ],
  },
  {
    text: 'Vào tông môn, đạo hữu xin nhận việc gì?',
    options: [
      { text: 'Trực Tàng Kinh Các, nơi không ai lui tới', root: 'tho' },
      { text: 'Giữ kho linh thạch, tiện xem giá', root: 'kim' },
      { text: 'Trông vườn linh dược, nói chuyện với cây', root: 'moc' },
      { text: 'Bưng trà ở quán đầu núi, tiện nghe chuyện', root: 'phong' },
    ],
  },
  {
    text: 'Thiên Kiếp giáng xuống, đạo hữu…',
    options: [
      { text: 'Đợi sét đến nơi mới bắt đầu luyện', root: 'phe' },
      { text: 'Ngủ luôn, tỉnh thì tính tiếp', root: 'ngu' },
      { text: 'Đấm ngược lại trời', root: 'hoa' },
      { text: 'Hỏi xem độ kiếp có mã giảm giá không', root: 'kim' },
    ],
  },
  {
    text: 'Đồng môn rủ lập đội đi bí cảnh',
    options: [
      { text: 'Đã xem.', root: 'bang' },
      { text: 'Hỏi: "Có săn được đồ giảm giá không?"', root: 'kim' },
      { text: 'Để họ đi trước, an toàn rồi theo sau', root: 'tho' },
      { text: 'Đi, nhưng đến nơi phải pha trà trước', root: 'moc' },
    ],
  },
  {
    text: 'Nhóm chat tông môn báo 99+ tin chưa đọc',
    options: [
      { text: 'Đọc hết, để còn biết ai nói gì về ai', root: 'phong' },
      { text: 'Tắt thông báo. Vĩnh viễn.', root: 'bang' },
      { text: 'Nhảy vào đính chính một người nói sai', root: 'hoa' },
      { text: 'Để đó, tới hạn nộp bài mới mở ra', root: 'phe' },
    ],
  },
];

/**
 * Highest score wins. Ties are settled from the answers themselves, so the same answers always
 * give the same root and no root is favoured just by coming first in the list.
 */
export function scoreAnswers(answers: readonly number[]): RootId {
  const score = new Map<RootId, number>();
  QUESTIONS.forEach((q, i) => {
    const option = q.options[answers[i] ?? -1];
    if (option) score.set(option.root, (score.get(option.root) ?? 0) + 1);
  });
  const best = Math.max(0, ...score.values());
  const tied = ROOT_IDS.filter(id => score.get(id) === best);
  if (tied.length === 0) return ROOT_IDS[0];
  const seed = answers.reduce((sum, a, i) => sum + a * (i + 1), 0);
  return tied[seed % tied.length] ?? tied[0]!;
}

export function isRootId(value: unknown): value is RootId {
  return typeof value === 'string' && (ROOT_IDS as readonly string[]).includes(value);
}

/** Display name for the card. It stays on the visitor's device and is never sent to the server or put in a link. */
export function cleanCardName(raw: string): string {
  const name = raw.normalize('NFC').replace(/\p{M}{3,}/gu, '').replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim();
  return Array.from(name).slice(0, 24).join('') || 'Đạo hữu vô danh';
}
