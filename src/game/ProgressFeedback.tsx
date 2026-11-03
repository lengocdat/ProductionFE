"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { Snapshot } from "./types";

type Notice = { id: number; title: string; detail: string; breakthrough: boolean };

export default function ProgressFeedback({ snapshot }: { snapshot: Snapshot | null }) {
  const previous = useRef(snapshot?.player);
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    const p = snapshot?.player;
    const before = previous.current;
    previous.current = p;
    if (!p || !before || p.id !== before.id) { setNotice(null); return; }
    if (p.version <= before.version) return;
    const breakthrough = p.realm > before.realm;
    const parts = ([['cultivation', 'tu vi'], ['stones', 'linh thạch'], ['tickets', 'vé cơ duyên'], ['jade', 'tiên ngọc']] as const)
      .flatMap(([key, label]) => p[key] > before[key] ? [`+${(p[key] - before[key]).toLocaleString('vi-VN')} ${label}`] : []);
    if (!breakthrough && !parts.length) return;
    const title = breakthrough ? `Đột phá · ${snapshot?.catalog.realms.find(realm => realm.id === p.realm)?.name}` : 'Đạo đồ đã cập nhật';
    setNotice({ id: p.version, title, detail: parts.join(' · ') || 'Đạo cơ vững vàng. Một cảnh giới mới đã mở.', breakthrough });
  }, [snapshot]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.breakthrough ? 8000 : 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return <aside key={notice.id} className={`progress-feedback ${notice.breakthrough ? 'realm-awakening' : ''}`} role="status" aria-live="polite"><div className="feedback-radiance" aria-hidden="true" /><Sparkles size={notice.breakthrough ? 38 : 24} aria-hidden="true" /><div><span className="eyebrow">MÁY CHỦ ĐÃ XÁC NHẬN</span><h2>{notice.title}</h2><p>{notice.detail}</p></div><button className="icon-button" onClick={() => setNotice(null)} aria-label="Đóng thông báo tiến trình"><X size={18} /></button></aside>;
}
