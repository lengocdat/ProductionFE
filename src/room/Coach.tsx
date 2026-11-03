"use client";

import { useEffect } from "react";

/** First-visit walkthrough. Steps without `action` advance on their own when the player
 *  does the thing (sits, says something); the rest have a button. */
export const COACH_STEPS = [
  {
    target: ".dt-sit",
    title: "Ngồi xuống để tu luyện",
    body: "Bấm nút Ngồi thiền (hoặc chạm một bồ đoàn đỏ). Ngồi yên là tu vi tăng.",
  },
  {
    target: ".dt-status",
    title: "Tu vi đang tăng",
    body: "Ngồi yên mỗi giây được +1 tu vi. Càng nhiều người ngồi cùng, tăng càng nhanh.",
    action: "Hiểu rồi",
  },
  {
    target: ".dt-phrases",
    title: "Chào mọi người",
    body: "Chạm một câu bên dưới để nói, bấm 🙏 để vái chào. Ô có ổ khoá 🔒 cho biết lên cấp nào thì được tự gõ chat.",
  },
  {
    target: ".dt-master",
    title: "Mục tiêu của bạn",
    body: "Đủ tu vi là thăng cấp, từ Tạp dịch lên tới Thái thượng trưởng lão. Ai nhiều tu vi nhất tuần làm Chưởng môn 👑. Thỉnh thoảng sẽ có chuyện bất ngờ, cứ chờ xem!",
    action: "Bắt đầu tu luyện",
  },
] as const;

export const COACH_SIT = 0;
export const COACH_CHAT = 2;

type Props = { step: number; onNext: () => void; onSkip: () => void };

export default function Coach({ step, onNext, onSkip }: Props) {
  const current = COACH_STEPS[step];

  // Ring the control the step talks about, so the player knows where to look.
  useEffect(() => {
    if (!current) return;
    const el = document.querySelector(current.target);
    el?.classList.add("dt-coach-target");
    return () => el?.classList.remove("dt-coach-target");
  }, [current]);

  if (!current) return null;
  return (
    <div className="dt-glass dt-coach" role="dialog" aria-label="Hướng dẫn">
      <small>Bước {step + 1}/{COACH_STEPS.length}</small>
      <h3>{current.title}</h3>
      <p>{current.body}</p>
      <div className="dt-coach-actions">
        {"action" in current && <button type="button" className="dt-btn dt-btn--gold" onClick={onNext}>{current.action}</button>}
        <button type="button" className="dt-btn dt-btn--ghost" onClick={onSkip}>Bỏ qua hướng dẫn</button>
      </div>
    </div>
  );
}
