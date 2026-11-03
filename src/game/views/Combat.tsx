"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Sparkles, Swords, MapPin, ArrowRight } from "lucide-react";
import type { GameProps, Relic } from "../types";
import "./build-workshop.css";
import "./trial-preparation.css";
import AutoBattle from "./AutoBattle";
import InkScene, { InkPortrait } from "../InkScene";
import { SkillIcon } from "../SpriteArt";

const amount = (value: number) => value.toLocaleString("vi-VN");
const remainingTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
const materialNames: Record<string, string> = { tea: "Trà núi", herb: "Dược thảo", ore: "Quặng tốt", paper: "Giấy tuyên", silk: "Lụa", wood: "Gỗ thơm" };
const attributeIDs = ["body", "qi", "agility", "mind"] as const;
const refinedStats = (relic: Relic, level: number) => ({
  power: relic.power + level * (1 + Math.floor(relic.power / 6)),
  guard: relic.guard + level * (1 + Math.floor(relic.guard / 6)),
});


export default function Combat({ snapshot, act, busy }: GameProps) {
  const p = snapshot.player;
  const { catalog } = snapshot;
  const [tab, setTab] = useState<"battle" | "expedition" | "build" | "relic">("battle");
  const [bossID, setBossID] = useState(p?.flags["combat:first-win:moss-boar"] ? "gate-guardian" : "moss-boar");
  const [skillFilter, setSkillFilter] = useState("all");
  const [siteID, setSiteID] = useState(p?.expedition?.site_id ?? catalog.expeditions[0]?.id ?? "");
  const [useItems, setUseItems] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [returnPrompt, setReturnPrompt] = useState(false);
  const equippedKey = p?.equipped_skills.join("|") ?? "";
  const equipmentKey = JSON.stringify(p?.equipment ?? {});
  const attributesKey = JSON.stringify(Object.fromEntries(attributeIDs.map(id => [id, p?.attributes[id] ?? 0])));
  const [selectedSkills, setSelectedSkills] = useState<string[]>(p?.equipped_skills ?? []);
  const [selectedEquipment, setSelectedEquipment] = useState<Record<string, string>>(p?.equipment ?? {});
  const [attributes, setAttributes] = useState<Record<string, number>>(() => JSON.parse(attributesKey));
  const [serverNow, setServerNow] = useState(() => Date.parse(snapshot.server_time));
  const battleKey = `${p?.battle?.id ?? ""}:${p?.battle?.status ?? ""}`;
  const previousBattle = useRef(battleKey);
  const arena = useRef<HTMLDivElement>(null);
  const preparation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (previousBattle.current === battleKey) return;
    previousBattle.current = battleKey;
    setTab("battle");
    setShowBattle(true);
    const frame = window.requestAnimationFrame(() => arena.current?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => window.cancelAnimationFrame(frame);
  }, [battleKey]);
  useEffect(() => { setReturnPrompt(false); }, [p?.expedition?.site_id]);
  useEffect(() => {
    setSelectedSkills(equippedKey ? equippedKey.split("|") : []);
  }, [equippedKey]);
  useEffect(() => {
    setSelectedEquipment(JSON.parse(equipmentKey));
  }, [equipmentKey]);
  useEffect(() => {
    setAttributes(JSON.parse(attributesKey));
  }, [attributesKey]);
  useEffect(() => {
    const started = Date.now();
    const initial = Date.parse(snapshot.server_time);
    setServerNow(initial);
    const timer = window.setInterval(() => setServerNow(initial + Date.now() - started), 1000);
    return () => window.clearInterval(timer);
  }, [snapshot.server_time]);
  if (!p) return null;
  const perform = async (type: string, payload: Record<string, unknown>) => {
    try { await act(type, payload); } catch { /* Shell presents authoritative errors and retry state. */ }
  };
  const realmName = (realm: number) => catalog.realms.find(item => item.id === realm)?.name ?? `Cảnh giới ${realm}`;
  const loadoutChanged = selectedSkills.join("|") !== equippedKey || catalog.slots.some(slot => (selectedEquipment[slot.id] ?? "") !== (p.equipment[slot.id] ?? ""));
  const attributesChanged = attributeIDs.some(id => attributes[id] !== (p.attributes[id] ?? 0));
  const budget = 4 + 4 * Math.max(0, Math.min(p.realm, catalog.realms.length - 1));
  const spent = attributeIDs.reduce((sum, id) => sum + attributes[id], 0);
  const remaining = budget - spent;
  const previewRealm = Math.max(0, Math.min(5, p.realm));
  const preview = { hp: 120 + previewRealm * 55 + 18 * attributes.body, attack: 12 + previewRealm * 8 + 2 * attributes.qi, guard: 4 + previewRealm * 3 + attributes.body, energy: 6 + Math.min(6, Math.floor(attributes.qi / 2)), crit: Math.min(30, 2 * attributes.mind), dodge: Math.min(25, 2 * attributes.agility) };
  for (const slot of catalog.slots) {
    const relic = catalog.relics.find(item => item.id === selectedEquipment[slot.id] && item.slot === slot.id && p.relics.includes(item.id));
    if (relic) {
      const stats = refinedStats(relic, p.refines[relic.id] ?? 0);
      preview.attack += stats.power;
      preview.guard += stats.guard;
    }
  }
  const adjustAttribute = (id: string, delta: number) => setAttributes(current => {
    const available = budget - attributeIDs.reduce((sum, key) => sum + current[key], 0);
    const next = current[id] + delta;
    if (next < 0 || delta > available) return current;
    return { ...current, [id]: next };
  });
  const toggleSkill = (id: string) => setSelectedSkills(current => current.includes(id) ? current.filter(value => value !== id) : current.length < 3 ? [...current, id] : current);
  const moveSkill = (index: number, direction: number) => setSelectedSkills(current => {
    const next = [...current];
    const destination = index + direction;
    if (destination < 0 || destination >= next.length) return current;
    [next[index], next[destination]] = [next[destination], next[index]];
    return next;
  });
  const rewardsToday = p.flags["combat:reward-day"] === Math.floor(serverNow / 86400000) ? p.flags["combat:reward-count"] ?? 0 : 0;
  const site = catalog.expeditions.find(item => item.id === siteID) ?? catalog.expeditions[0];
  const expedition = p.expedition;
  const activeSite = catalog.expeditions.find(item => item.id === expedition?.site_id);
  const elapsed = Math.max(0, Math.floor((serverNow - Date.parse(snapshot.server_time)) / 1000));
  const seconds = activeSite ? Math.min(activeSite.cap_seconds, snapshot.expedition_seconds + elapsed) : 0;
  const cycles = activeSite ? Math.floor(seconds / activeSite.interval_seconds) : 0;
  const unlocked = site && p.realm >= site.realm && !!p.flags[`combat:first-win:${site.boss_id}`];
  const trialBosses = catalog.bosses.filter(boss => !boss.guild && boss.region === "thanh-van");
  const boss = catalog.bosses.find(item => item.id === bossID && !item.guild);
  const plan = boss ? catalog.boss_plans[boss.id] : undefined;
  const cleared = trialBosses.filter(item => !!p.flags[`combat:first-win:${item.id}`]).length;
  const battleActive = p.battle?.status === "active";
  const preparationChanged = loadoutChanged || attributesChanged;
  const cooldownFor = (id: string, region: string) => region === "thanh-van" && !p.flags[`combat:first-win:${id}`] ? 0 : Math.max(0, Math.ceil((Math.max(p.flags["combat:next"] ?? 0, p.flags[`combat:boss:${id}`] ?? 0) * 1000 - serverNow) / 1000));
  const bossLocked = !!boss && (p.realm < boss.realm || (boss.id === "gate-guardian" && !p.flags["combat:first-win:moss-boar"]));
  const cooldown = boss ? cooldownFor(boss.id, boss.region) : 0;
  const lastBoss = catalog.bosses.find(item => item.id === p.battle?.boss_id && !item.guild);
  const canRetry = !!lastBoss && p.realm >= lastBoss.realm && (lastBoss.id !== "gate-guardian" || !!p.flags["combat:first-win:moss-boar"]) && (p.battle?.practice ? lastBoss.region === "thanh-van" : cooldownFor(lastBoss.id, lastBoss.region) === 0);
  const prepare = () => {
    setShowBattle(false);
    window.requestAnimationFrame(() => {
      preparation.current?.focus({ preventScroll: true });
      preparation.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };
  const enterBattle = (id: string, practice: boolean) => {
    if (busy || battleActive || preparationChanged) return;
    setBossID(id);
    void perform(practice ? "combat.practice" : "combat.challenge", practice ? { id } : { id, use_items: useItems });
  };
  const battleActions = boss && <div className="trial-actions" aria-busy={busy}>
    <button className="button primary" disabled={busy || battleActive || bossLocked || cooldown > 0 || preparationChanged} onClick={() => enterBattle(boss.id, false)}><Swords size={16} aria-hidden="true" />{busy ? "Đang xử lý…" : bossLocked ? boss.id === "gate-guardian" && !p.flags["combat:first-win:moss-boar"] ? "Cần thắng Trư Yêu trước" : `Cần ${realmName(boss.realm)}` : cooldown > 0 ? `Hồi phục · ${remainingTime(cooldown)}` : `Khiêu chiến · ${boss.name}`}</button>
    {boss.region === "thanh-van" && <button className="button secondary" disabled={busy || battleActive || bossLocked || preparationChanged} onClick={() => enterBattle(boss.id, true)}>{busy ? "Đang xử lý…" : "Đánh thử miễn phí · Không đan phù"}</button>}
    <small>Khiêu chiến thật: {useItems ? "đã bật dùng đan phù, tối đa 2 món đang có." : "không dùng đan phù."} Đánh thử không thưởng, không mở ải.</small>
    {preparationChanged && <p className="notice">Bản nháp chưa lưu. Lưu hoặc hoàn tác tiềm năng và bộ công pháp trước khi vào trận.</p>}
  </div>;
  return (
    <div className="game-view stack combat-view build-workshop">
      <header className="idle-page-heading"><div><p className="eyebrow">SƠN HÀ VẠN DẶM · LỊCH LUYỆN TU HÀNH</p><h1>Bí cảnh</h1></div><span className="idle-realm-seal">{realmName(p.realm)}</span></header>
      <nav className="tabs" aria-label="Tu hành và chuẩn bị">
        <button className={`tab ${tab === "battle" ? "active" : ""}`} aria-pressed={tab === "battle"} onClick={() => setTab("battle")}>Vượt ải</button>
        <button className={`tab ${tab === "expedition" ? "active" : ""}`} aria-pressed={tab === "expedition"} onClick={() => setTab("expedition")}>Luyện công</button>
        <button className={`tab ${tab === "build" ? "active" : ""}`} aria-pressed={tab === "build"} onClick={() => setTab("build")}>Công pháp & pháp bảo</button>
        <button className={`tab ${tab === "relic" ? "active" : ""}`} aria-pressed={tab === "relic"} onClick={() => setTab("relic")}>Lò luyện</button>
      </nav>
      {tab === "battle" && <>
        <div ref={arena}>{showBattle && p.battle && p.battle.status !== "active" && <AutoBattle key={p.battle.id} battle={p.battle} catalog={catalog} busy={busy} onClose={() => setShowBattle(false)} onPrepare={() => { setBossID(p.battle!.boss_id); prepare(); }} onRetry={canRetry && !preparationChanged ? () => enterBattle(p.battle!.boss_id, !!p.battle!.practice) : undefined} />}</div>
        {p.battle?.status === "active" && <section className="notice idle-section-heading"><div><h3>Trận đang lưu · {p.battle.foe.name}</h3><p>Giữ nguyên sinh lực, công pháp và các lượt đã đánh. Hoàn tất tự động trước khi mở thử luyện khác.</p></div><button className="button primary" disabled={busy} onClick={() => void perform("combat.challenge", { id: p.battle!.boss_id, use_items: useItems })}>Tiếp tục tự động</button></section>}
        <section className="idle-trials trial-overview" aria-labelledby="trial-heading">
          <div className="idle-section-heading"><div><p className="eyebrow">VƯỢT ẢI · THANH VÂN</p><h2 id="trial-heading">Qua Trư Yêu, đối mặt Hộ Sơn</h2></div><span className="badge">{cleared}/{trialBosses.length} ải đã vượt</span></div>
          <p className="muted">Thắng thật mới mở ải tiếp theo. Đọc nhịp đối thủ, chuẩn bị công pháp rồi đánh thử hoặc khiêu chiến.</p>
          <ol className="trial-progress" aria-label="Tiến trình Thanh Vân">{trialBosses.map((item, index) => <li key={item.id}><button type="button" aria-pressed={bossID === item.id} onClick={() => setBossID(item.id)}><span>Ải {index + 1}</span><strong>{item.name}</strong><small>{p.flags[`combat:first-win:${item.id}`] ? "Đã thắng thật" : item.id === "gate-guardian" && !p.flags["combat:first-win:moss-boar"] ? "Chưa mở · Cần thắng Trư Yêu" : "Chưa vượt"}</small></button></li>)}</ol>
          {battleActions}
          <details className="trial-other-regions"><summary>Các thủ lĩnh vùng khác</summary><label className="field">Chọn thủ lĩnh<select value={boss?.region !== "thanh-van" ? bossID : ""} onChange={event => { if (event.target.value) setBossID(event.target.value); }}><option value="">Chọn một thủ lĩnh</option>{catalog.bosses.filter(item => !item.guild && item.region !== "thanh-van").map(item => <option key={item.id} value={item.id}>{item.name} · {realmName(item.realm)}</option>)}</select></label></details>
          {boss && <article className="trial-boss" aria-labelledby="selected-boss-heading">
            <div className="trial-boss-profile"><InkPortrait kind="boss" id={boss.id} /><div><p className="eyebrow">{catalog.regions.find(region => region.id === boss.region)?.name} · {realmName(boss.realm)}</p><h3 id="selected-boss-heading">{boss.name}</h3><p>{boss.description}</p><p>{amount(boss.hp)} sinh lực · {boss.power} công · {boss.guard} thủ</p><p className="muted">{p.flags[`combat:first-win:${boss.id}`] ? "Đã vượt ải bằng chiến thắng thật." : "Chưa có chiến thắng thật ở ải này."}</p></div></div>
            {plan && <div className="trial-rhythm">{([{ title: "Nhịp thường · Trên 50% sinh lực", moves: plan.pattern }, { title: "Cuồng nộ · Còn tối đa 50% sinh lực", moves: plan.rage }]).map(phase => <section key={phase.title}><h4>{phase.title}</h4><ol>{phase.moves.map((move, index) => <li key={`${move.name}-${index}`}><strong>{move.name}</strong><p>{move.hint}</p><small>Công +{move.power} · Hộ thể +{move.guard}{move.effect ? ` · ${catalog.effects.find(effect => effect.id === move.effect)?.name ?? move.effect}${move.effect_value ? ` ${move.effect_value}` : ""}${move.effect_rounds ? ` / ${move.effect_rounds} hiệp` : ""}` : ""}</small></li>)}</ol></section>)}</div>}
            <p className="idle-fine-print">Chiêu được chọn theo số hiệp trong từng chu kỳ; khi đổi sang cuồng nộ, không quay lại hiệp 1. Chỉ số chiêu chưa phải sát thương cuối: còn chịu ảnh hưởng của phòng thủ, hộ thể và trạng thái.</p>
          </article>}
          <section className="trial-saved-build" aria-label="Chuẩn bị đã lưu"><h3>Đang mang vào trận</h3><p>{p.equipped_skills.map((id, index) => `${index + 1}. ${catalog.skills.find(skill => skill.id === id)?.name ?? id}`).join(" → ") || "Chưa trang bị công pháp"}</p><p className="muted">{catalog.attributes.map(attribute => `${attribute.name}: ${p.attributes[attribute.id] ?? 0}`).join(" · ")}</p><p className="muted">{catalog.slots.map(slot => `${slot.name}: ${catalog.relics.find(relic => relic.id === p.equipment[slot.id])?.name ?? "Để trống"}`).join(" · ")}</p><button className="text-button" onClick={prepare}>Chỉnh chuẩn bị ngay bên dưới <ArrowRight size={15} aria-hidden="true" /></button></section>
          <div className="idle-combat-policy"><label><input type="checkbox" checked={useItems} disabled={busy || battleActive} onChange={event => setUseItems(event.target.checked)} />Khiêu chiến thật: tự dùng đan phù đang có · tối đa 2 mỗi trận</label><small>Ưu tiên giải khóa khí, hồi máu dưới 35%, giải trạng thái xấu; sau đó hộ giáp trước đòn mạnh hoặc tăng công.</small><small>Đang có: {catalog.consumables.map(item => `${item.name} ${p.inventory[item.id] ?? 0}`).join(" · ")}</small></div>
          <p className="muted">Đánh thử chỉ có tại Thanh Vân: dùng bộ đã lưu và cùng đối thủ, không tiêu vật phẩm, không nhận thưởng, thuần thục hay mở ải.</p>
          {boss && <p className="trial-rewards">Thắng thật: {amount(boss.reward)} linh thạch · {Math.floor(boss.reward / 2)} tu vi · {Math.max(0, 12 - rewardsToday)}/12 lượt thắng còn thưởng hôm nay.{catalog.expeditions.some(item => item.boss_id === boss.id) ? " Chiến thắng đầu mở nơi luyện công tương ứng." : ""}</p>}
          <p className="idle-fine-print">Thanh Vân: chưa thắng ải thì không phải chờ; thua được thử lại ngay. Sau thắng thật: nghỉ 1 phút giữa hai trận, thủ lĩnh hồi phục 30 phút. Đánh thử không đổi hồi phục. Không mất trang bị khi bại trận.</p>
          {p.battle && p.battle.status !== "active" && !showBattle && <button className="text-button" onClick={() => { setShowBattle(true); arena.current?.scrollIntoView({ block: "start", behavior: "instant" }); }}>Xem chiến báo gần nhất{p.battle.practice ? " · Đánh thử" : ""}</button>}
        </section>
      </>}
      {(tab === "battle" || tab === "build") && <div className="stack trial-preparation" ref={preparation} tabIndex={-1} aria-labelledby="preparation-heading">
        <div className="section-heading"><div><p className="eyebrow">CHUẨN BỊ · BỘ ĐÃ LƯU MỚI VÀO TRẬN</p><h2 id="preparation-heading">Công pháp & tiềm năng</h2></div><span className="badge">{amount(p.stones)} linh thạch</span></div>
        <p className="notice">Học công pháp trừ đúng giá linh thạch; học xong hãy chọn và lưu bộ riêng. Tiềm năng được phân lại miễn phí. Luyện công đang chạy giữ bộ lúc xuất hành; trở về rồi xuất hành lại để dùng thay đổi.</p>
        <section className="panel stack" aria-labelledby="attributes-heading">
          <div className="section-heading"><h2 id="attributes-heading">Tiềm năng · Phân lại miễn phí</h2><span className="badge" role="status">Còn {remaining}/{budget} điểm</span></div>
          <p className="muted">Nhận 4 điểm ban đầu và 4 điểm mỗi cảnh giới. Có thể để dành điểm; đặt lại chỉ sửa bản nháp, hãy lưu để xác nhận.</p>
          <div className="build-attribute-grid">{catalog.attributes.map(attribute => <article key={attribute.id} className="card stack">
            <h3 id={`attribute-${attribute.id}`}>{attribute.name}</h3><p className="muted">{attribute.description}</p><p>{attribute.effect}</p>
            <div className="build-stepper" role="group" aria-labelledby={`attribute-${attribute.id}`}>
              <button type="button" className="button secondary" aria-label={`Giảm ${attribute.name}`} disabled={busy || attributes[attribute.id] <= 0} onClick={() => adjustAttribute(attribute.id, -1)}>−</button>
              <output aria-label={`Điểm ${attribute.name}`} aria-live="polite">{attributes[attribute.id]}</output>
              <button type="button" className="button secondary" aria-label={`Tăng ${attribute.name}`} disabled={busy || remaining <= 0} onClick={() => adjustAttribute(attribute.id, 1)}>+</button>
            </div>
          </article>)}</div>
          <div className="actions">
            <button type="button" className="button primary" disabled={busy || !attributesChanged || remaining < 0} onClick={() => void perform("build.attributes", Object.fromEntries(attributeIDs.map(id => [id, attributes[id]])))}>Lưu tiềm năng · Miễn phí</button>
            <button type="button" className="button secondary" disabled={busy || spent === 0} onClick={() => setAttributes({ body: 0, qi: 0, agility: 0, mind: 0 })}>Đặt lại bản nháp về 0</button>
            <button type="button" className="button secondary" disabled={busy || !attributesChanged} onClick={() => setAttributes(JSON.parse(attributesKey))}>Hoàn tác tiềm năng</button>
          </div>
          <p className="muted">{attributesChanged ? "Tiềm năng chưa lưu." : "Tiềm năng đã đồng bộ với máy chủ."}</p>
        </section>
        <section className="panel stack" aria-labelledby="build-preview-heading">
          <h2 id="build-preview-heading">Chỉ số dự kiến · Trận tiếp theo</h2>
          <p className="muted">Tính theo tiềm năng và ba ô trang bị đang chọn bên dưới, gồm cường hóa đã lưu. Chưa cộng chiêu thức, hiệu ứng hay cộng hưởng đạo tu khi ra đòn. Đấu trường chuẩn hóa không áp dụng tiềm năng, trang bị và thuần thục.</p>
          <dl className="build-preview" aria-live="polite">
            <div><dt>Sinh lực tối đa</dt><dd>{amount(preview.hp)}</dd></div><div><dt>Uy lực</dt><dd>{amount(preview.attack)}</dd></div><div><dt>Phòng thủ</dt><dd>{amount(preview.guard)}</dd></div>
            <div><dt>Linh lực tối đa</dt><dd>{preview.energy}</dd></div><div><dt>Bạo kích</dt><dd>{preview.crit}%</dd></div><div><dt>Né tránh</dt><dd>{preview.dodge}%</dd></div>
          </dl>
          {(loadoutChanged || attributesChanged) && <p className="notice">Đây là bản xem trước chưa lưu. Lưu tiềm năng và lưu bộ công pháp riêng trước khi vào trận.</p>}
        </section>
        {tab === "build" && <section className="stack"><h2>Chọn đạo, không khóa tương lai</h2><div className="card-grid">{catalog.paths.map(item => <article key={item.id} className="card stack combat-path-card" style={{ borderTop: `2px solid ${item.color}` }}><InkPortrait kind="hero" id={item.id} /><h3>{item.name}</h3><p className="muted">{item.description}</p><button type="button" className="button secondary" disabled={busy || p.path === item.id} onClick={() => void perform("build.path", { id: item.id })}>{p.path === item.id ? "Đang tu luyện" : "Chuyển đạo miễn phí"}</button></article>)}</div><p className="muted">Chuyển đạo không tặng thêm công pháp. Giữ nguyên những gì đã học và phối hợp công pháp của cả bốn đạo.</p></section>}
        <section className="panel stack"><div className="section-heading"><h2>Bộ công pháp mang vào trận</h2><span className="badge">{selectedSkills.length}/3 công pháp</span></div><p className="muted">Tự thi triển công pháp từ trên xuống, bỏ qua chiêu còn hồi hoặc thiếu linh lực. Hộ thể bảo vệ đòn kế tiếp; nối hai pháp thuật để khống chế, xen ẩn thuật để né hoặc tích ba kiếm thế xuyên giáp.</p>
          {selectedSkills.length === 0 && <p className="empty">Chọn ít nhất một công pháp đã học ở tàng thư bên dưới.</p>}
          {selectedSkills.map((id, index) => <div className="card section-heading build-skill-order" key={id}><strong>{index + 1}. {catalog.skills.find(skill => skill.id === id)?.name}</strong><div className="actions"><button type="button" className="button secondary" disabled={busy || index === 0} aria-label={`Đưa công pháp ${index + 1} lên trước`} onClick={() => moveSkill(index, -1)}><ArrowUp size={16} aria-hidden="true" /></button><button type="button" className="button secondary" disabled={busy || index === selectedSkills.length - 1} aria-label={`Đưa công pháp ${index + 1} xuống sau`} onClick={() => moveSkill(index, 1)}><ArrowDown size={16} aria-hidden="true" /></button><button type="button" className="button secondary" disabled={busy} onClick={() => toggleSkill(id)}>Bỏ chọn</button></div></div>)}
          <div className="build-slot-grid">{catalog.slots.map(slot => <label className="field" key={slot.id}>{slot.name}<select value={selectedEquipment[slot.id] ?? ""} disabled={busy} onChange={event => setSelectedEquipment(current => ({ ...current, [slot.id]: event.target.value }))}><option value="">Để trống · Không trang bị</option>{catalog.relics.filter(item => item.slot === slot.id && p.relics.includes(item.id)).map(item => {
            const level = p.refines[item.id] ?? 0;
            const stats = refinedStats(item, level);
            return <option key={item.id} value={item.id}>{item.name} +{level} · Công {stats.power} / Thủ {stats.guard}</option>;
          })}</select><span className="muted">{slot.description}</span></label>)}</div>
          <div className="actions"><button type="button" className="button primary" disabled={busy || !loadoutChanged || selectedSkills.length === 0} onClick={() => void perform("build.equip", { skills: selectedSkills, equipment: Object.fromEntries(catalog.slots.filter(slot => selectedEquipment[slot.id]).map(slot => [slot.id, selectedEquipment[slot.id]])) })}><Check size={16} aria-hidden="true" />Lưu công pháp & ba ô trang bị</button><button type="button" className="button secondary" disabled={busy || !loadoutChanged} onClick={() => { setSelectedSkills([...p.equipped_skills]); setSelectedEquipment({ ...p.equipment }); }}>Hoàn tác chỉnh sửa</button></div>
          <p className="muted">{loadoutChanged ? "Có thay đổi chưa lưu. Chỉ bộ đã lưu được đưa vào trận." : "Bộ công pháp đã đồng bộ với máy chủ."}</p>
        </section>
        <section className="stack"><div className="section-heading"><h2>Tàng thư công pháp</h2><label className="field">Lọc đạo tu<select value={skillFilter} onChange={event => setSkillFilter(event.target.value)}><option value="all">Tất cả bốn đạo</option>{catalog.paths.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>{tab === "battle" && <p className="muted">Các công pháp đã sở hữu hoặc có thể học ở cảnh giới hiện tại. Học không tự trang bị; chọn tối đa 3 chiêu rồi lưu bộ ở trên. Mở “Công pháp & pháp bảo” để xem toàn bộ tàng thư.</p>}<div className="card-grid">{catalog.skills.filter(skill => (skillFilter === "all" || skill.path === skillFilter) && (tab === "build" || p.skills.includes(skill.id) || skill.realm <= p.realm)).map(skill => {
          const owned = p.skills.includes(skill.id);
          const selected = selectedSkills.includes(skill.id);
          const locked = p.realm < skill.realm;
          const uses = p.stats[`skill:${skill.id}:uses`] ?? 0;
          const mastery = Math.max(1, catalog.mastery.filter(threshold => uses >= threshold).length);
          const nextThreshold = catalog.mastery[mastery];
          const effect = catalog.effects.find(item => item.id === skill.effect);
          return <article className="card stack" key={skill.id}>
            <div className="section-heading"><span className="eyebrow">{catalog.paths.find(item => item.id === skill.path)?.name}</span><span className="badge">{realmName(skill.realm)}</span></div>
            <div className="skill-art-heading"><SkillIcon id={skill.id} /><h3>{skill.name}</h3></div><p className="muted">{skill.description}</p>
            <p>Công +{skill.power + 2 * (mastery - 1)} · Hộ thể +{skill.guard + mastery - 1}{mastery > 1 ? " (đã gồm thuần thục)" : ""}</p>
            {tab === "build" ? <><div className="build-mastery"><strong>Thuần thục {mastery}/{catalog.mastery.length} · {amount(uses)} lần dùng</strong><p className="muted">{nextThreshold === undefined ? "Đã đạt bậc thuần thục tối đa." : `Bậc tiếp theo: ${amount(nextThreshold)} lần · còn ${amount(nextThreshold - uses)} lần dùng.`}</p></div><p className="muted">Dùng công pháp trong khiêu chiến thật để tăng thuần thục; đánh thử không tăng. Mỗi bậc thêm 2 công, 1 hộ thể. Bậc 3 giảm 1 linh lực, bậc 5 giảm 1 hiệp hồi chiêu. Bậc mới có hiệu lực từ trận tiếp theo, không thể mua.</p></> : owned && <p className="muted">Đã học · Thuần thục {mastery}/{catalog.mastery.length}. Đánh thử không tăng thuần thục.</p>}
            {effect ? <p><b>{effect.name}</b>{skill.effect_value ? ` · Trị số ${skill.effect_value}` : ""}{skill.effect_rounds ? ` · ${skill.effect_rounds} hiệp` : ""}: {effect.description}</p> : <p className="muted">Không có hiệu ứng trạng thái riêng.</p>}
            {!owned && <p>Điều kiện học: {realmName(skill.realm)} · {amount(skill.cost)} linh thạch. {locked ? "Chưa đủ cảnh giới." : p.stones < skill.cost ? `Thiếu ${amount(skill.cost - p.stones)} linh thạch.` : "Đã đủ điều kiện."}</p>}
            {owned ? <button type="button" className="button secondary" disabled={busy || (!selected && (locked || selectedSkills.length >= 3))} aria-pressed={selected} onClick={() => toggleSkill(skill.id)}>{selected ? `Đã chọn · vị trí ${selectedSkills.indexOf(skill.id) + 1}` : locked ? `Cần ${realmName(skill.realm)}` : selectedSkills.length >= 3 ? "Đã chọn đủ 3 công pháp" : "Chọn vào bộ · Chưa lưu"}</button> : <button type="button" className="button primary" disabled={busy || locked || p.stones < skill.cost} onClick={() => void perform("skill.learn", { id: skill.id })}>{busy ? "Đang xử lý…" : `Học · ${amount(skill.cost)} linh thạch`}</button>}
          </article>;
        })}</div></section>
        {tab === "battle" && <section className="panel stack"><h3>{boss?.name} · Sẵn sàng thử bộ đã lưu?</h3>{battleActions}<button className="text-button" onClick={() => setTab("build")}>Mở chuẩn bị chuyên sâu & đổi đạo <ArrowRight size={15} aria-hidden="true" /></button></section>}
      </div>}
      {tab === "expedition" && <>
        {expedition && activeSite && <section className="idle-expedition-status">
          <div><span className="idle-running"><i />Đang lịch luyện · {activeSite.name}</span><h2>{cycles ? `${cycles} chu kỳ chờ thu hoạch` : `Chu kỳ tiếp theo · ${remainingTime(activeSite.interval_seconds - seconds % activeSite.interval_seconds)}`}</h2><p>{expedition.victories} thắng · {expedition.defeats} lần lui bước · Tối đa {activeSite.cap_seconds / 3600} giờ tích lũy</p></div>
          <div className="actions"><button className="button primary" disabled={busy || cycles < 1} onClick={() => void perform("combat.harvest", {})}>Thu hoạch</button><button className="button secondary" disabled={busy} onClick={() => setReturnPrompt(value => !value)}>Hồi động phủ</button></div>
          <p className="idle-fine-print">Bộ công pháp và chỉ số giữ nguyên lúc xuất hành. Hồi động phủ rồi xuất hành lại để dùng bộ mới. Bí cảnh không tự tiêu đan phù.</p>
          {returnPrompt && <div className="idle-return-confirm" role="alert"><p>Thu nhận các chu kỳ đã hoàn tất và dừng lịch luyện. Thời gian chưa đủ chu kỳ và chuỗi ba thắng nhận nguyên liệu còn dở sẽ bỏ khi trở về.</p><button className="button primary" disabled={busy} onClick={() => void perform("combat.return", {})}>Thu hoạch & trở về</button><button className="text-button" onClick={() => setReturnPrompt(false)}>Ở lại bí cảnh</button></div>}
          {expedition.last_harvest && <details><summary>Thu hoạch gần nhất · {expedition.last_harvest.wins}/{expedition.last_harvest.cycles} trận thắng</summary><p>{amount(expedition.last_harvest.reward.stones)} linh thạch · {amount(expedition.last_harvest.reward.cultivation)} tu vi{expedition.last_harvest.reward.item ? ` · ${expedition.last_harvest.reward.item_count} ${materialNames[expedition.last_harvest.reward.item]}` : ""}</p>{expedition.last_battle && <p>{expedition.last_battle.summary}</p>}</details>}
        </section>}
        <div className="idle-region-tabs" aria-label="Chọn bí cảnh">{catalog.expeditions.map((item, index) => <button key={item.id} aria-pressed={site?.id === item.id} onClick={() => setSiteID(item.id)}><span>0{index + 1}</span><strong>{catalog.regions.find(region => region.id === item.region)?.name}</strong><small>{p.flags[`combat:first-win:${item.boss_id}`] ? "Đã mở luyện công" : `Cần ${realmName(item.realm)}`}</small></button>)}</div>
        {site && <section className="idle-expedition-scene">
          <InkScene mode="journey" region={site.region} heroPath={expedition?.site_id === site.id ? expedition.hero.path : p.path} />
          <div className="idle-site-caption"><p className="eyebrow">BÍ CẢNH · {realmName(site.realm)}</p><h2>{site.name}</h2><p>{site.description}</p></div>
          <div className="idle-site-rewards"><div><span>Mỗi trận thắng</span><strong>{site.reward.stones} linh thạch · {site.reward.cultivation} tu vi</strong><small>Mỗi 3 trận thắng: 1 {materialNames[site.reward.item ?? ""] ?? "nguyên liệu"} · Chu kỳ {site.interval_seconds / 60} phút</small></div><button className="button primary" disabled={busy || !!expedition || !unlocked} onClick={() => void perform("combat.expedition", { id: site.id })}><MapPin size={16} />{expedition?.site_id === site.id ? "Đang luyện công tại đây" : expedition ? "Hồi động phủ để đổi nơi" : !unlocked ? "Vượt thủ lĩnh để mở" : "Xuất hành luyện công"}</button></div>
        </section>}
      </>}
      {tab === "relic" && <section className="stack">
        <div className="section-heading"><div><h2>Lò lửa không hỏi túi ngọc</h2><p className="muted">Pháp bảo và đan phù chỉ tốn tài nguyên kiếm trong game. Luyện chế, cường hóa luôn thành công; pháp bảo không thể chế tạo trùng.</p></div><Sparkles aria-hidden="true" /></div>
        <p className="notice">Có {amount(p.stones)} linh thạch. Chế tạo không tự trang bị; chọn ba ô và lưu ở “Công pháp & pháp bảo”. Cường hóa tối đa +5. Bí cảnh đang chạy giữ build cũ; trở về và xuất hành lại để dùng chỉ số mới.</p>
        <details className="panel build-materials"><summary>Nguồn nguyên liệu · Bí cảnh & cơ duyên</summary><p>Mỗi ba trận luyện công thắng nhận một nguyên liệu: Thanh Vân/Dược thảo, Vạn Trúc/Gỗ thơm, Hắc Phong/Quặng tốt, Vạn Tượng/Lụa. Thủ lĩnh còn lượt thưởng cũng rơi nguyên liệu; cơ duyên có thêm Giấy tuyên và quà hữu duyên. Nguyên liệu không bán bằng tiền thật.</p><div className="actions">{Object.entries(materialNames).map(([id, name]) => <span className="badge" key={id}>{name}: {amount(p.inventory[id] ?? 0)}</span>)}</div></details>
        <h2>Pháp bảo · Ba ô riêng biệt</h2>
        <div className="card-grid">{catalog.relics.map(item => {
          const owned = p.relics.includes(item.id);
          const slot = catalog.slots.find(entry => entry.id === item.slot);
          const level = p.refines[item.id] ?? 0;
          const stats = refinedStats(item, level);
          const nextStats = refinedStats(item, level + 1);
          const stones = Math.max(20, Math.floor(item.cost / 5) * (level + 1));
          const materials = level + 1;
          const material = slot?.material ?? "";
          const available = p.inventory[material] ?? 0;
          const canRefine = owned && level < 5 && p.stones >= stones && available >= materials;
          const rarity = ({ common: "Thường", rare: "Hiếm", epic: "Sử thi", legendary: "Truyền thuyết" } as Record<string, string>)[item.rarity] ?? item.rarity;
          return <article key={item.id} className="card stack">
            <div className="section-heading"><span className="badge">{slot?.name} · {rarity}</span>{p.equipment[item.slot] === item.id && <span className="badge">Đang trang bị · {slot?.name}</span>}</div>
            <h3>{item.name} {owned && `+${level}`}</h3><p className="muted">{item.description}</p><p>{owned ? `Đã sở hữu · Cường hóa +${level}/5` : "Chưa sở hữu"}</p><p>Công +{stats.power} · Thủ +{stats.guard}</p>
            {!owned ? <><p>Chế tạo: {amount(item.cost)} linh thạch · Không cần nguyên liệu.</p><button type="button" className="button primary" disabled={busy || p.stones < item.cost} onClick={() => void perform("relic.craft", { id: item.id })}>{p.stones < item.cost ? `Thiếu ${amount(item.cost - p.stones)} linh thạch` : "Chế tạo pháp bảo"}</button></> : level >= 5 ? <button type="button" className="button secondary" disabled>Đã cường hóa tối đa +5</button> : <>
              <p>Lên +{level + 1}: Công +{nextStats.power} · Thủ +{nextStats.guard}</p><p>Chi phí: {amount(stones)} linh thạch + {materials} {materialNames[material] ?? material} (có {amount(available)}).</p>
              <button type="button" className="button primary" disabled={busy || !canRefine} onClick={() => void perform("relic.refine", { id: item.id })}>{canRefine ? `Cường hóa lên +${level + 1}` : "Chưa đủ linh thạch hoặc nguyên liệu"}</button>
            </>}
          </article>;
        })}</div>
        <h2>Luyện đan & chế phù</h2><p className="notice">Mỗi lần luyện nhận 1 vật phẩm. Chỉ khi bật “Tự dùng đan phù” trước thử luyện mới tiêu vật phẩm, tối đa 2 mỗi trận. Bí cảnh không dùng đan phù.</p>
        <div className="card-grid">{catalog.consumables.map(item => {
          const material = materialNames[item.material] ?? item.material;
          const available = p.inventory[item.material] ?? 0;
          const enough = p.stones >= item.stones && available >= item.material_count;
          return <article className="card stack" key={item.id}><div className="section-heading"><h3>{item.name}</h3><span className="badge">Có {amount(p.inventory[item.id] ?? 0)}</span></div><p>{item.description}</p><p className="muted">Chi phí: {amount(item.stones)} linh thạch + {item.material_count} {material} (có {amount(available)}).</p><button type="button" className="button primary" disabled={busy || !enough} onClick={() => void perform("item.craft", { id: item.id })}>{enough ? `Luyện 1 ${item.name}` : "Chưa đủ linh thạch hoặc nguyên liệu"}</button></article>;
        })}</div>
      </section>}
    </div>
  );
}
