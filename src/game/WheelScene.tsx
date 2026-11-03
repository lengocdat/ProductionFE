"use client";

import { useEffect, useState } from "react";
import { Gem, Sparkles } from "lucide-react";
import type { Chronicle } from "./types";

export default function WheelScene({ tickets, disabled, latest, spin }: { tickets: number; disabled: boolean; latest?: Chronicle; spin: () => Promise<void> }) {
  const [phase, setPhase] = useState<"idle" | "request" | "reveal">("idle");
  const turning = phase !== "idle";
  useEffect(() => {
    if (phase !== "reveal") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finish = () => setPhase("idle");
    const timer = window.setTimeout(finish, preference.matches ? 0 : 1600);
    preference.addEventListener("change", finish);
    return () => { window.clearTimeout(timer); preference.removeEventListener("change", finish); };
  }, [phase]);
  const start = async () => {
    if (turning || disabled) return;
    setPhase("request");
    try { await spin(); setPhase("reveal"); } catch { setPhase("idle"); /* Shell presents failed or unresolved actions. */ }
  };
  return <section className={`wheel-stage ${turning ? "is-turning" : ""}`} aria-label="Pháp trận Luân Hồi Bàn" aria-busy={turning}>
    <img className="wheel-backdrop" src="/art/scenes/van-tuong.webp" alt="" width={1280} height={720} loading="lazy" />
    <div className="wheel-art" aria-hidden="true"><div className="wheel-orbit orbit-one" /><div className="wheel-orbit orbit-two" /><div className="wheel-ring"><span>乾</span><span>坤</span><span>震</span><span>巽</span><span>坎</span><span>離</span><span>艮</span><span>兌</span></div><div className="wheel-core"><Gem size={54} strokeWidth={1} /></div></div>
    <div className="wheel-console"><p className="eyebrow">PHÁP TRẬN CƠ DUYÊN</p><h2>Luân Hồi Bàn</h2><span className="badge">{tickets} Vé Cơ Duyên</span><button className="button primary" disabled={disabled || turning} onClick={() => void start()}><Sparkles size={18} />{turning ? "Đang thỉnh cơ duyên…" : tickets < 1 ? "Hết Vé Cơ Duyên" : "Quay một lượt · 1 vé"}</button><p className="fine-print">Pháp trận là hiệu ứng trang trí, không biểu thị xác suất. Kết quả chỉ đến từ máy chủ.</p></div>
    {phase === "reveal" && <button className="button secondary" onClick={() => setPhase("idle")}>Bỏ qua hiệu ứng · Xem kết quả</button>}
    {latest && !turning && <div className="wheel-reveal" key={latest.id} role="status"><Gem size={25} /><div><span className="eyebrow">KẾT QUẢ ĐÃ LƯU</span><h3>{latest.title.replace(/^Luân Hồi Bàn · /, "")}</h3><p>{latest.text}</p><time dateTime={latest.at}>{new Date(latest.at).toLocaleString("vi-VN")}</time></div></div>}
  </section>;
}
