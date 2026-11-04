"use client";

import { useEffect, useRef } from "react";
import type { RankDef, SpotDef } from "./protocol";

type Props = {
  ranks: readonly RankDef[];
  /** What each rank unlocks, e.g. {1: ["tự gõ chat"]}. */
  perks: Readonly<Record<number, string[]>>;
  /** Rank that unlocks free typing, or null when chat is preset-only / open to all. */
  chatUnlock: RankDef | null;
  /** Interactive places of the sect, from the room. */
  spots: readonly SpotDef[];
  /** Opened from the stele (Bia tông quy): start at the spot list. */
  focusSpots: boolean;
  onClose: () => void;
  onReplayGuide: () => void;
  onTransfer: () => void;
};

/** What each spot does, by spot id; spots the server adds later still list with their label. */
const SPOT_BLURBS: Readonly<Record<string, string>> = {
  incense: "Thắp một nén hương ở Đỉnh hương rồi xem khói đoán vận. Được chút tu vi và góp thêm tụ khí cho cả phòng.",
  statue: "Vái Tượng Tổ sư trước Trường Sinh Điện, được tu vi. Thỉnh thoảng Tổ sư hình như… nháy mắt.",
  bell: "Gõ chuông đồng: cả phòng cùng nghe và linh mạch tụ khí thêm một chút. Ai gõ xong thì chuông nghỉ 45 giây.",
  furnace: "Thử luyện đan ở Lò luyện đan. Thành đan thì được nhiều tu vi, đan khét thì được ít, nổ lò thì… mặt đen như đít nồi.",
  koi: "Cho cá chép ở Linh trì ăn. Hiếm lắm mới có con vượt Long Môn hoá rồng, cả phòng cùng được lộc.",
  stele: "Đọc Bia tông quy, chính là trang Cách chơi này.",
};

/** "10 phút", "1 giờ 30 phút", "45 giây". */
function waitText(s: number): string {
  if (s < 60) return `${s} giây`;
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h} giờ${m > 0 ? ` ${m} phút` : ""}` : `${m} phút`;
}

/** Hours of sitting alone (1 tu vi per second) needed for a threshold. */
function hoursAlone(qi: number): string {
  const h = qi / 3600;
  if (h < 1) return `${Math.round(h * 60)} phút`;
  return `${h.toLocaleString("vi-VN", { maximumFractionDigits: 0 })} giờ`;
}

export default function HelpSheet({ ranks, perks, chatUnlock, spots, focusSpots, onClose, onReplayGuide, onTransfer }: Props) {
  const spotsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (focusSpots) spotsRef.current?.scrollIntoView({ block: "start" });
  }, [focusSpots]);

  return (
    <div className="dt-overlay dt-overlay--dim" role="dialog" aria-label="Cách chơi" onClick={onClose}>
      <div className="dt-glass dt-card dt-help" onClick={ev => ev.stopPropagation()}>
        <h2 className="dt-title" style={{ fontSize: 26 }}>Cách chơi</h2>

        <section>
          <h3>🧘 Ngồi thiền = tăng tu vi</h3>
          <p>Bấm <b>Ngồi thiền</b> hoặc chạm một bồ đoàn. Ngồi yên mỗi giây được <b>+1 tu vi</b>. Đứng dậy hay đi lại thì ngừng tăng.</p>
        </section>

        <section>
          <h3>👥 Ngồi cùng nhau nhanh hơn</h3>
          <p>Mỗi người khác đang ngồi trong phòng cộng thêm <b>+10%</b> (tối đa +90%).</p>
        </section>

        <section>
          <h3>✨ Linh mạch</h3>
          <p>6 bồ đoàn xanh ngọc ở giữa sân tăng thêm <b>×1,5</b>, chỉ dành cho <b>Nội môn đệ tử</b> trở lên.</p>
        </section>

        <section>
          <h3>📈 Cấp bậc</h3>
          <p>Tu vi đủ là tự thăng cấp, không bao giờ bị hạ cấp.</p>
          <table className="dt-help-ranks">
            <thead><tr><th>Cấp</th><th>Cần tu vi</th><th>Ngồi một mình ≈</th><th>Mở khoá</th></tr></thead>
            <tbody>
              {ranks.map(r => (
                <tr key={r.id}>
                  <td><span className={`dt-rank dt-rank--${Math.min(r.id, 5)}`}>{r.name}</span></td>
                  <td>{r.min_qi.toLocaleString("vi-VN")}</td>
                  <td>{r.min_qi === 0 ? "bắt đầu" : hoursAlone(r.min_qi)}</td>
                  <td>{perks[r.id]?.join(", ") ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3>💬 Trò chuyện</h3>
          <p>
            Ai cũng dùng được các <b>câu có sẵn</b> và biểu cảm 🙏.
            {chatUnlock ? <> Lên <b>{chatUnlock.name}</b> (khoảng {hoursAlone(chatUnlock.min_qi)} ngồi thiền) là được <b>tự gõ chat</b>.</> : null}
          </p>
        </section>

        <section>
          <h3>👑 Chưởng môn</h3>
          <p>Ai có <b>nhiều tu vi nhất trong tuần</b> là Chưởng môn. Bảng xếp hạng làm lại từ đầu lúc 0:00 thứ Hai, nên ai cũng có cơ hội.</p>
        </section>

        <section>
          <h3>🎲 Thiên Cơ Bất Ngờ</h3>
          <p>Khi ngồi, đi lại, vái chào hay thăng cấp, thỉnh thoảng sẽ có chuyện buồn cười xảy ra. Cả phòng cùng thấy.</p>
        </section>

        {spots.length > 0 && (
          <section ref={spotsRef}>
            <h3>🏯 Nơi tương tác trong tông môn</h3>
            <p>Chạm vào đồ vật trong sân (hoặc nhãn trên nó) để đi tới, đứng gần rồi bấm nút hiện ra phía dưới. Đang ngồi thiền thì không dùng được. Phần thưởng nhỏ thôi, cốt để vui.</p>
            <ul className="dt-help-spots">
              {spots.map(s => (
                <li key={s.id}>
                  <span className="dt-help-spot-emoji" aria-hidden="true">{s.emoji}</span>
                  <span>
                    <b>{s.label}</b>
                    {SPOT_BLURBS[s.id] ? ` · ${SPOT_BLURBS[s.id]}` : ""}
                    {!s.local && s.cooldown_s > 0 ? <small> Mỗi người {waitText(s.cooldown_s)} một lần.</small> : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>🌀 Linh mạch tụ khí</h3>
          <p>Thanh tụ khí dưới ô tu vi là <b>mục tiêu chung của cả phòng</b>. Càng nhiều người cùng ngồi thiền thì thanh đầy càng nhanh; lễ cúng dường và Thiên Đạo cũng góp thêm.</p>
          <p>Đầy thanh là <b>Thiên Đạo giáng lộc</b>: trong 5 phút, ai đang ngồi thiền trong phòng cũng được <b>×2 tu vi</b>. Hết lộc thì cả phòng tụ khí lại từ đầu.</p>
        </section>

        <section>
          <h3>☁️ Thiên Đạo hỏi</h3>
          <p>Thỉnh thoảng (khi phòng có từ 2 người) Thiên Đạo hỏi một câu vu vơ, cả phòng có <b>20 giây</b> để bỏ phiếu. Bấm lựa chọn mình thích, đổi ý thì bấm lựa chọn khác.</p>
          <p>Lựa chọn nhiều phiếu nhất sẽ thành sự thật: mưa linh khí cho mọi người, gà chạy loạn hất người khỏi bồ đoàn, cả phòng nhảy múa, tiếng chiêng, hay góp thêm tụ khí.</p>
        </section>

        <section>
          <h3>🛡️ Chặn &amp; báo cáo</h3>
          <p>Chạm vào <b>tên một người trong khung trò chuyện</b> để chọn:</p>
          <p><b>🔇 Chặn</b>: không thấy lời họ nói nữa (chỉ trên máy bạn, trong lần chơi này). Chạm lại tên để <b>Bỏ chặn</b>.</p>
          <p><b>🚩 Báo cáo</b>: khi họ nói bậy, đặt tên bậy hay spam. Đủ nhiều người báo cáo thì người đó tạm bị <b>khoá tự gõ chat 30 phút</b> (câu có sẵn vẫn dùng được). Báo cáo bừa không có tác dụng đâu nhé.</p>
          <p>Lời nói bậy, đường link và số điện thoại trong chat tự gõ sẽ bị che thành <b>***</b> để tránh lừa đảo.</p>
        </section>

        <section>
          <h3>🍜 Cúng dường Thiên Đạo</h3>
          <p>Mời Thiên Đạo ly trà đá, bát phở… để ủng hộ đội làm game. Mỗi lễ <b>phát lộc tu vi cho mọi người đang online</b>, người cúng được huy hiệu, cưỡi mây và ghi tên vào Sổ Công Đức. Không mua được sức mạnh.</p>
        </section>

        <section>
          <h3>💾 Lưu tiến độ</h3>
          <p>Tu vi tự lưu trên máy này, không cần đăng ký. Muốn chơi tiếp trên máy khác thì dùng nút bên dưới.</p>
          <p>Rớt mạng giữa chừng thì game <b>tự nối lại</b> và thử ngồi lại bồ đoàn cũ, bạn không cần làm gì.</p>
          <button type="button" className="dt-btn" onClick={onTransfer}>📲 Chuyển sang máy khác</button>
        </section>

        <div className="dt-actions">
          <button type="button" className="dt-btn dt-btn--gold" onClick={onClose}>Đã hiểu</button>
          <button type="button" className="dt-btn dt-btn--ghost" onClick={onReplayGuide}>Xem lại hướng dẫn từng bước</button>
        </div>
      </div>
    </div>
  );
}
