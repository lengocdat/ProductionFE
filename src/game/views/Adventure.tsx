"use client";

import { useEffect, useState } from "react";
import type { GameProps, NPC } from "../types";

const gifts: Record<string, string> = { herb: "Dược thảo", tea: "Trà núi", ore: "Quặng tốt", paper: "Giấy tuyên", silk: "Lụa", wood: "Gỗ thơm" };
const bonds = [{ id: "companion", label: "Đồng hành" }, { id: "confidant", label: "Tri kỷ" }, { id: "partner", label: "Đạo lữ" }, { id: "rival", label: "Đối thủ đáng trọng" }];
const alignments = [{ id: "neutral", label: "Tự tại", text: "Giữ đường lui, xét từng việc, không trao lời thề cho một phe." }, { id: "righteous", label: "Chính Đạo", text: "Đặt lời hứa và việc bảo vệ người khác trước lợi ích riêng." }, { id: "demonic", label: "Ma Đạo", text: "Tự quyết, phá lệ và chịu trách nhiệm về phương cách của mình." }];

function Landscape({ region, color }: { region: string; color: string }) {
 return <svg viewBox="0 0 480 160" aria-hidden="true" focusable="false" style={{ display: "block", width: "100%", height: 130, color }}>
  <circle cx="367" cy="43" r="25" fill="currentColor" opacity=".28" />
  <path d="M0 145 73 59 120 109 207 19 293 115 362 65 480 141V160H0Z" fill="currentColor" opacity=".15" />
  <path d="M0 157 70 109 119 138 194 78 262 139 326 113 404 147 480 116V160Z" fill="currentColor" opacity=".32" />
  {region === "thanh-van" && <path d="M34 147Q166 107 270 146M102 127v-21h49v17m-61-17 38-24 39 24m-39-24V70" fill="none" stroke="currentColor" strokeWidth="3" />}
  {region === "van-truc" && <g stroke="currentColor" strokeWidth="3" fill="none"><path d="M55 150 61 31m-4 78-22-18m24-18 20-19m-19-7L45 37M96 150 87 47m4 39 25-17m-23 45-21-12M413 150 420 65m-4 39-21-15" /><path d="m52 57 15 1m-17 61 14 1m22-30 14-2m-8 43 14-2" /></g>}
  {region === "hac-phong" && <path d="m45 146 39-39 19 32 25-14 30 31m167-7 24-67 9 30 19-61 30 101M208 100q32-15 67-4m-104 19q40-17 86-7" fill="none" stroke="currentColor" strokeWidth="3" />}
  {region === "van-tuong" && <g fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 146h450M36 134h76v-29H36Zm17-29V79h41v26m-49-26 29-15 28 15m208 50h88v-21h-88m13-1V84h60v23m-68-23 39-19 38 19" /><path d="m185 148 37-32 37 32m-43-16v16m13-16v16" /></g>}
 </svg>;
}

function Portrait({ npc, index }: { npc: NPC; index: number }) {
 return <svg viewBox="0 0 100 110" aria-hidden="true" focusable="false" style={{ width: 76, height: 84, color: npc.color, flexShrink: 0 }}>
  <circle cx="50" cy="48" r="40" fill="currentColor" opacity=".12" />
  <path d={index % 2 ? "M27 58V37Q28 12 50 16Q75 15 75 41L79 74 60 62H39L23 75Z" : "M28 60V37Q31 18 51 20Q74 21 73 42V63L61 69H37Z"} fill="currentColor" opacity=".65" />
  <ellipse cx="50" cy="45" rx="15" ry="21" fill="currentColor" opacity=".36" />
  <path d="M13 108q1-32 25-39l12 16 12-16q25 7 25 39M38 69l12 30 12-30" fill="none" stroke="currentColor" strokeWidth="3" />
  <path d="m38 39 7-1m10 0 7 1M45 56q5 3 10 0" stroke="currentColor" strokeWidth="2" fill="none" />
  {index % 3 === 0 && <path d="m33 26 37-9M50 16v-8" stroke="currentColor" strokeWidth="3" />}
 </svg>;
}

export default function Adventure({ snapshot, act, busy }: GameProps) {
 const [tab, setTab] = useState("regions");
 const [npcID, setNpcID] = useState("");
 const [clock, setClock] = useState(() => Date.parse(snapshot.server_time));
 useEffect(() => {
  const server = Date.parse(snapshot.server_time);
  const received = Date.now();
  setClock(server);
  const timer = window.setInterval(() => setClock(server + Date.now() - received), 1000);
  return () => window.clearInterval(timer);
 }, [snapshot.server_time]);
 const p = snapshot.player;
 if (!p) return null;
 const perform = async (type: string, payload: Record<string, unknown>) => { try { await act(type, payload); } catch { /* The shared shell presents the authoritative error and retry state. */ } };
 const remaining = (at: string, seconds: number) => Math.max(0, Math.ceil((Date.parse(at) + seconds * 1000 - clock) / 1000)) || 0;
 const exploreWait = remaining(p.last_adventure, 60);
 const npc = snapshot.catalog.npcs.find(item => item.id === npcID) ?? snapshot.catalog.npcs[0];
 const relation = npc ? p.relations[npc.id] : undefined;
 const stage = relation?.stage ?? 0;
 const scene = npc?.scenes[stage];
 const relationWait = relation ? remaining(relation.last_interaction, 60) : 0;
 const giftWait = npc ? Math.max(0, Math.ceil(((p.flags[`relation:gift:${npc.id}`] ?? 0) * 1000 + 86400000 - clock) / 1000)) : 0;
 const giftCount = npc ? (p.inventory[npc.gift] ?? 0) : 0;
 const arcComplete = !!npc && stage >= npc.scenes.length;
 const trust = relation?.trust ?? 0;
 const recent = p.history.filter(entry => entry.kind === "adventure" || entry.kind === "relation").sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0];
 const pending = Object.entries(p.flags).filter(([key, value]) => key.startsWith("adventure:due:") && value > 0 && !p.flags[`adventure:seen:${key.slice("adventure:due:".length)}`]);
 const nextDue = pending.length ? Math.min(...pending.map(([, value]) => value)) : 0;
 const pendingWait = Math.max(0, Math.ceil(nextDue - clock / 1000));
 return <div className="game-view stack">
  <header className="page-heading"><div><p className="eyebrow">Một bước, một nhân duyên</p><h1>Giang hồ</h1><p className="muted">Bốn miền đất. Bốn mươi câu chuyện. Người qua đường rồi cũng để lại dấu chân.</p></div><span className="badge">{p.stats.chains_completed ?? 0}/40 truyện đã khép</span></header>
  <div className="tabs" aria-label="Nội dung giang hồ"><button className={`tab ${tab === "regions" ? "active" : ""}`} aria-pressed={tab === "regions"} onClick={() => setTab("regions")}>Sơn hà & cơ duyên</button><button className={`tab ${tab === "people" ? "active" : ""}`} aria-pressed={tab === "people"} onClick={() => setTab("people")}>Người hữu duyên</button></div>
  {tab === "regions" ? <>
   {p.encounter && <section className="panel stack" aria-labelledby="encounter-title">
    <div className="section-heading"><span className="eyebrow">Cơ duyên đang gặp</span><span className="badge">{snapshot.catalog.regions.find(region => region.id === p.encounter?.region)?.name}</span></div>
    <h2 id="encounter-title">{p.encounter.title}</h2><p style={{ whiteSpace: "pre-line", lineHeight: 1.85 }}>{p.encounter.text}</p>
    <div className="stack">{p.encounter.choices.map(choice => <button key={choice.id} disabled={busy} className="button secondary" style={{ display: "block", textAlign: "left", whiteSpace: "normal" }} onClick={() => void perform("adventure.choose", { id: choice.id })}><strong>{choice.label}</strong><span className="muted" style={{ display: "block", marginTop: 6 }}>{choice.hint}</span></button>)}</div>
    <p className="muted">Quyết định được lưu vĩnh viễn. Hậu truyện mở sau 5 phút, không cần ở lại màn hình này.</p>
   </section>}
   {pending.length > 0 && <p className="notice">{pending.length} hậu truyện đang chờ. {pendingWait ? `Tin sớm nhất đến sau ${Math.floor(pendingWait / 60)} phút ${pendingWait % 60} giây.` : "Đã có tin mới; trở lại miền đất của câu chuyện để tiếp tục."} Bạn vẫn có thể khám phá chuyện khác.</p>}
   <div className="card-grid">{snapshot.catalog.regions.map(region => {
    const locked = p.realm < region.realm;
    const visited = p.stats[`region:${region.id}`] ?? 0;
    const complete = visited >= 30 && !p.encounter;
    return <article className="card stack" key={region.id}><Landscape region={region.id} color={region.color} /><div className="section-heading"><h2>{region.name}</h2><span className="badge">{visited}/30 cơ duyên</span></div><p className="muted">{region.description}</p><button className="button primary" disabled={busy || locked || !!p.encounter || exploreWait > 0 || complete} onClick={() => void perform("adventure.explore", { region: region.id })}>{locked ? `Mở ở ${snapshot.catalog.realms.find(realm => realm.id === region.realm)?.name ?? "cảnh giới cao hơn"}` : complete ? "Đã đi hết những câu chuyện" : p.encounter ? "Giải quyết cơ duyên trước" : exploreWait ? `Nghỉ chân · ${exploreWait}s` : "Lên đường"}</button></article>;
   })}</div>
   <section className="panel stack"><div><p className="eyebrow">Không phải thiện và ác</p><h2>Đạo tâm của bạn</h2><p className="muted">Lựa chọn trong truyện có thể đổi lập trường. Đổi lời nguyện không xóa quá khứ, không mất đồ và không khóa công pháp.</p></div><div className="card-grid">{alignments.map(alignment => <article className="card stack" key={alignment.id}><h3>{alignment.label}</h3><p className="muted">{alignment.text}</p><button className={`button ${p.alignment === alignment.id ? "primary" : "secondary"}`} disabled={busy || p.alignment === alignment.id || ((p.flags["adventure:alignment-at"] ?? 0) + 60) * 1000 > clock} onClick={() => void perform("alignment.choose", { id: alignment.id })}>{p.alignment === alignment.id ? "Đang giữ lời nguyện" : `Chọn ${alignment.label}`}</button></article>)}</div></section>
  </> : <>
   <p className="notice">Sáu người trưởng thành, sáu con đường riêng. Có thể hoàn thành mọi câu chuyện bằng trò chuyện; quà tặng không phải phí để được yêu mến. Không mất tình cảm khi nghỉ game.</p>
   <div className="card-grid">{snapshot.catalog.npcs.map((person, index) => <button key={person.id} className={`card button ${person.id === npc?.id ? "primary" : "secondary"}`} style={{ display: "flex", textAlign: "left", whiteSpace: "normal" }} aria-pressed={person.id === npc?.id} onClick={() => setNpcID(person.id)}><Portrait npc={person} index={index} /><span><strong>{person.name}</strong><span className="muted" style={{ display: "block" }}>{person.title}</span><span className="badge">{p.relations[person.id]?.stage ?? 0}/{person.scenes.length} chương</span></span></button>)}</div>
   {npc && <section className="panel stack" aria-labelledby="npc-title"><div><p className="eyebrow">{npc.title}</p><h2 id="npc-title">{npc.name}</h2><p>{npc.description}</p><p className="muted">{npc.personality}</p></div>
    <div className="stat-grid"><div className="stat"><span>Tin tưởng</span><strong>{trust}</strong></div><div className="stat"><span>Thân thiết</span><strong>{relation?.affection ?? 0}</strong></div><div className="stat"><span>Tôn trọng</span><strong>{relation?.respect ?? 0}</strong></div><div className="stat"><span>Quan hệ</span><strong>{bonds.find(bond => bond.id === relation?.bond)?.label ?? "Hữu duyên"}</strong></div></div>
    {scene ? <div className="card stack"><span className="eyebrow">Chương {stage + 1} / {npc.scenes.length}</span><h3>{scene.title}</h3><p style={{ whiteSpace: "pre-line", lineHeight: 1.85 }}>{scene.text}</p>{trust < scene.required_trust && <p className="notice">Cần {scene.required_trust} tin tưởng để nói tiếp.</p>}<div className="stack">{scene.choices.map(choice => <button key={choice.id} className="button secondary" style={{ whiteSpace: "normal", textAlign: "left" }} disabled={busy || relationWait > 0 || trust < scene.required_trust} onClick={() => void perform("relation.talk", { npc_id: npc.id, choice_id: choice.id })}>{choice.label}</button>)}</div></div> : <div className="success"><h3>Đã đi qua một đoạn đời cùng nhau</h3><p>Câu chuyện của {npc.name} đã khép. Lời bạn nói và những mối quan hệ đã chọn vẫn còn trong tiểu sử.</p></div>}
    {relationWait > 0 && <p className="muted">Để câu chuyện lắng lại · {relationWait}s trước lần tương tác tiếp.</p>}
    <div className="split-grid"><div className="card stack"><h3>Một món quà, không một món nợ</h3><p className="muted">{gifts[npc.gift] ?? npc.gift} tìm được từ lựa chọn cơ duyên. Mỗi người nhận tối đa một món trong 24 giờ, sau lần trò chuyện đầu.</p><span className="badge">Hành trang: {giftCount}</span><button className="button secondary" disabled={busy || stage < 1 || giftCount < 1 || relationWait > 0 || giftWait > 0} onClick={() => void perform("relation.gift", { npc_id: npc.id })}>{giftWait ? `Có thể tặng sau ${Math.ceil(giftWait / 3600)} giờ` : `Tặng 1 ${gifts[npc.gift] ?? npc.gift}`}</button></div>
    <div className="card stack"><h3>Gọi tên mối quan hệ</h3><p className="muted">Hoàn thành câu chuyện và đạt 60 tin tưởng. Tri kỷ, đạo lữ cần 30 thân thiết; đối thủ cần 30 tôn trọng. Được đổi quan hệ, không tốn tài nguyên.</p><div className="actions">{bonds.map(bond => {
     const enough = (bond.id === "confidant" || bond.id === "partner") ? (relation?.affection ?? 0) >= 30 : bond.id === "rival" ? (relation?.respect ?? 0) >= 30 : true;
     return <button key={bond.id} className={`button ${relation?.bond === bond.id ? "primary" : "secondary"}`} disabled={busy || !arcComplete || trust < 60 || !enough || relationWait > 0 || relation?.bond === bond.id} onClick={() => void perform("relation.bond", { npc_id: npc.id, bond: bond.id })}>{bond.label}</button>;
    })}</div></div></div>
   </section>}
  </>}
  {recent && <section className="panel stack" aria-live="polite"><p className="eyebrow">Dòng mực vừa khô</p><h2>{recent.title}</h2><p style={{ whiteSpace: "pre-line" }}>{recent.text}</p><time className="muted" dateTime={recent.at}>{new Date(recent.at).toLocaleString("vi-VN")}</time></section>}
 </div>;
}
