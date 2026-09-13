"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, FastForward, Play, Shield, Sparkles, Swords } from "lucide-react";
import type { Battle, GameProps } from "../types";

const amount = (value: number) => value.toLocaleString("vi-VN");
const remainingTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function BattleReplay({ battle }: { battle: Battle }) {
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) {
        setShown(battle.turns.length);
        setPlaying(false);
      }
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, [battle.turns.length]);
  useEffect(() => {
    if (!playing || shown >= battle.turns.length || reducedMotion) return;
    const timer = window.setTimeout(() => setShown(value => value + 1), 850);
    return () => window.clearTimeout(timer);
  }, [playing, shown, battle.turns.length, reducedMotion]);
  const complete = shown >= battle.turns.length;
  const current = shown > 0 ? battle.turns[shown - 1] : null;
  return (
    <section className="panel stack" aria-label="Diễn biến trận đấu">
      <div className="section-heading">
        <div><p className="eyebrow">Chiến báo thực tế</p><h2>{battle.opponent}</h2></div>
        <span className="badge">{complete ? (battle.won ? "Chiến thắng" : "Chưa vượt qua") : `Hiệp ${current?.round ?? 1}`}</span>
      </div>
      <p className="muted">{new Date(battle.at).toLocaleString("vi-VN")} · Máy chủ đã chốt kết quả. Xem lại hoặc bỏ qua không thay đổi phần thưởng.</p>
      <div className="actions">
        {!complete && !reducedMotion && <button className="button secondary" onClick={() => setPlaying(value => !value)}><Play size={16} aria-hidden="true" />{playing ? "Tạm dừng" : "Tiếp tục"}</button>}
        {!complete && <button className="button secondary" onClick={() => { setShown(battle.turns.length); setPlaying(false); }}><FastForward size={16} aria-hidden="true" />Bỏ qua diễn biến</button>}
        {complete && !reducedMotion && <button className="button secondary" onClick={() => { setShown(0); setPlaying(true); }}><Play size={16} aria-hidden="true" />Xem lại trận</button>}
      </div>
      {!complete && <p role="status" className="notice">{current ? `${current.actor} · ${current.skill}: ${current.damage} sát thương. ${current.text}` : "Hai bên vào thế. Công pháp xuất theo thứ tự đã trang bị."}</p>}
      <progress className="progress" value={shown} max={Math.max(1, battle.turns.length)} aria-label="Tiến độ chiến báo" style={{ width: "100%" }} />
      <ol className="stack" style={{ maxHeight: 400, overflowY: "auto", paddingLeft: 24 }} tabIndex={0} aria-label="Nhật ký các lượt đã diễn ra">
        {battle.turns.slice(0, shown).map((turn, index) => (
          <li key={index} className="card">
            <div className="section-heading"><strong>Hiệp {turn.round} · {turn.actor}</strong><span className="badge">{turn.damage === 0 ? "Né thành công" : `−${turn.damage} sinh lực`}</span></div>
            <p><strong>{turn.skill}</strong> · {turn.text}</p>
          </li>
        ))}
      </ol>
      {complete && <div className={`notice ${battle.won ? "success" : ""}`}>
        <h3>{battle.won ? "Một trận đáng nhớ" : "Lùi một bước, sửa thế trận"}</h3>
        <p>{battle.summary}</p>
        <p>Thực nhận: {amount(battle.reward.stones)} linh thạch · {amount(battle.reward.cultivation)} tu vi · {battle.reward.tickets} vé cơ duyên · {battle.reward.season_xp} kinh nghiệm đạo đồ.</p>
      </div>}
    </section>
  );
}

export default function Combat({ snapshot, act, busy }: GameProps) {
  const p = snapshot.player;
  const { catalog } = snapshot;
  const [tab, setTab] = useState<"battle" | "build" | "relic">("battle");
  const [skillFilter, setSkillFilter] = useState("all");
  const equippedKey = p?.equipped_skills.join("|") ?? "";
  const equippedRelic = p?.equipped_relic ?? "";
  const [selectedSkills, setSelectedSkills] = useState<string[]>(p?.equipped_skills ?? []);
  const [selectedRelic, setSelectedRelic] = useState(equippedRelic);
  const [serverNow, setServerNow] = useState(() => Date.parse(snapshot.server_time));
  useEffect(() => {
    setSelectedSkills(equippedKey ? equippedKey.split("|") : []);
    setSelectedRelic(equippedRelic);
  }, [equippedKey, equippedRelic]);
  useEffect(() => {
    const started = Date.now();
    const initial = Date.parse(snapshot.server_time);
    setServerNow(initial);
    const timer = window.setInterval(() => setServerNow(initial + Date.now() - started), 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.server_time]);
  if (!p) return null;
  const path = catalog.paths.find(item => item.id === p.path);
  const relic = catalog.relics.find(item => item.id === p.equipped_relic);
  const realmName = (realm: number) => catalog.realms.find(item => item.id === realm)?.name ?? `Cảnh giới ${realm}`;
  const loadoutChanged = selectedSkills.join("|") !== equippedKey || selectedRelic !== equippedRelic;
  const toggleSkill = (id: string) => setSelectedSkills(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 3 ? [...current, id] : current);
  const moveSkill = (index: number, direction: number) => setSelectedSkills(current => {
    const next = [...current];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return current;
    [next[index], next[destination]] = [next[destination], next[index]];
    return next;
  });
  const saveBuild = () => act("build.equip", { skills: selectedSkills, relic: selectedRelic });
  const rewardsToday = p.flags["combat:reward-day"] === Math.floor(serverNow / 86400000) ? p.flags["combat:reward-count"] ?? 0 : 0;
  return (
    <div className="game-view stack">
      <header className="page-heading"><div><p className="eyebrow">Đấu pháp · Chuẩn bị hơn may rủi</p><h1>Mỗi thế trận, một cách thắng</h1><p className="muted">Bốn đạo có thể phối hợp. Không mua chỉ số chiến đấu, không mất trang bị khi thất bại.</p></div><Swords size={36} aria-hidden="true" /></header>
      <div className="stat-grid">
        <div className="stat"><span className="muted">Sở trường</span><strong>{path?.name}</strong></div>
        <div className="stat"><span className="muted">Cảnh giới</span><strong>{realmName(p.realm)}</strong></div>
        <div className="stat"><span className="muted">Pháp bảo đang dùng</span><strong>{relic?.name ?? "Chưa trang bị"}</strong></div>
        <div className="stat"><span className="muted">Chiến tích PvE</span><strong>{amount(p.stats.wins ?? 0)} thắng / {amount(p.stats.battles ?? 0)} trận</strong></div>
      </div>
      <nav className="tabs" aria-label="Nội dung đấu pháp">
        <button className={`tab ${tab === "battle" ? "active" : ""}`} aria-pressed={tab === "battle"} onClick={() => setTab("battle")}>Thử luyện</button>
        <button className={`tab ${tab === "build" ? "active" : ""}`} aria-pressed={tab === "build"} onClick={() => setTab("build")}>Đạo tu & công pháp</button>
        <button className={`tab ${tab === "relic" ? "active" : ""}`} aria-pressed={tab === "relic"} onClick={() => setTab("relic")}>Lò luyện pháp bảo</button>
      </nav>
      {tab === "battle" && <>
        {p.last_battle && <BattleReplay key={p.last_battle.id} battle={p.last_battle} />}
        <section className="stack" aria-label="Mục tiêu thử luyện">
          <div className="section-heading"><h2>Tám cửa thử luyện</h2><span className="badge">{Math.max(0, 12 - rewardsToday)}/12 lượt thắng còn thưởng hôm nay</span></div>
          <p className="notice">Nghỉ 1 phút giữa các trận; mỗi đối thủ hồi phục 30 phút. Mỗi ngày UTC nhận thưởng cho 12 chiến thắng đầu; chiến thắng đầu tiên với từng đối thủ luôn có thêm 1 vé. Những trận còn lại vẫn ghi chiến tích. Pháp bảo và ngọc trả phí không ảnh hưởng đấu trường chuẩn hóa.</p>
          {loadoutChanged && <p className="notice">Bạn đang chỉnh bộ công pháp chưa lưu. Trận đấu sẽ dùng bộ đã trang bị trên máy chủ.</p>}
          <div className="card-grid">{catalog.bosses.filter(boss => !boss.guild).map(boss => {
            const cooldown = Math.max(0, Math.ceil((Math.max(p.flags["combat:next"] ?? 0, p.flags[`combat:boss:${boss.id}`] ?? 0) * 1000 - serverNow) / 1000));
            const locked = p.realm < boss.realm;
            return <article key={boss.id} className="card stack">
              <div className="section-heading"><span className="eyebrow">{catalog.regions.find(region => region.id === boss.region)?.name}</span><span className="badge">{realmName(boss.realm)}</span></div>
              <h3>{boss.name}</h3><p className="muted">{boss.description}</p>
              <p><Shield size={14} aria-hidden="true" /> Sinh lực {amount(boss.hp)} · Công {boss.power} · Thủ {boss.guard}</p>
              <p>Thưởng thắng: {amount(boss.reward)} linh thạch · {amount(Math.floor(boss.reward / 2))} tu vi · 15 kinh nghiệm.</p>
              <button className="button primary" disabled={busy || locked || cooldown > 0} onClick={() => void act("combat.boss", { id: boss.id })}><Swords size={16} aria-hidden="true" />{locked ? `Cần ${realmName(boss.realm)}` : cooldown > 0 ? `Hồi phục · ${remainingTime(cooldown)}` : "Bắt đầu thử luyện"}</button>
            </article>;
          })}</div>
        </section>
        <section className="panel stack"><h2>Hai mục tiêu tông môn</h2><p className="muted">Chuyển sang Tông môn để cùng đồng đạo tập kích; sinh lực mục tiêu được cả tông chia sẻ.</p><div className="card-grid">{catalog.bosses.filter(boss => boss.guild).map(boss => <article key={boss.id} className="card"><h3>{boss.name}</h3><p>{boss.description}</p><p className="muted">{realmName(boss.realm)} · {amount(boss.hp)} sinh lực</p></article>)}</div></section>
      </>}
      {tab === "build" && <>
        <section className="stack"><h2>Chọn đạo, không khóa tương lai</h2><div className="card-grid">{catalog.paths.map(item => <article key={item.id} className="card stack" style={{ borderTop: `2px solid ${item.color}` }}><h3>{item.name}</h3><p className="muted">{item.description}</p><button className="button secondary" disabled={busy || p.path === item.id} onClick={() => void act("build.path", { id: item.id })}>{p.path === item.id ? "Đang tu luyện" : "Chuyển đạo miễn phí"}</button></article>)}</div><p className="muted">Chuyển đạo không tặng thêm công pháp. Bạn giữ nguyên những gì đã học và có thể phối hợp công pháp của cả bốn đạo.</p></section>
        <section className="panel stack"><div className="section-heading"><h2>Thứ tự xuất chiêu</h2><span className="badge">{selectedSkills.length}/3 công pháp</span></div><p className="muted">Lặp từ trên xuống. Hộ thể bảo vệ đòn kế tiếp; nối hai pháp thuật để khống chế, xen ẩn thuật để né hoặc tích ba kiếm thế xuyên giáp.</p>
          {selectedSkills.length === 0 && <p className="empty">Chọn ít nhất một công pháp đã học ở tàng thư bên dưới.</p>}
          {selectedSkills.map((id, index) => <div className="card section-heading" key={id}><strong>{index + 1}. {catalog.skills.find(skill => skill.id === id)?.name}</strong><div className="actions"><button className="button secondary" disabled={busy || index === 0} aria-label={`Đưa công pháp ${index + 1} lên trước`} onClick={() => moveSkill(index, -1)}><ArrowUp size={16} /></button><button className="button secondary" disabled={busy || index === selectedSkills.length - 1} aria-label={`Đưa công pháp ${index + 1} xuống sau`} onClick={() => moveSkill(index, 1)}><ArrowDown size={16} /></button><button className="button secondary" disabled={busy} onClick={() => toggleSkill(id)}>Bỏ chọn</button></div></div>)}
          <label className="field">Pháp bảo mang theo<select value={selectedRelic} disabled={busy} onChange={event => setSelectedRelic(event.target.value)}>{catalog.relics.filter(item => p.relics.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name} · Công +{item.power} / Thủ +{item.guard}</option>)}</select></label>
          <div className="actions"><button className="button primary" disabled={busy || !loadoutChanged || selectedSkills.length === 0 || !selectedRelic} onClick={() => void saveBuild()}><Check size={16} aria-hidden="true" />Lưu bộ công pháp</button><button className="button secondary" disabled={busy || !loadoutChanged} onClick={() => { setSelectedSkills([...p.equipped_skills]); setSelectedRelic(p.equipped_relic); }}>Hoàn tác chỉnh sửa</button></div>
          <p className="muted">{loadoutChanged ? "Có thay đổi chưa lưu. Chỉ bộ đã lưu được đưa vào trận." : "Bộ công pháp đã đồng bộ với máy chủ."}</p>
        </section>
        <section className="stack"><div className="section-heading"><h2>Tàng thư công pháp</h2><label className="field">Lọc đạo tu<select value={skillFilter} onChange={event => setSkillFilter(event.target.value)}><option value="all">Tất cả bốn đạo</option>{catalog.paths.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="card-grid">{catalog.skills.filter(skill => skillFilter === "all" || skill.path === skillFilter).map(skill => {
          const owned = p.skills.includes(skill.id);
          const selected = selectedSkills.includes(skill.id);
          const locked = p.realm < skill.realm;
          return <article className="card stack" key={skill.id}><div className="section-heading"><span className="eyebrow">{catalog.paths.find(item => item.id === skill.path)?.name}</span><span className="badge">{realmName(skill.realm)}</span></div><h3>{skill.name}</h3><p className="muted">{skill.description}</p><p>Công +{skill.power} · Hộ thể +{skill.guard}</p>{owned ? <button className="button secondary" disabled={busy || locked || (!selected && selectedSkills.length >= 3)} aria-pressed={selected} onClick={() => toggleSkill(skill.id)}>{selected ? `Đã chọn · vị trí ${selectedSkills.indexOf(skill.id) + 1}` : locked ? `Cần ${realmName(skill.realm)}` : selectedSkills.length >= 3 ? "Đã chọn đủ 3 công pháp" : "Chọn vào bộ"}</button> : <button className="button primary" disabled={busy || locked || p.stones < skill.cost} onClick={() => void act("skill.learn", { id: skill.id })}>{locked ? `Cần ${realmName(skill.realm)}` : `Học · ${amount(skill.cost)} linh thạch`}</button>}</article>;
        })}</div></section>
      </>}
      {tab === "relic" && <section className="stack"><div className="section-heading"><div><h2>Lò lửa không hỏi túi ngọc</h2><p className="muted">Mọi pháp bảo đều chế tạo bằng linh thạch kiếm trong game. Không có thất bại ngẫu nhiên; không thể chế tạo trùng.</p></div><Sparkles aria-hidden="true" /></div><p className="notice">Có {amount(p.stones)} linh thạch. Chế tạo không tự trang bị; sang “Đạo tu & công pháp” để chọn pháp bảo và lưu bộ.</p><div className="card-grid">{catalog.relics.map(item => {
        const owned = p.relics.includes(item.id);
        const rarity = ({ common: "Thường", rare: "Hiếm", epic: "Sử thi", legendary: "Truyền thuyết" } as Record<string, string>)[item.rarity] ?? item.rarity;
        return <article key={item.id} className="card stack"><div className="section-heading"><span className="badge">{rarity}</span>{p.equipped_relic === item.id && <span className="badge">Đang trang bị</span>}</div><h3>{item.name}</h3><p className="muted">{item.description}</p><p>Công +{item.power} · Thủ +{item.guard}</p><button className="button primary" disabled={busy || owned || p.stones < item.cost} onClick={() => void act("relic.craft", { id: item.id })}>{owned ? "Đã sở hữu" : `Chế tạo · ${amount(item.cost)} linh thạch`}</button></article>;
      })}</div></section>}
    </div>
  );
}
