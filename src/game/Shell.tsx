"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Compass, Gem, Home as HomeIcon, LoaderCircle, LogOut, Menu, RefreshCw, ShieldCheck, ShoppingBag, Sparkles, Swords, Users, X } from "lucide-react";
import { APIError, request, restoreSession, setAccessToken } from "./api";
import type { Snapshot, User } from "./types";
import Auth from "./Auth";
import Home from "./views/Home";
import Adventure from "./views/Adventure";
import Combat from "./views/Combat";
import Social from "./views/Social";
import Collection from "./views/Collection";
import Commerce from "./views/Commerce";
import Admin from "./views/Admin";
import Onboarding from "./Onboarding";
import PWA from "./PWA";
import CosmeticArt from "./CosmeticArt";

const tabs = [
  { id: "home", label: "Động phủ", icon: HomeIcon, component: Home },
  { id: "adventure", label: "Giang hồ", icon: Compass, component: Adventure },
  { id: "combat", label: "Đấu pháp", icon: Swords, component: Combat },
  { id: "social", label: "Tông môn", icon: Users, component: Social },
  { id: "collection", label: "Đạo đồ", icon: BookOpen, component: Collection },
];
type PendingAction = { request_id: string; type: string; payload: Record<string, unknown> };
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Không thể hoàn tất thao tác. Vui lòng thử lại.";

function readPending(userID: number): PendingAction | null {
  const raw = localStorage.getItem(`caudao:pending:${userID}`);
  if (!raw) return null;
  const value = JSON.parse(raw) as Partial<PendingAction>;
  if (typeof value.request_id !== "string" || !/^[0-9a-f-]{36}$/i.test(value.request_id) ||
      typeof value.type !== "string" || !value.payload || typeof value.payload !== "object" || Array.isArray(value.payload)) {
    throw new Error("Bản ghi thao tác chưa rõ kết quả bị hỏng. Hãy liên hệ hỗ trợ trước khi gửi lại giao dịch.");
  }
  return value as PendingAction;
}

const recoveryMessage = "Có một thao tác chưa được xác nhận từ lần chơi trước. Hãy kiểm tra lại đúng yêu cầu trước khi tiếp tục.";

export default function Shell({ admin = false }: { admin?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [tab, setTab] = useState("home");
  const [menu, setMenu] = useState(false);
  const locked = useRef(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const session = await restoreSession();
      if (!alive.current) return;
      setUser(session.user);
      const state = await request<Snapshot>("/game/state");
      if (alive.current) {
        setSnapshot(state);
        const outstanding = readPending(session.user.id);
        setPending(outstanding);
        if (outstanding) setError(recoveryMessage);
      }
    } catch (failure) {
      if (!alive.current) return;
      if (failure instanceof APIError && failure.status === 401) { setUser(null); setSnapshot(null); }
      else setError(errorMessage(failure));
    } finally { if (alive.current) setLoading(false); }
  }, []);

  useEffect(() => {
    alive.current = true;
    void load();
    const expired = () => { setUser(null); setSnapshot(null); setPending(null); setError("Phiên đã hết hạn. Đăng nhập lại để tiếp tục hành trình."); };
    const readHash = () => { const key = window.location.hash.slice(1); if (tabs.some(item => item.id === key) || key === "commerce") setTab(key); };
    readHash();
    window.addEventListener("game:session-expired", expired);
    window.addEventListener("hashchange", readHash);
    return () => { alive.current = false; window.removeEventListener("game:session-expired", expired); window.removeEventListener("hashchange", readHash); };
  }, [load]);
  useEffect(() => {
    if (!user?.id) return;
    let current = true;
    const refresh = () => {
      void request<Snapshot>("/game/state").then(state => {
        if (current) setSnapshot(state);
      }).catch(failure => { if (current) setError(errorMessage(failure)); });
    };
    window.addEventListener("game:refresh", refresh);
    return () => { current = false; window.removeEventListener("game:refresh", refresh); };
  }, [user?.id]);


  const navigate = (id: string) => { setTab(id); setMenu(false); window.history.replaceState(null, "", `#${id}`); window.scrollTo({ top: 0, behavior: "instant" }); };
  const authenticate = async (session: { access_token: string; user: User }) => {
    setAccessToken(session.access_token); setUser(session.user); setError(""); setLoading(true);
    try {
      setSnapshot(await request<Snapshot>("/game/state"));
      const outstanding = readPending(session.user.id);
      setPending(outstanding);
      if (outstanding) setError(recoveryMessage);
    }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  };
  const execute = async (action: PendingAction) => {
    if (locked.current) throw new Error("Một thao tác khác đang được xử lý.");
    if (!user) throw new Error("Hãy đăng nhập trước khi tiếp tục.");
    const key = `caudao:pending:${user.id}`;
    locked.current = true; setBusy(true); setError("");
    let sent = false;
    let recovering = false;
    try {
      const outstanding = readPending(user.id);
      recovering = outstanding !== null;
      if (outstanding && outstanding.request_id !== action.request_id) {
        setPending(outstanding);
        throw new Error(recoveryMessage);
      }
      // Persist before sending. No credentials, balances or outcomes live here.
      // A browser crash or closed tab must not turn one intention into two.
      localStorage.setItem(key, JSON.stringify(action));
      sent = true;
      const result = await request<Snapshot>("/game/actions", { method: "POST", body: JSON.stringify(action) });
      localStorage.removeItem(key);
      setPending(null);
      setSnapshot(current => current?.player && result.player && current.player.version > result.player.version ? current : result);
      // Replayed receipts can predate another tab's actions. Fetch current state.
      if (outstanding) setSnapshot(await request<Snapshot>("/game/state"));
    } catch (failure) {
      setError(errorMessage(failure));
      if (sent) {
        if (failure instanceof APIError && !failure.ambiguous && failure.status >= 400 && failure.status < 500 &&
            !(recovering && [401, 403, 429].includes(failure.status))) {
          localStorage.removeItem(key);
          setPending(null);
        } else if (localStorage.getItem(key)) {
          setPending(action);
        }
      }
      throw failure;
    } finally { locked.current = false; setBusy(false); }
  };
  const act = async (type: string, payload: Record<string, unknown> = {}) => {
    if (!user) throw new Error("Hãy đăng nhập trước khi tiếp tục.");
    const outstanding = pending || readPending(user.id);
    if (outstanding) {
      setPending(outstanding); setError(recoveryMessage);
      throw new Error(recoveryMessage);
    }
    await execute({ request_id: crypto.randomUUID(), type, payload });
  };
  const logout = async () => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError("");
    try { await request("/auth/logout", { method: "POST" }); setAccessToken(null); setUser(null); setSnapshot(null); setPending(null); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { locked.current = false; setBusy(false); }
  };
  const alert = error && <div className="error shell-alert" role="alert"><div><strong>Chưa thể hoàn tất</strong><p>{error}</p>{pending && <p>Kết quả chưa xác định. Kiểm tra lại đúng mã yêu cầu sẽ không nhận thưởng hoặc trừ tài nguyên hai lần.</p>}</div>{pending ? <button className="button secondary" disabled={busy} onClick={() => void execute(pending).catch(() => {})}><RefreshCw size={16} /> Kiểm tra yêu cầu</button> : <button className="icon-button" onClick={() => setError("")} aria-label="Đóng thông báo"><X size={18} /></button>}</div>;

  if (loading) return <div className="loading-screen"><span className="brand-seal">道</span><LoaderCircle className="spin" size={24} /><h1>Đang mở đạo đồ</h1><p className="muted">Kết nối với thế giới của bạn…</p></div>;
  if (!user) return <><PWA /><main className="landing"><header className="landing-header"><Link href="/" className="brand"><span className="brand-seal">道</span><span>Cẩu Đạo Ký<small>Một đời tự tại</small></span></Link><span className="badge">Tu tiên nhàn nhã · Việt ngữ</span></header>{alert}<div className="landing-grid"><section className="landing-story"><p className="eyebrow"><span className="tiny-line" /> KHÔNG TRANH NHẤT THỜI</p><h1>Sống đủ lâu.<br />Viết nên <em>huyền thoại.</em></h1><p>Giang hồ rộng lớn, không chỉ có một con đường thành tiên. Tu luyện khi vắng mặt, kết giao người hữu duyên, giữ lấy đạo tâm của riêng mình.</p><div className="landing-values"><span><Compass size={18} /> Sơn hà có chuyện</span><span><Users size={18} /> Nhân duyên có thật</span><span><ShieldCheck size={18} /> Không bán sức mạnh</span></div><div className="landscape-caption"><span>THANH VÂN SƠN</span><span>Gió vẫn thổi. Đạo vẫn dài.</span></div></section><Auth onSession={authenticate} admin={admin} /></div><footer className="landing-footer"><span>Chơi thong thả. Dừng lại bất cứ lúc nào.</span><span>Tích lũy ngoại tuyến tối đa 24 giờ · Vật phẩm trả phí chỉ mang tính thẩm mỹ</span></footer>{error && !user && <button className="button secondary" onClick={() => void load()}><RefreshCw size={16} /> Kết nối lại</button>}</main></>;
  if (!snapshot) return <main className="loading-screen">{alert}<h1>Đạo đồ chưa được tải</h1><button className="button primary" onClick={() => void load()}>Thử kết nối lại</button><button className="button secondary" disabled={busy} onClick={() => void logout()}>Đăng xuất</button></main>;
  if (!snapshot.player) return <><PWA /><main className="onboarding-page"><Link href="/" className="brand"><span className="brand-seal">道</span>Cẩu Đạo Ký</Link>{alert}<Onboarding snapshot={snapshot} onCreated={setSnapshot} /><button className="button ghost" disabled={busy} onClick={() => void logout()}><LogOut size={16} /> Đổi tài khoản</button></main></>;
  const player = snapshot.player;
  const current = tabs.find(item => item.id === tab) ?? tabs[0];
  const View = admin ? Admin : tab === "commerce" ? Commerce : current.component;
  const gameProps = { snapshot, act, busy: busy || !!pending };
  return <><PWA /><div className="app-shell"><aside className={`sidebar ${menu ? "open" : ""}`}><Link href="/" className="brand"><span className="brand-seal">道</span><span>Cẩu Đạo Ký<small>MỘT ĐỜI TỰ TẠI</small></span></Link><p className="sidebar-caption">ĐẠO LỘ CỦA BẠN</p><nav aria-label="Điều hướng chính">{tabs.map(item => <Link href={admin ? `/#${item.id}` : `#${item.id}`} key={item.id} aria-current={!admin && tab === item.id ? "page" : undefined} className={`nav-link ${!admin && tab === item.id ? "active" : ""}`} onClick={event => { if (!admin) { event.preventDefault(); navigate(item.id); } }}><item.icon size={19} /><span>{item.label}</span>{item.id === "adventure" && player.encounter && <span className="nav-dot" />}</Link>)}</nav><div className="sidebar-bottom"><div className="quiet-note"><Sparkles size={17} /><p>Chậm một bước,<br /><strong>xa hơn một đời.</strong></p></div>{user.role === "ADMIN" && <Link className={`nav-link ${admin ? "active" : ""}`} href="/admin"><ShieldCheck size={18} /> Quản trị</Link>}<button className="nav-link" disabled={busy} onClick={() => void logout()}><LogOut size={18} /> Đăng xuất</button><span className="sidebar-version">CẨU ĐẠO KÝ · {snapshot.catalog.version}</span></div></aside>{menu && <button className="menu-scrim" onClick={() => setMenu(false)} aria-label="Đóng điều hướng" />}<div className="workspace"><header className="topbar"><div className="topbar-identity"><button className="icon-button mobile-menu" onClick={() => setMenu(!menu)} aria-label="Mở điều hướng" aria-expanded={menu}><Menu size={22} /></button><span className="avatar-mark cosmetic-avatar"><CosmeticArt id={player.equipped_cosmetic} catalog={snapshot.catalog} /></span><div><strong>{player.name}</strong><span className="muted">{snapshot.catalog.realms.find(realm => realm.id === player.realm)?.name} <span className="identity-divider">/</span> {snapshot.catalog.paths.find(path => path.id === player.path)?.name}</span></div></div><div className="wallet"><span title="Linh thạch"><span className="stone-icon" />{player.stones.toLocaleString("vi-VN")}<small>Linh thạch</small></span><span title="Tiên ngọc"><Gem size={17} />{player.jade.toLocaleString("vi-VN")}<small>Tiên ngọc</small></span><Link href={admin ? "/#commerce" : "#commerce"} className="shop-link" aria-label="Trân Bảo Các" onClick={event => { if (!admin) { event.preventDefault(); navigate("commerce"); } }}><ShoppingBag size={18} /><span>Trân Bảo Các</span></Link></div></header><main id="main-content" className="main-content">{alert}{snapshot.notice && <p className="notice">{snapshot.notice}</p>}{admin && <Link href="/" className="button ghost"><ArrowLeft size={16} /> Trở lại động phủ</Link>}{admin && user.role !== "ADMIN" ? <section className="empty panel"><ShieldCheck /><h1>Đường vào được bảo vệ</h1><p>Tài khoản này không có quyền quản trị.</p></section> : tab === "home" && !admin ? <Home {...gameProps} navigate={navigate} /> : <View {...gameProps} />}</main><footer className="game-footer"><span><span className="online-dot" /> Trạng thái do máy chủ xác thực</span><span>Nghỉ ngơi cũng là tu hành.</span></footer></div><nav className="bottom-nav" aria-label="Điều hướng di động">{tabs.map(item => <Link key={item.id} href={admin ? `/#${item.id}` : `#${item.id}`} aria-current={!admin && tab === item.id ? "page" : undefined} className={!admin && tab === item.id ? "active" : ""} onClick={event => { if (!admin) { event.preventDefault(); navigate(item.id); } }}><item.icon size={20} /><span>{item.label}</span></Link>)}</nav></div></>;
}
