"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { request } from "./api";
import type { User } from "./types";

type Session = { access_token: string; user: User };
export default function Auth({ onSession, admin }: { onSession: (session: Session) => Promise<void>; admin: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    const form = new FormData(event.currentTarget);
    locked.current = true; setBusy(true); setError("");
    try {
      const payload = { email: String(form.get("email") ?? "").trim(), password: String(form.get("password") ?? ""), ...(mode === "register" ? { username: String(form.get("username") ?? "").trim() } : {}) };
      const session = await request<Session>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      await onSession(session);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Chưa thể đăng nhập. Hãy thử lại."); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="auth-card"><div className="auth-card-heading"><span className="eyebrow">{admin ? "LỐI VÀO QUẢN TRỊ" : "MỘT DUYÊN KHỞI MỚI"}</span><h2>{mode === "login" ? "Trở về giang hồ" : "Bắt đầu một đời mới"}</h2><p className="muted">{mode === "login" ? "Ngọn đèn động phủ vẫn đợi bạn trở về." : "Một tài khoản. Một đạo đồ do chính bạn viết."}</p></div><div className="tabs auth-tabs" aria-label="Tài khoản"><button className={`tab ${mode === "login" ? "active" : ""}`} disabled={busy} aria-pressed={mode === "login"} onClick={() => { setMode("login"); setError(""); }}>Đăng nhập</button><button className={`tab ${mode === "register" ? "active" : ""}`} disabled={busy} aria-pressed={mode === "register"} onClick={() => { setMode("register"); setError(""); }}>Đăng ký</button></div><form className="stack" onSubmit={submit}>{mode === "register" && <label className="field">Tên tài khoản<input name="username" autoComplete="username" required minLength={3} maxLength={40} placeholder="Tên để nhận ra bạn" disabled={busy} /></label>}<label className="field">Email<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="ban@example.com" disabled={busy} /></label><label className="field">Mật khẩu<span className="password-field"><input name="password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 8 : 1} maxLength={72} placeholder={mode === "register" ? "Ít nhất 8 ký tự" : "Mật khẩu của bạn"} disabled={busy} /><button type="button" className="icon-button" onClick={() => setVisible(!visible)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>{error && <p className="error" role="alert">{error}</p>}<button className="button primary auth-submit" disabled={busy} type="submit">{busy ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18} />}{busy ? "Đang kết nối…" : mode === "login" ? "Vào giang hồ" : "Khai mở đạo đồ"}</button></form><div className="auth-footnote"><LockKeyhole size={15} /><span>Phiên bảo mật. Không lưu mật khẩu trên thiết bị.</span></div><p className="auth-fair"><ShieldCheck size={15} /> Không mua chiến thắng. Không mất tiến trình khi nghỉ.</p></section>;
}
