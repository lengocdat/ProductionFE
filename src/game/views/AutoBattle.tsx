"use client";

import { useEffect, useMemo, useState } from "react";
import { FastForward, Pause, Play, RotateCcw, Settings2, Swords, X } from "lucide-react";
import type { BattleEvent, BattleSession, Catalog } from "../types";
import InkScene from "../InkScene";

const materials: Record<string, string> = { herb: "Dược thảo", wood: "Gỗ thơm", ore: "Quặng tốt", silk: "Lụa", paper: "Giấy tuyên" };

export default function AutoBattle({ battle, catalog, onClose, onPrepare, onRetry, busy = false }: { battle: BattleSession; catalog: Catalog; onClose: () => void; onPrepare?: () => void; onRetry?: () => void; busy?: boolean }) {
 const [cursor, setCursor] = useState(0);
 const [paused, setPaused] = useState(false);
 const [speed, setSpeed] = useState(1);
 const [reduced, setReduced] = useState(false);
 useEffect(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = () => { setReduced(preference.matches); if (preference.matches) setCursor(battle.log.length); };
  sync(); preference.addEventListener("change", sync);
  return () => preference.removeEventListener("change", sync);
 }, [battle.id, battle.log.length]);
 useEffect(() => {
  if (paused || reduced || cursor >= battle.log.length) return;
  const timer = window.setTimeout(() => setCursor(value => value + 1), 900 / speed);
  return () => window.clearTimeout(timer);
 }, [cursor, paused, reduced, speed, battle.log.length]);
 const health = useMemo(() => {
  const hp = { hero: battle.hero.max_hp, foe: battle.foe.max_hp };
  for (let i = 0; i < cursor; i++) hp[battle.log[i].target] = battle.log[i].hp;
  return hp;
 }, [cursor, battle]);
 const assessment = useMemo(() => {
  let direct = 0, periodic = 0, healed = 0, previousHP = battle.hero.max_hp;
  let largest: BattleEvent | undefined;
  const uses = new Map<string, { name: string; count: number }>();
  const rounds = new Map<number, { hero: string[]; foe: string[]; hp: number }>();
  for (const entry of battle.log) {
   const round = rounds.get(entry.round) ?? { hero: [], foe: [], hp: previousHP };
   if (entry.target === "hero") {
    if (entry.damage > 0) {
     if (entry.kind === "effect") periodic += entry.damage;
     else direct += entry.damage;
     if (!largest || entry.damage > largest.damage) largest = entry;
    }
    healed += Math.max(0, entry.hp - previousHP);
    previousHP = entry.hp;
   }
   round.hp = previousHP;
   if (entry.kind === "attack" || entry.kind === "guard" || entry.kind === "recover" || entry.kind === "item" || entry.kind === "stun") {
    round[entry.actor].push(entry.skill);
   }
   rounds.set(entry.round, round);
   if (entry.actor === "hero" && entry.kind === "attack" && entry.skill_id) {
    const used = uses.get(entry.skill_id) ?? { name: entry.skill, count: 0 };
    used.count++;
    uses.set(entry.skill_id, used);
   }
  }
  return { direct, periodic, healed, largest, uses: [...uses.values()], rounds: [...rounds.entries()] };
 }, [battle]);
 const event = cursor ? battle.log[cursor - 1] : undefined;
 const finished = cursor >= battle.log.length;
 const technique = event?.skill_id ? battle.skills.find(skill => skill.id === event.skill_id) : undefined;
 const plan = catalog.boss_plans[battle.boss_id];
 const bossMove = event?.actor === "foe" && event.kind === "attack" ? plan?.pattern.find(move => move.name === event.skill) ?? plan?.rage.find(move => move.name === event.skill) : undefined;
 const effect = event?.kind === "effect" || event?.kind === "stun" ? catalog.effects.find(item => item.name === event.skill)?.id : event?.kind === "item" ? catalog.consumables.find(item => item.id === event.skill_id)?.kind : technique?.effect ?? bossMove?.effect;
 const reward = battle.reward;
 return <section className="auto-battle" aria-label="Chiến đấu tự động">
  <header className="idle-section-heading"><div><p className="eyebrow">{battle.practice ? "TẬP LUYỆN · KHÔNG THƯỞNG, KHÔNG TIÊU ĐỒ" : finished ? "KẾT QUẢ VƯỢT ẢI" : `ĐẤU PHÁP TỰ ĐỘNG · HIỆP ${event?.round ?? 1}`}</p><h2>{battle.foe.name}</h2></div><button className="icon-button" aria-label="Đóng chiến báo" onClick={onClose}><X size={20} /></button></header>
  <div className="auto-battle-health"><span>{battle.hero.name}<b>{health.hero}/{battle.hero.max_hp}</b></span><span>{battle.foe.name}<b>{health.foe}/{battle.foe.max_hp}</b></span></div>
  <InkScene mode="battle" region={battle.region} heroPath={battle.hero.path} bossID={battle.boss_id} heroHP={health.hero} heroMaxHP={battle.hero.max_hp} foeHP={health.foe} foeMaxHP={battle.foe.max_hp} event={event} effect={effect} speed={speed} paused={paused || reduced} />
  <p className="auto-battle-caption" role="status">{finished ? battle.status === "won" ? battle.practice ? "Bộ chuẩn bị này đã thắng trận tập. Chưa tính vượt ải." : "Đã vượt qua thử luyện." : battle.status === "fled" ? "Trận cũ đã rút lui." : `Chưa hạ được đối thủ: còn ${battle.foe.hp}/${battle.foe.max_hp} sinh lực sau ${battle.round} hiệp.` : event ? `${event.actor === "hero" ? battle.hero.name : battle.foe.name} · ${event.skill} — ${event.text}` : "Vận chuyển linh lực, tự động thi triển bộ công pháp đã chuẩn bị."}</p>
  <div className="auto-battle-controls"><div className="actions">{!finished && <><button className="button secondary" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? <Play size={15} /> : <Pause size={15} />}{paused ? "Tiếp tục" : "Tạm dừng"}</button><button className="button secondary" onClick={() => setSpeed(value => value === 1 ? 2 : 1)}>×{speed}</button><button className="text-button" onClick={() => setCursor(battle.log.length)}><FastForward size={15} />Kết quả</button></>}{finished && !reduced && <button className="button secondary" onClick={() => { setCursor(0); setPaused(false); }}><RotateCcw size={15} />Xem lại</button>}</div><small>Máy chủ đã lưu kết quả. Hoạt ảnh và xem lại không cấp thêm thưởng.</small></div>
  {finished && <>
   <div className={`idle-battle-result ${battle.status === "won" ? "is-victory" : ""}`}>
    <span className="idle-result-seal">{battle.status === "won" ? "THẮNG" : "BẠI"}</span>
    <div><h3>{battle.practice ? "Kết quả thử bộ công pháp" : battle.status === "won" ? "Một cửa ải đã qua" : "Đổi cách chuẩn bị, thử lại"}</h3>
     {battle.practice ? <p>Không nhận tài nguyên, thuần thục hay chiến tích. Không mở ải, không tiêu đan phù và không đổi thời gian hồi thử luyện thật.</p> : battle.status === "won" ? <p>{reward.stones.toLocaleString("vi-VN")} linh thạch · {reward.cultivation.toLocaleString("vi-VN")} tu vi · {reward.tickets} vé · {reward.season_xp} kinh nghiệm{reward.item ? ` · ${reward.item_count ?? 1} ${materials[reward.item] ?? reward.item}` : ""}</p> : <p>Không mất trang bị hoặc tu vi. {battle.region === "thanh-van" ? "Có thể thử lại ngay tại Thanh Vân." : "Xem thời gian hồi tại cửa ải."}</p>}
     {!battle.practice && <small>Đã dùng {battle.items_used}/{battle.item_limit} đan phù. Vật phẩm đã dùng vẫn tiêu hao khi bại trận.</small>}
    </div>
   </div>
   <section className="trial-feedback" aria-label="Phân tích trận vừa đánh">
    <h3>Điều gì đã xảy ra?</h3>
    <dl><div><dt>Sát thương đòn nhận</dt><dd>{assessment.direct}</dd></div><div><dt>Sát thương trạng thái</dt><dd>{assessment.periodic}</dd></div><div><dt>Đã hồi sinh lực</dt><dd>{assessment.healed}</dd></div><div><dt>Đối thủ còn</dt><dd>{battle.foe.hp}<small>/{battle.foe.max_hp} HP</small></dd></div></dl>
    {assessment.largest && <p><strong>Đòn gây sát thương lớn nhất:</strong> {assessment.largest.skill}, hiệp {assessment.largest.round}, {assessment.largest.damage} sát thương. {assessment.largest.text}</p>}
    <p><strong>Công pháp thực sự đã ra:</strong> {assessment.uses.length ? assessment.uses.map(skill => `${skill.name} ×${skill.count}`).join(" · ") : "Không ra được công pháp; chỉ có các hành động ghi trong diễn biến."}</p>
    <p className="muted">Không bắt buộc lấp đủ ba ô. Bộ ít chiêu giúp quay lại công pháp chủ lực sớm hơn; đánh thử để so khả năng sống sót và kết liễu.</p>
    {battle.status === "lost" && <p className="trial-adjustment">{battle.round >= 40 && battle.hero.hp > 0 ? "Còn sống nhưng hết 40 hiệp. Bộ này thiếu sát thương để kết liễu; hãy thử thay một chiêu phòng thủ bằng công pháp tấn công." : assessment.periodic > assessment.direct ? "Phần lớn sát thương đến từ trạng thái kéo dài. Thử rút ngắn trận bằng công pháp gây sát thương; trận thật có thể cho phép dùng phù giải đang sở hữu." : "Các đòn trực tiếp đã hạ bạn. So nhịp hộ thể với đòn nặng trong từng hiệp. Thử cân bằng Căn Cốt và Linh Khí, kết hợp pháp bảo phòng thủ; chỉ tăng máu có thể khiến trận kéo dài mà vẫn không xuyên được giáp."}</p>}
    <p className="idle-fine-print">Phân tích từ log máy chủ, gồm sát thương vượt phần HP còn lại. Tập luyện miễn phí cho phép so sánh bộ mới, không bảo đảm chiến thắng.</p>
    {(onPrepare || onRetry) && <div className="actions">{onPrepare && <button className="button secondary" disabled={busy} onClick={onPrepare}><Settings2 size={16} />Chỉnh cách chuẩn bị</button>}{onRetry && <button className="button primary" disabled={busy} onClick={onRetry}><Swords size={16} />{battle.practice ? "Tập lại bộ hiện tại" : battle.status === "lost" && battle.region === "thanh-van" ? "Thử lại ngay" : "Khiêu chiến lại"}</button>}</div>}
    <details><summary>Nhịp công pháp từng hiệp</summary><ol className="trial-rounds">{assessment.rounds.map(([round, detail]) => <li key={round}><strong>Hiệp {round}</strong><span>Bạn: {detail.hero.join(" → ") || "Không ra chiêu"}</span><span>Đối thủ: {detail.foe.join(" → ") || "Không ra chiêu"}</span><small>Sinh lực cuối hiệp: {detail.hp}</small></li>)}</ol></details>
   </section>
  </>}
  <details className="idle-battle-log"><summary>Diễn biến & bộ công pháp</summary><p>{battle.skills.map(skill => `${skill.name} · bậc ${skill.mastery}`).join(" → ")}</p><ol>{battle.log.map(entry => <li key={entry.seq}><strong>Hiệp {entry.round} · {entry.skill}</strong><p>{entry.text}</p></li>)}</ol><p>{catalog.paths.find(path => path.id === battle.hero.path)?.name} · Né {battle.hero.dodges} đòn</p></details>
 </section>;
}
