"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Compass, Flame, Sparkles, Swords } from "lucide-react";
import type { GameProps } from "../types";
import InkScene from "../InkScene";

const number = (value: number) => value.toLocaleString("vi-VN");
const time = (seconds: number) => seconds >= 3600 ? `${Math.floor(seconds / 3600)} giờ ${Math.floor(seconds / 60) % 60} phút` : `${Math.floor(seconds / 60)} phút ${seconds % 60} giây`;

export default function Home({ snapshot, act, busy, navigate }: GameProps & { navigate?: (tab: string) => void }) {
 const [elapsed, setElapsed] = useState(0);
 const [still, setStill] = useState(false);
 const [breakthrough, setBreakthrough] = useState(false);
 const oldRealm = useRef(snapshot.player?.realm);
 useEffect(() => {
  const start = Date.now(); setElapsed(0);
  const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
  return () => window.clearInterval(timer);
 }, [snapshot.server_time]);
 useEffect(() => {
  if (oldRealm.current !== undefined && snapshot.player && snapshot.player.realm > oldRealm.current) setBreakthrough(true);
  oldRealm.current = snapshot.player?.realm;
 }, [snapshot.player?.realm]);
 const p = snapshot.player;
 if (!p) return null;
 const realm = snapshot.catalog.realms.find(item => item.id === p.realm)!;
 const next = snapshot.catalog.realms.find(item => item.id === p.realm + 1);
 const path = snapshot.catalog.paths.find(item => item.id === p.path);
 const seconds = Math.min(86400, Math.max(0, snapshot.offline_seconds + elapsed));
 const pending = Math.floor((seconds * realm.rate + (p.flags["claim:cultivation-remainder"] ?? 0)) / 3600);
 const total = p.cultivation + pending;
 const progress = next ? Math.min(100, total / next.required * 100) : 100;
 const ready = !!next && total >= next.required;
 const expedition = p.expedition;
 const site = snapshot.catalog.expeditions.find(item => item.id === expedition?.site_id);
 const expeditionSeconds = site ? Math.min(site.cap_seconds, snapshot.expedition_seconds + elapsed) : 0;
 const cycles = site ? Math.floor(expeditionSeconds / site.interval_seconds) : 0;
 const go = (tab: string) => { if (navigate) navigate(tab); else window.location.hash = tab; };
 const perform = async (type: string) => { try { await act(type); } catch { /* Authoritative errors and receipt recovery remain in Shell. */ } };
 const openedSite = snapshot.catalog.expeditions.find(item => item.realm <= p.realm && p.flags[`combat:first-win:${item.boss_id}`]);
 const nextBoss = snapshot.catalog.bosses.find(boss => !boss.guild && boss.realm <= p.realm && !p.flags[`combat:first-win:${boss.id}`]);
 return <div className="game-view cultivation-home">
  <header className="idle-page-heading"><div><p className="eyebrow">THANH VÂN SƠN · MỘT NIỆM TRƯỜNG SINH</p><h1>Động phủ</h1></div><span className="idle-realm-seal">{realm.name}</span></header>
  <div className="cultivation-layout">
   <section className={`cultivation-sanctuary ${breakthrough ? "has-breakthrough" : ""}`} aria-label="Động phủ tu luyện">
    <div className="sanctuary-title"><span className="idle-running"><i />Đang tĩnh tu</span><h2>{p.name}</h2><p>{path?.name} · {realm.name}</p></div>
    <InkScene mode="cultivation" region="thanh-van" heroPath={p.path} paused={still} />
    <div className="sanctuary-inscription" aria-hidden="true">Tĩnh tâm dưỡng khí<br />Thuận đạo tự nhiên</div>
    <button className="sanctuary-motion" aria-pressed={still} onClick={() => setStill(value => !value)}>{still ? "Bật chuyển động" : "Tĩnh cảnh"}</button>
    <div className="sanctuary-cultivation">
     <div className="idle-section-heading"><span>Tu vi · {next ? `Hướng tới ${next.name}` : "Đỉnh cảnh giới"}</span><strong>{Math.floor(progress)}%</strong></div>
     <div className="cultivation-total">{number(total)}<small>{next ? `/ ${number(next.required)}` : "tu vi"}</small></div>
     <progress value={progress} max={100} aria-label="Tiến độ tu luyện gồm phần đang tích lũy" />
     <div className="cultivation-accrual"><span>+{number(pending)} đang tích lũy</span><span>{number(realm.rate)} tu vi/giờ</span></div>
     <div className="cultivation-primary-actions"><button className="button secondary" disabled={busy || seconds < 60} onClick={() => void perform("cultivation.claim")}><Sparkles size={17} />{seconds < 60 ? `Tụ khí · ${60 - seconds}s` : "Thu nạp linh khí"}</button>{next && <button className={`button primary ${ready ? "breakthrough-ready" : ""}`} disabled={busy || !ready} onClick={() => void perform("cultivation.breakthrough")}><Flame size={17} />{ready ? `Đột phá · ${next.name}` : "Chưa đủ tu vi"}</button>}</div>
     <p className="idle-fine-print">{seconds >= 86400 ? "Linh khí đã đầy 24 giờ. Thu nạp để tiếp tục tích lũy." : `Đã tĩnh tu ${time(seconds)} · tích lũy cả khi rời game, tối đa 24 giờ.`} Tu vi chờ nhận là ước tính; máy chủ chốt khi thu nạp hoặc đột phá.</p>
    </div>
    {breakthrough && <div className="breakthrough-message" role="status"><span>ĐẠO CƠ ĐÃ THÀNH</span><h2>{realm.name}</h2><p>Cảnh giới mới, thêm 4 điểm tiềm năng và tốc độ tu luyện mới.</p><button className="button primary" onClick={() => { setBreakthrough(false); go("combat"); }}>Chuẩn bị hành trình mới <ArrowRight size={16} /></button><button className="text-button" onClick={() => setBreakthrough(false)}>Tiếp tục tĩnh tu</button></div>}
   </section>
   <aside className="cultivation-companion">
    <section className="idle-paper-panel"><p className="eyebrow">BÍ CẢNH · LUYỆN CÔNG</p><h2>{site ? site.name : openedSite ? "Bí cảnh đã mở, lên đường thôi" : "Ngoài kia, tiên lộ đang chờ"}</h2>{site && expedition ? <><span className="idle-running"><i />Đang lịch luyện</span><p>{cycles > 0 ? `${cycles} chu kỳ đã đủ thời gian quyết toán.` : `Chu kỳ tiếp theo sau ${time(site.interval_seconds - expeditionSeconds % site.interval_seconds)}.`}</p><p className="muted">{expedition.victories} trận thắng · {expedition.defeats} lần lui bước. Tu luyện tại động phủ vẫn tiếp tục.</p><button className="button primary" disabled={busy || cycles === 0} onClick={() => void perform("combat.harvest")}>Thu hoạch bí cảnh</button><button className="text-button" onClick={() => go("combat")}>Xem bí cảnh <ArrowRight size={15} /></button></> : <><p>{openedSite ? `${openedSite.name} đã mở. Chọn nơi luyện công để tự chiến đấu và thu nguyên liệu cả khi vắng mặt.` : "Vượt thủ lĩnh để mở nơi luyện công. Chuẩn bị công pháp, tích lũy tu vi và nguyên liệu trong lúc nghỉ."}</p><button className="button primary" onClick={() => go("combat")}><Swords size={17} />{openedSite ? "Chọn nơi luyện công" : nextBoss ? `Thử sức · ${nextBoss.name}` : "Khám phá bí cảnh"}</button></>}</section>
    <section className="idle-paper-panel idle-route"><p className="eyebrow">ĐƯỜNG TU CỦA BẠN</p><ol><li><span>壹</span><div><strong>Tĩnh tu dưỡng khí</strong><p>{next ? `Còn ${number(Math.max(0, next.required - total))} tu vi tới ${next.name}.` : "Đã chạm cảnh giới cao nhất hiện có."}</p></div></li><li><span>貳</span><div><strong>Rèn công pháp, luyện pháp bảo</strong><p>Sắp thứ tự chiêu, phân tiềm năng và cường hóa bằng nguyên liệu.</p></div></li><li><span>叁</span><div><strong>Trấn thủ bí cảnh</strong><p>Vượt cửa ải, mở nơi luyện công mới; trở về thu hoạch.</p></div></li></ol></section>
    <div className="idle-home-links"><button onClick={() => go("adventure")}><Compass size={19} /><span><strong>Giang hồ hữu duyên</strong><small>{p.encounter?.title ?? "Gặp gỡ, lựa chọn và truyền thừa"}</small></span><ArrowRight size={16} /></button><button onClick={() => go("collection")}><BookOpen size={19} /><span><strong>Đạo đồ & hành trang</strong><small>{p.history.at(-1)?.title ?? "Ghi lại một đời tu hành"}</small></span><ArrowRight size={16} /></button></div>
   </aside>
  </div>
 </div>;
}
