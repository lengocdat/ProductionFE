"use client";

import { useEffect, useState } from "react";
import type { GameProps } from "../types";
import "./adventure-scene.css";
import InkScene, { InkPortrait } from "../InkScene";

const gifts: Record<string, string> = { herb: "Dược thảo", tea: "Trà núi", ore: "Quặng tốt", paper: "Giấy tuyên", silk: "Lụa", wood: "Gỗ thơm" };
const bonds = [{ id: "companion", label: "Đồng hành" }, { id: "confidant", label: "Tri kỷ" }, { id: "partner", label: "Đạo lữ" }, { id: "rival", label: "Đối thủ đáng trọng" }];
const alignments = [{ id: "neutral", label: "Tự tại", text: "Giữ đường lui, xét từng việc, không trao lời thề cho một phe." }, { id: "righteous", label: "Chính Đạo", text: "Đặt lời hứa và việc bảo vệ người khác trước lợi ích riêng." }, { id: "demonic", label: "Ma Đạo", text: "Tự quyết, phá lệ và chịu trách nhiệm về phương cách của mình." }];
const npcBackdrops: Record<string, string> = { "lan-chi": "thanh-van", "mac-ngon": "hac-phong", "tram-yen": "van-truc", "kha-phong": "hac-phong", "to-anh": "van-tuong", "bach-lien": "van-truc" };

export default function Adventure({ snapshot, act, busy }: GameProps) {
 const [tab, setTab] = useState("regions");
 const [regionID, setRegionID] = useState("");
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
 const region = snapshot.catalog.regions.find(item => item.id === regionID) ?? snapshot.catalog.regions[0];
 const regionLocked = !!region && p.realm < region.realm;
 const visited = region ? p.stats[`region:${region.id}`] ?? 0 : 0;
 const complete = visited >= 30 && !p.encounter;
 const encounterRegion = snapshot.catalog.regions.find(item => item.id === p.encounter?.region);
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
 const localPeople = snapshot.catalog.npcs.filter(person => npcBackdrops[person.id] === region?.id);
 const landmarks = [
  ...localPeople.map(person => ({ id: `npc:${person.id}`, label: person.name })),
  { id: "combat", label: "Bí cảnh & luyện công" },
 ];
 const visit = (id: string) => {
  if (id === "combat") { window.location.hash = "combat"; return; }
  if (id.startsWith("npc:")) { setNpcID(id.slice(4)); setTab("people"); window.scrollTo({ top: 0, behavior: "instant" }); }
 };
 return <div className="game-view adventure-view">
  <header className="page-heading adventure-heading"><div><p className="eyebrow">Một bước, một nhân duyên</p><h1>Giang hồ</h1><p className="muted">Bốn miền đất. Bốn mươi câu chuyện. Một hành trình của riêng bạn.</p></div><span className="badge">{p.stats.chains_completed ?? 0}/40 truyện đã khép</span></header>
  <div className="adventure-tabs" aria-label="Nội dung giang hồ">
   <button aria-pressed={tab === "regions"} onClick={() => setTab("regions")}><span>01</span> Sơn hà & cơ duyên</button>
   <button aria-pressed={tab === "people"} onClick={() => setTab("people")}><span>02</span> Người hữu duyên</button>
  </div>
  {tab === "regions" ? <>
   {p.encounter && <section className="adventure-encounter" aria-labelledby="encounter-title">
    <div className="adventure-encounter-art" key={p.encounter.region}>
     <InkScene mode="journey" region={p.encounter.region} heroPath={p.path} paused />
     <div className="adventure-mist" aria-hidden="true" />
     <div className="adventure-art-caption"><span className="adventure-kicker">Cơ duyên đang gặp</span><strong>{encounterRegion?.name}</strong><span>Dừng chân. Lắng nghe. Rồi lựa chọn.</span></div>
    </div>
    <div className="adventure-dialogue">
     <p className="eyebrow">Một ngã rẽ trong hành trình</p><h2 id="encounter-title">{p.encounter.title}</h2>
     <p className="adventure-prose">{p.encounter.text}</p>
     <div className="adventure-choices">{p.encounter.choices.map((choice, index) => <button key={choice.id} disabled={busy} className="adventure-choice" onClick={() => void perform("adventure.choose", { id: choice.id })}><span className="adventure-choice-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span><strong>{choice.label}</strong><small>{choice.hint}</small></span><span aria-hidden="true">↗</span></button>)}</div>
     <p className="adventure-footnote">Quyết định được lưu vĩnh viễn. Hậu truyện mở sau 5 phút, không cần ở lại màn hình này.</p>
    </div>
   </section>}
   {pending.length > 0 && <p className="adventure-notice"><strong>{pending.length} hậu truyện đang chờ.</strong> {pendingWait ? `Tin sớm nhất đến sau ${Math.floor(pendingWait / 60)} phút ${pendingWait % 60} giây.` : "Đã có tin mới; trở lại miền đất của câu chuyện để tiếp tục."} Bạn vẫn có thể khám phá chuyện khác.</p>}
   {region && <section className="adventure-atlas" aria-labelledby="adventure-region-title">
    <div className="adventure-world-scene">
     <InkScene mode="journey" region={region.id} heroPath={p.path} />
     <div className="adventure-atlas-top"><span className="adventure-kicker">Sơn hà đồ · {String(snapshot.catalog.regions.indexOf(region) + 1).padStart(2, "0")} / 04</span><span className="adventure-scene-badge">{regionLocked ? "Chưa đủ cảnh giới" : complete ? "Đã khép hành trình" : "Miền đất đã mở"}</span></div>
     <div className="adventure-destination">
      <div><p className="adventure-kicker">Đang xem miền đất</p><h2 id="adventure-region-title">{region.name}</h2><p>{region.description}</p></div>
      <div className="adventure-departure"><span>{visited}/30 cơ duyên</span><progress aria-label={`Cơ duyên tại ${region.name}`} value={Math.min(visited, 30)} max={30} /><button className="button primary" disabled={busy || regionLocked || !!p.encounter || exploreWait > 0 || complete} onClick={() => void perform("adventure.explore", { region: region.id })}>{regionLocked ? `Mở ở ${snapshot.catalog.realms.find(realm => realm.id === region.realm)?.name ?? "cảnh giới cao hơn"}` : complete ? "Đã đi hết những câu chuyện" : p.encounter ? "Giải quyết cơ duyên trước" : exploreWait ? `Nghỉ chân · ${exploreWait}s` : "Lên đường →"}</button></div>
     </div>
    </div>
    <div className="adventure-region-picker" aria-label="Chọn miền đất để xem">{snapshot.catalog.regions.map((item, index) => {
     const locked = p.realm < item.realm;
     const count = p.stats[`region:${item.id}`] ?? 0;
     return <button className={`adventure-region${locked ? " adventure-region-locked" : ""}`} key={item.id} aria-pressed={item.id === region.id} onClick={() => setRegionID(item.id)}>
      <span className="adventure-region-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span className="adventure-region-label"><strong>{item.name}</strong><small>{locked ? `Mở ở ${snapshot.catalog.realms.find(realm => realm.id === item.realm)?.name ?? "cảnh giới cao hơn"}` : `${count}/30 cơ duyên`}</small></span><span className="adventure-region-marker">{item.id === region.id ? "Đang xem" : locked ? "Chưa mở" : "Xem miền"}</span>
     </button>;
    })}</div>
    <p className="adventure-map-note">Chọn miền đất để ngắm cảnh; “Lên đường” mở một cơ duyên. Người hữu duyên ở đây:</p>
    <div className="actions adventure-map-actions" aria-label="Gặp người hữu duyên">{landmarks.map(landmark => <button className="button secondary" key={landmark.id} onClick={() => visit(landmark.id)}>{landmark.label}</button>)}</div>
   </section>}
   <section className="adventure-oath" aria-labelledby="adventure-oath-title"><div><p className="eyebrow">Không phải thiện và ác</p><h2 id="adventure-oath-title">Đạo tâm của bạn</h2><p className="muted">Lựa chọn trong truyện có thể đổi lập trường. Đổi lời nguyện không xóa quá khứ, không mất đồ và không khóa công pháp.</p></div><div className="adventure-oath-options">{alignments.map(alignment => <article key={alignment.id}><h3>{alignment.label}</h3><p>{alignment.text}</p><button className={`button ${p.alignment === alignment.id ? "primary" : "secondary"}`} disabled={busy || p.alignment === alignment.id || ((p.flags["adventure:alignment-at"] ?? 0) + 60) * 1000 > clock} onClick={() => void perform("alignment.choose", { id: alignment.id })}>{p.alignment === alignment.id ? "Đang giữ lời nguyện" : `Chọn ${alignment.label}`}</button></article>)}</div></section>
  </> : <>
   <p className="adventure-notice">Sáu người trưởng thành, sáu con đường riêng. Có thể hoàn thành mọi câu chuyện bằng trò chuyện; quà tặng không phải phí để được yêu mến. Không mất tình cảm khi nghỉ game.</p>
   <div className="adventure-cast" aria-label="Chọn người trò chuyện">{snapshot.catalog.npcs.map(person => <button key={person.id} className="adventure-cast-member" aria-pressed={person.id === npc?.id} onClick={() => setNpcID(person.id)}><InkPortrait kind="npc" id={person.id} /><span><strong>{person.name}</strong><small>{person.title}</small><span className="adventure-cast-chapter">{p.relations[person.id]?.stage ?? 0}/{person.scenes.length} chương</span></span></button>)}</div>
   {npc && <section className="adventure-relationship" aria-labelledby="npc-title">
    <div className="adventure-novel">
     <div className="adventure-npc-stage" key={npc.id}>
      <img className="adventure-landscape" src={`/art/scenes/${npcBackdrops[npc.id] ?? "thanh-van"}.webp`} alt="" />
      <div className="adventure-mist" aria-hidden="true" />
      <div className="adventure-npc-figure adventure-arrival"><InkPortrait kind="npc" id={npc.id} /></div>
      <div className="adventure-art-caption"><span className="adventure-kicker">{npc.title}</span><h2 id="npc-title">{npc.name}</h2></div>
     </div>
     <div className="adventure-dialogue" key={`${npc.id}-${stage}`}>
      {scene ? <><p className="eyebrow">Chương {stage + 1} / {npc.scenes.length} · {npc.name}</p><h3>{scene.title}</h3><p className="adventure-prose">{scene.text}</p>{trust < scene.required_trust && <p className="adventure-notice">Cần {scene.required_trust} tin tưởng để nói tiếp.</p>}<div className="adventure-choices">{scene.choices.map((choice, index) => <button key={choice.id} className="adventure-choice" disabled={busy || relationWait > 0 || trust < scene.required_trust} onClick={() => void perform("relation.talk", { npc_id: npc.id, choice_id: choice.id })}><span className="adventure-choice-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><strong>{choice.label}</strong><span aria-hidden="true">↗</span></button>)}</div></> : <div className="adventure-completed"><p className="eyebrow">Câu chuyện đã khép</p><h3>Đã đi qua một đoạn đời cùng nhau</h3><p>Câu chuyện của {npc.name} đã khép. Lời bạn nói và những mối quan hệ đã chọn vẫn còn trong tiểu sử.</p></div>}
      {relationWait > 0 && <p className="adventure-footnote">Để câu chuyện lắng lại · {relationWait}s trước lần tương tác tiếp.</p>}
      <details className="adventure-lore"><summary>Về {npc.name}</summary><p>{npc.description}</p><p>{npc.personality}</p></details>
     </div>
    </div>
    <dl className="adventure-relation-stats"><div><dt>Tin tưởng</dt><dd>{trust}</dd></div><div><dt>Thân thiết</dt><dd>{relation?.affection ?? 0}</dd></div><div><dt>Tôn trọng</dt><dd>{relation?.respect ?? 0}</dd></div><div><dt>Quan hệ</dt><dd>{bonds.find(bond => bond.id === relation?.bond)?.label ?? "Hữu duyên"}</dd></div></dl>
    <div className="adventure-relationship-actions"><section><p className="eyebrow">Trao đi một điều nhỏ</p><h3>Một món quà, không một món nợ</h3><p className="muted">{gifts[npc.gift] ?? npc.gift} tìm được từ lựa chọn cơ duyên. Mỗi người nhận tối đa một món trong 24 giờ, sau lần trò chuyện đầu.</p><div className="actions"><span className="badge">Hành trang: {giftCount}</span><button className="button secondary" disabled={busy || stage < 1 || giftCount < 1 || relationWait > 0 || giftWait > 0} onClick={() => void perform("relation.gift", { npc_id: npc.id })}>{giftWait ? `Có thể tặng sau ${Math.ceil(giftWait / 3600)} giờ` : `Tặng 1 ${gifts[npc.gift] ?? npc.gift}`}</button></div></section>
     <section><p className="eyebrow">Không cần một lời thề vội</p><h3>Gọi tên mối quan hệ</h3><p className="muted">Hoàn thành câu chuyện và đạt 60 tin tưởng. Tri kỷ, đạo lữ cần 30 thân thiết; đối thủ cần 30 tôn trọng. Được đổi quan hệ, không tốn tài nguyên.</p><div className="actions">{bonds.map(bond => {
      const enough = (bond.id === "confidant" || bond.id === "partner") ? (relation?.affection ?? 0) >= 30 : bond.id === "rival" ? (relation?.respect ?? 0) >= 30 : true;
      return <button key={bond.id} className={`button ${relation?.bond === bond.id ? "primary" : "secondary"}`} disabled={busy || !arcComplete || trust < 60 || !enough || relationWait > 0 || relation?.bond === bond.id} onClick={() => void perform("relation.bond", { npc_id: npc.id, bond: bond.id })}>{bond.label}</button>;
     })}</div></section></div>
   </section>}
  </>}
  {recent && <section className="adventure-journal" aria-live="polite"><p className="eyebrow">Dòng mực vừa khô</p><h2>{recent.title}</h2><p className="adventure-prose">{recent.text}</p><time className="muted" dateTime={recent.at}>{new Date(recent.at).toLocaleString("vi-VN")}</time></section>}
 </div>;
}
