"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { APIError, request } from "@/game/api";
import { LANTERN_NAMES, renderCard } from "./card";
import { countdown, pickFortune, seasonAt, type Fortune } from "./season";
import "./lantern.css";

// Thả Thiên Đăng: everyone's wish lanterns drift up one shared painted sky. Releasing one
// reveals a joke fortune and a card to save or share. Identity is the Đạo Tràng đạo tịch
// (same localStorage keys), so a visitor who later sits in the sect keeps one disciple.

type Lantern = { id: number; name: string; wish: string; style: number; blessings: number };

const TOKEN_KEY = "dt:token";
const NAME_KEY = "dt:name";
const MINE_KEY = "td:mine";
const BLESSED_KEY = "td:blessed";
const POLL_MS = 20_000;
const WISH_MAX = 80;
const NAME_MAX = 16;
/** Below this many real lanterns the sky gets unnamed decorative ones so it never looks empty. */
const MIN_SKY = 16;
const PARTICLES = 26;

function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* private mode */ }
}
function loadIds(key: string): Set<number> {
  try { return new Set((JSON.parse(load(key) ?? "[]") as unknown[]).filter((v): v is number => typeof v === "number")); } catch { return new Set(); }
}
function saveIds(key: string, ids: Set<number>): void {
  save(key, JSON.stringify([...ids].slice(-200)));
}

function parseLantern(v: unknown): Lantern | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "number" || typeof o.name !== "string" || typeof o.wish !== "string") return null;
  return { id: o.id, name: o.name, wish: o.wish, style: typeof o.style === "number" ? o.style : 0, blessings: typeof o.blessings === "number" ? o.blessings : 0 };
}

/** Deterministic 0..1 sequence per lantern id, so a lantern keeps its path across polls. */
function seeded(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function flightStyle(id: number, launching: boolean): CSSProperties {
  const r = seeded(id + 7);
  const dur = 42 + r() * 36;
  const size = 0.6 + r() * 0.6;
  return {
    "--x": launching ? "50%" : `${5 + r() * 90}%`,
    "--dur": `${launching ? 22 : dur}s`,
    "--delay": launching ? "0s" : `${-r() * dur}s`,
    "--size": String(launching ? 1.5 : size),
    "--sway": `${3.5 + r() * 3}s`,
    "--drift": `${(r() - 0.5) * 18}vw`,
    "--depth": String(0.55 + size * 0.4),
  } as CSSProperties;
}

async function ensureToken(name: string): Promise<string> {
  const existing = load(TOKEN_KEY);
  if (existing) return existing;
  const out = await request<{ token?: unknown }>("/room/disciple", { method: "POST", body: JSON.stringify({ name, look: 0 }) });
  if (typeof out.token !== "string" || !out.token) throw new Error("bad disciple response");
  save(TOKEN_KEY, out.token);
  return out.token;
}

/** Runs a token-bearing call; a token the server no longer knows is replaced once. */
async function withToken<T>(name: string, call: (token: string) => Promise<T>): Promise<T> {
  try {
    return await call(await ensureToken(name));
  } catch (error) {
    if (error instanceof APIError && error.status === 409) {
      save(TOKEN_KEY, null);
      return call(await ensureToken(name));
    }
    throw error;
  }
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof APIError && error.message ? error.message : fallback;
}

export default function LanternSky() {
  const season = useMemo(() => seasonAt(Date.now(), new URLSearchParams(location.search).get("mua")), []);
  const [lanterns, setLanterns] = useState<Lantern[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [mine, setMine] = useState<Set<number>>(() => loadIds(MINE_KEY));
  const [blessed, setBlessed] = useState<Set<number>>(() => loadIds(BLESSED_KEY));
  const [launchId, setLaunchId] = useState<number | null>(null);
  const [reading, setReading] = useState<Lantern | null>(null);
  const [reportArmed, setReportArmed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [result, setResult] = useState<{ lantern: Lantern; fortune: Fortune } | null>(null);
  const [name, setName] = useState(() => load(NAME_KEY) ?? "");
  const [wish, setWish] = useState("");
  const [style, setStyle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number | null>(null);
  const mineRef = useRef(mine);
  mineRef.current = mine;

  const flash = useCallback((text: string) => {
    setNote(text);
    if (noteTimer.current) window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 3200);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const out = await request<{ lanterns?: unknown }>("/room/lanterns");
      const list = Array.isArray(out.lanterns) ? out.lanterns.map(parseLantern).filter((l): l is Lantern => l !== null) : [];
      setLanterns(prev => {
        // Keep a just-released lantern even if the poll raced ahead of it.
        const ids = new Set(list.map(l => l.id));
        return [...prev.filter(l => mineRef.current.has(l.id) && !ids.has(l.id)), ...list];
      });
    } catch { /* keep the current sky; the next poll retries */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => { if (!document.hidden) void refresh(); }, POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { window.clearInterval(poll); window.clearInterval(tick); };
  }, [refresh]);

  const release = useCallback(async () => {
    const trimmed = wish.trim();
    if (!trimmed) { setError("Hãy viết một điều ước."); return; }
    setBusy(true);
    setError(null);
    const display = name.trim();
    if (display) save(NAME_KEY, display);
    try {
      const out = await withToken(display, token => request<{ lantern?: unknown }>("/room/lanterns", {
        method: "POST", body: JSON.stringify({ token, name: display, wish: trimmed, style }),
      }));
      const l = parseLantern(out.lantern);
      if (!l) throw new Error("bad lantern response");
      const nextMine = new Set(mine).add(l.id);
      saveIds(MINE_KEY, nextMine);
      setMine(nextMine);
      setLanterns(prev => [l, ...prev.filter(x => x.id !== l.id)]);
      setLaunchId(l.id);
      setComposing(false);
      setWish("");
      window.setTimeout(() => setResult({ lantern: l, fortune: pickFortune(season) }), 2400);
    } catch (e) {
      setError(errorText(e, "Đèn chưa bay lên được. Hãy thử lại."));
    } finally {
      setBusy(false);
    }
  }, [wish, name, style, mine, season]);

  const bless = useCallback(async (l: Lantern) => {
    try {
      const out = await withToken(name.trim(), token => request<{ blessings?: unknown }>(`/room/lanterns/${l.id}/bless`, {
        method: "POST", body: JSON.stringify({ token }),
      }));
      const n = typeof out.blessings === "number" ? out.blessings : l.blessings;
      const next = new Set(blessed).add(l.id);
      saveIds(BLESSED_KEY, next);
      setBlessed(next);
      setLanterns(prev => prev.map(x => (x.id === l.id ? { ...x, blessings: n } : x)));
      setReading(r => (r && r.id === l.id ? { ...r, blessings: n } : r));
    } catch (e) {
      flash(errorText(e, "Chưa gửi được lời chúc."));
    }
  }, [name, blessed, flash]);

  const report = useCallback(async (l: Lantern) => {
    try {
      const out = await withToken(name.trim(), token => request<{ hidden?: unknown }>(`/room/lanterns/${l.id}/report`, {
        method: "POST", body: JSON.stringify({ token }),
      }));
      if (out.hidden === true) setLanterns(prev => prev.filter(x => x.id !== l.id));
      setReading(null);
      flash("Đã báo cáo. Cảm ơn đạo hữu giữ bầu trời trong lành.");
    } catch (e) {
      flash(errorText(e, "Chưa gửi được báo cáo."));
    }
  }, [name, flash]);

  const shareCard = useCallback(async (mode: "save" | "share") => {
    if (!result) return;
    try {
      const blob = await renderCard(season, result.lantern.name, result.lantern.wish, result.lantern.style, result.fortune);
      const file = new File([blob], "thien-dang.png", { type: "image/png" });
      if (mode === "share" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Thiên Đăng của tôi", text: `Mình vừa thả đèn ước nguyện: ${location.origin}/tha-den` });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "thien-dang.png";
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // the share sheet was dismissed
      flash("Chưa tạo được thẻ ảnh.");
    }
  }, [result, season, flash]);

  const canShareFiles = typeof navigator !== "undefined" && typeof navigator.canShare === "function";
  const left = season.target ? countdown(season.target, now) : null;
  const decor = Math.max(0, MIN_SKY - lanterns.length);
  const particles = useMemo(() => Array.from({ length: PARTICLES }, (_, i) => {
    const r = seeded(i + 101);
    return { left: r() * 100, dur: 9 + r() * 10, delay: -r() * 18, size: 0.5 + r() * 0.9 };
  }), []);

  return (
    <main className={`ld-root ld-season--${season.id}`} id="main-content">
      <div className="ld-sky" style={{ backgroundImage: `url(${season.sky})` }} aria-hidden="true" />
      <div className="ld-shade" aria-hidden="true" />

      <div className="ld-particles" aria-hidden="true">
        {particles.map((p, i) => (
          <span key={i} style={{ left: `${p.left}%`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, scale: String(p.size) }} />
        ))}
      </div>

      <div className="ld-lanterns">
        {Array.from({ length: decor }, (_, i) => (
          <span key={`d${i}`} className={`ld-lantern ld-lantern--decor ld-style-${i % 4}`} style={flightStyle(-1 - i, false)} aria-hidden="true">
            <span className="ld-sway"><span className="ld-paper" /></span>
          </span>
        ))}
        {lanterns.map(l => (
          <button
            key={l.id} type="button"
            className={`ld-lantern ld-style-${l.style}${mine.has(l.id) ? " is-mine" : ""}${launchId === l.id ? " is-launch" : ""}`}
            style={flightStyle(l.id, launchId === l.id)}
            aria-label={`Đèn của ${l.name}: ${l.wish}`}
            onClick={() => { setReading(l); setReportArmed(false); }}
          >
            <span className="ld-sway"><span className="ld-paper" /></span>
          </button>
        ))}
      </div>

      <header className="ld-head">
        <p className="ld-eyebrow">{season.eyebrow}</p>
        <h1 className="ld-title">{season.title}</h1>
        {season.target && (
          <p className="ld-count">{left ? <><b>{left}</b> {season.targetLabel}</> : <b>{season.arrived}</b>}</p>
        )}
        <p className="ld-sub">
          {loaded ? (lanterns.length > 0 ? `🏮 ${lanterns.length.toLocaleString("vi-VN")} ngọn đèn ước nguyện đang bay · chạm để đọc` : "Bầu trời còn trống. Hãy là người thả ngọn đèn đầu tiên!") : "Đang ngắm trời…"}
        </p>
      </header>

      <footer className="ld-foot">
        <button type="button" className="ld-btn ld-btn--jade" onClick={() => { setComposing(true); setError(null); }}>🏮 Thả đèn ước nguyện</button>
        <Link className="ld-link" href="/">Vào Đạo Tràng ngồi thiền cùng mọi người →</Link>
      </footer>

      {note && <div className="ld-note" role="status">{note}</div>}

      {reading && (
        <div className="ld-overlay" onClick={() => setReading(null)}>
          <div className="ld-panel" role="dialog" aria-label={`Đèn của ${reading.name}`} onClick={e => e.stopPropagation()}>
            <span className={`ld-mini ld-style-${reading.style}`} aria-hidden="true"><span className="ld-paper" /></span>
            <p className="ld-panel-eyebrow">{LANTERN_NAMES[reading.style] ?? LANTERN_NAMES[0]} của</p>
            <h2 className="ld-panel-title">{reading.name}{mine.has(reading.id) ? " (bạn)" : ""}</h2>
            <p className="ld-wish">“{reading.wish}”</p>
            <div className="ld-actions">
              <button type="button" className="ld-btn ld-btn--jade" disabled={blessed.has(reading.id)} onClick={() => void bless(reading)}>
                {blessed.has(reading.id) ? `Đã chúc phúc · ${reading.blessings}` : `🙏 Chúc phúc · ${reading.blessings}`}
              </button>
              <button type="button" className="ld-btn" onClick={() => setReading(null)}>Đóng</button>
            </div>
            {!mine.has(reading.id) && (
              <button type="button" className="ld-report" onClick={() => (reportArmed ? void report(reading) : setReportArmed(true))}>
                {reportArmed ? "Bấm lần nữa để báo cáo đèn này" : "Báo cáo nội dung xấu"}
              </button>
            )}
          </div>
        </div>
      )}

      {composing && (
        <div className="ld-overlay" onClick={() => !busy && setComposing(false)}>
          <form className="ld-panel" role="dialog" aria-label="Thả đèn ước nguyện" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); void release(); }}>
            <h2 className="ld-panel-title">Viết điều ước</h2>
            <p className="ld-panel-hint">Ai cũng đọc được lời ước của bạn. Không ghi số điện thoại hay link.</p>
            <label className="ld-field">
              <span>Ký tên</span>
              <input className="ld-input" value={name} maxLength={NAME_MAX} autoComplete="nickname" placeholder="Ví dụ: Thanh Vân Tử" onChange={e => setName(e.target.value)} />
            </label>
            <label className="ld-field">
              <span>Điều ước <small>{wish.length}/{WISH_MAX}</small></span>
              <textarea className="ld-input ld-textarea" value={wish} maxLength={WISH_MAX} rows={3} placeholder="Năm nay mình ước…" onChange={e => setWish(e.target.value)} autoFocus />
            </label>
            <div className="ld-ideas">
              {season.wishIdeas.map(w => <button key={w} type="button" className="ld-chip" onClick={() => setWish(w)}>{w}</button>)}
            </div>
            <div className="ld-field">
              <span>Màu đèn</span>
              <div className="ld-styles" role="radiogroup" aria-label="Màu đèn">
                {LANTERN_NAMES.map((n, i) => (
                  <button key={n} type="button" role="radio" aria-checked={style === i} className={`ld-style-pick ld-style-${i}`} onClick={() => setStyle(i)}>
                    <span className="ld-mini" aria-hidden="true"><span className="ld-paper" /></span>
                    <small>{n}</small>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="ld-error" role="alert">{error}</p>}
            <div className="ld-actions">
              <button type="submit" className="ld-btn ld-btn--jade" disabled={busy}>{busy ? "Đang châm lửa…" : "🔥 Thả đèn"}</button>
              <button type="button" className="ld-btn" disabled={busy} onClick={() => setComposing(false)}>Để sau</button>
            </div>
          </form>
        </div>
      )}

      {result && (
        <div className="ld-overlay" onClick={() => setResult(null)}>
          <div className="ld-panel ld-panel--fortune" role="dialog" aria-label="Quẻ Thiên Đăng" onClick={e => e.stopPropagation()}>
            <p className="ld-panel-eyebrow">Đèn của bạn đã bay lên · Thiên Đạo ban quẻ</p>
            <h2 className="ld-panel-title ld-rank">{result.fortune.rank}</h2>
            <p className="ld-fortune">{result.fortune.text}</p>
            <div className="ld-actions">
              {canShareFiles && <button type="button" className="ld-btn ld-btn--jade" onClick={() => void shareCard("share")}>📤 Chia sẻ thẻ</button>}
              <button type="button" className={canShareFiles ? "ld-btn" : "ld-btn ld-btn--jade"} onClick={() => void shareCard("save")}>📸 Lưu thẻ ảnh</button>
              <button type="button" className="ld-btn" onClick={() => setResult(null)}>Ngắm trời đèn</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
