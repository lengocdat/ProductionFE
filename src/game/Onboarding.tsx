"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Flame, Leaf, Shield, Sword } from "lucide-react";
import { request } from "./api";
import type { Snapshot } from "./types";
import { InkPortrait } from "./InkScene";
const pathIcons = { sword: Sword, body: Shield, spell: Flame, hidden: Leaf };
export default function Onboarding({ snapshot, onCreated }: { snapshot: Snapshot; onCreated: (snapshot: Snapshot) => void }) {
  const [path, setPath] = useState(snapshot.catalog.paths[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current) return;
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    locked.current = true; setBusy(true); setError("");
    try { onCreated(await request<Snapshot>("/game/character", { method: "POST", body: JSON.stringify({ name, path }) })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể khai mở đạo đồ."); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="onboarding-content stack"><header className="page-heading"><div><p className="eyebrow">TRANG ĐẦU TIÊN</p><h1>Đạo hữu, xưng hô thế nào?</h1><p className="muted">Chọn bước khởi đầu. Con đường về sau vẫn có thể thay đổi.</p></div><span className="badge">Không cần thanh toán</span></header><form onSubmit={submit} className="stack"><label className="field name-field">Đạo danh<input name="name" autoComplete="nickname" required minLength={2} maxLength={24} placeholder="Một cái tên để giang hồ nhớ" disabled={busy} /></label><fieldset className="path-fieldset"><legend>Chọn đạo lộ</legend><div className="path-grid">{snapshot.catalog.paths.map(item => { const Icon = pathIcons[item.id as keyof typeof pathIcons] ?? Leaf; return <label className={`path-option path-card ${path === item.id ? "selected" : ""}`} key={item.id}><input type="radio" name="path" value={item.id} checked={path === item.id} onChange={() => setPath(item.id)} disabled={busy} /><InkPortrait kind="hero" id={item.id} /><div className="section-heading"><Icon size={28} /><span className="path-check">{path === item.id && <Check size={15} />}</span></div><h2>{item.name}</h2><p className="muted">{item.description}</p></label>; })}</div></fieldset>{error && <p className="error" role="alert">{error}</p>}<div className="section-heading onboarding-actions"><p className="muted">Tĩnh tu tích lũy 24 giờ; bí cảnh luyện công tối đa 8 giờ.<br />Chuẩn bị công pháp, xuất hành rồi trở về thu hoạch.</p><button type="submit" className="button primary" disabled={busy || !path}>{busy ? "Đang mở đạo đồ…" : "Bước vào giang hồ"}<ArrowRight size={18} /></button></div></form></section>;
}
