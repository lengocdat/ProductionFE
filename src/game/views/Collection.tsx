"use client";

import { useState } from "react";
import type { Catalog, Chronicle, GameProps, Reward } from "../types";
import CosmeticArt, { cosmeticDetails } from "../CosmeticArt";
import WheelScene from "../WheelScene";

const number = new Intl.NumberFormat("vi-VN");
const itemNames: Record<string, string> = { tea: "Trà núi", herb: "Dược thảo", ore: "Quặng tốt", paper: "Giấy tuyên", silk: "Lụa", wood: "Gỗ thơm" };
const rarityNames: Record<string, string> = { common: "Phổ thông", uncommon: "Tinh xảo", rare: "Hiếm", epic: "Sử thi", legendary: "Truyền thuyết" };
const historyNames: Record<string, string> = { creation: "Khởi hành", cultivation: "Tu luyện", breakthrough: "Đột phá", adventure: "Cơ duyên", alignment: "Đạo tâm", relation: "Nhân duyên", combat: "Đấu pháp", battle: "Đấu pháp", practice: "Luyện tập", achievement: "Thành tựu", wheel: "Luân Hồi Bàn", season: "Mùa", guild: "Tông môn", arena: "Đấu trường", purchase: "Cửa hàng", commerce: "Cửa hàng" };
const sections = [{ id: "history", name: "Tiểu sử" }, { id: "inventory", name: "Hành trang" }, { id: "achievements", name: "Thành tựu" }, { id: "wheel", name: "Luân Hồi Bàn" }, { id: "season", name: "Thanh Vân ký" }, { id: "cosmetics", name: "Diện mạo & riêng tư" }];
const pityLimit = 20;

function rewardText(reward: Reward, catalog: Catalog) {
 const parts: string[] = [];
 if (reward.stones) parts.push(`${number.format(reward.stones)} linh thạch`);
 if (reward.jade) parts.push(`${number.format(reward.jade)} tiên ngọc`);
 if (reward.cultivation) parts.push(`${number.format(reward.cultivation)} tu vi`);
 if (reward.tickets) parts.push(`${number.format(reward.tickets)} Vé Cơ Duyên`);
 if (reward.season_xp) parts.push(`${number.format(reward.season_xp)} kinh nghiệm mùa`);
 if (reward.item) parts.push(`${reward.item_count || 1} ${catalog.consumables.find(item => item.id === reward.item)?.name ?? itemNames[reward.item] ?? reward.item}`);
 if (reward.relic) parts.push(catalog.relics.find(relic => relic.id === reward.relic)?.name ?? reward.relic);
 if (reward.skill) parts.push(catalog.skills.find(skill => skill.id === reward.skill)?.name ?? reward.skill);
 return parts.join(" · ");
}





export default function Collection({ snapshot, act, busy }: GameProps) {
 const [tab, setTab] = useState("history");
 const [historyKind, setHistoryKind] = useState("all");
 const [historyQuery, setHistoryQuery] = useState("");
 const [selectedID, setSelectedID] = useState("");
 const [achievementFilter, setAchievementFilter] = useState("all");
 const [shareStatus, setShareStatus] = useState("");
 const [sharing, setSharing] = useState(false);
 const p = snapshot.player;
 if (!p) return null;
 const catalog = snapshot.catalog;
 const perform = async (type: string, payload: Record<string, unknown> = {}) => { try { await act(type, payload); } catch { /* Shell displays server errors and retry state. */ } };
 const history = [...p.history].sort((left, right) => Date.parse(right.at) - Date.parse(left.at));
 const selected = history.find(entry => entry.id === selectedID) ?? history[0];
 const shareText = (entry: Chronicle) => `Cẩu Đạo Ký · ${p.name}\n${entry.title}\n${entry.text}\n${new Date(entry.at).toLocaleString("vi-VN")}`;
 const share = async (entry: Chronicle, copy: boolean) => {
  setSharing(true);
  setShareStatus("");
  try {
   if (!copy && navigator.share) {
    await navigator.share({ title: `Cẩu Đạo Ký · ${entry.title}`, text: shareText(entry) });
    setShareStatus("Đã gửi nội dung tới trình chia sẻ của thiết bị.");
   } else if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(shareText(entry));
    setShareStatus("Đã sao chép đúng trang tiểu sử đang chọn.");
   } else {
    setShareStatus("Trình duyệt không hỗ trợ sao chép tự động. Chọn và sao chép nội dung trong ô bên dưới.");
   }
  } catch (error) {
   if (error instanceof Error && error.name === "AbortError") setShareStatus("Đã hủy chia sẻ; không có thay đổi trong game.");
   else setShareStatus("Không thể chia sẻ tự động. Bạn vẫn có thể chọn và sao chép nội dung bên dưới.");
  } finally { setSharing(false); }
 };
 const filteredHistory = history.filter(entry => (historyKind === "all" || entry.kind === historyKind) && `${entry.title} ${entry.text}`.toLocaleLowerCase("vi-VN").includes(historyQuery.toLocaleLowerCase("vi-VN")));
 const unlocked = new Set(p.achievements);
 const achievements = catalog.achievements.filter(item => achievementFilter === "all" || (achievementFilter === "earned" ? unlocked.has(item.id) : !unlocked.has(item.id)));
 const currentAppearance = cosmeticDetails(p.equipped_cosmetic, catalog);
 const latestWheel = history.find(entry => entry.kind === "wheel");
 const weight = catalog.wheel.reduce((sum, item) => sum + item.weight, 0);
 const rare = (rarity: string) => ["rare", "epic", "legendary"].includes(rarity);
 const rareWeight = catalog.wheel.reduce((sum, item) => sum + (rare(item.rarity) ? item.weight : 0), 0);
 const pityActive = p.pity >= pityLimit - 1;
 const nextTier = catalog.season.find(tier => tier.xp > p.season_xp);
 const lastTier = catalog.season[catalog.season.length - 1];
 return <div className="game-view stack">
  <header className="page-heading"><div><p className="eyebrow">Dấu chân thành đạo đồ</p><h1>Đạo đồ</h1><p className="muted">Những gì bạn đã trải qua, những gì mang theo. Mọi phần thưởng được ghi nhận bởi máy chủ.</p></div><span className="badge">{p.name} · {currentAppearance.name}</span></header>
  <div className="tabs" aria-label="Nội dung đạo đồ">{sections.map(section => <button key={section.id} className={`tab ${tab === section.id ? "active" : ""}`} aria-pressed={tab === section.id} onClick={() => setTab(section.id)}>{section.name}</button>)}</div>

  {tab === "history" && <>
   <section className="panel stack"><div className="section-heading"><div><p className="eyebrow">Mực thật, chuyện thật</p><h2>Tiểu sử tu hành</h2></div><span className="badge">{history.length} dòng ký ức gần nhất</span></div><p className="muted">Lưu tối đa 200 ghi chép gần nhất. Lịch sử quan hệ và lựa chọn không tự công khai; chỉ nội dung bạn chủ động chọn mới được chia sẻ ra ngoài.</p><div className="split-grid"><label className="field">Tìm trong tiểu sử<input value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} placeholder="Tên chuyện hoặc lời đã nói" /></label><label className="field">Loại ghi chép<select value={historyKind} onChange={event => setHistoryKind(event.target.value)}><option value="all">Tất cả</option>{Array.from(new Set(history.map(entry => entry.kind))).map(kind => <option value={kind} key={kind}>{historyNames[kind] ?? kind}</option>)}</select></label></div></section>
   {selected && <section className="panel stack" aria-labelledby="share-heading"><div className="section-heading"><h2 id="share-heading">Trang đang chọn</h2><span className="badge">{historyNames[selected.kind] ?? selected.kind}</span></div><h3>{selected.title}</h3><p style={{ whiteSpace: "pre-line", lineHeight: 1.85, overflowWrap: "anywhere" }}>{selected.text}</p><time className="muted" dateTime={selected.at}>{new Date(selected.at).toLocaleString("vi-VN")}</time><div className="actions"><button className="button primary" disabled={sharing} onClick={() => void share(selected, false)}>Chia sẻ trang này</button><button className="button secondary" disabled={sharing} onClick={() => void share(selected, true)}>Sao chép nội dung</button></div><details><summary>Xem văn bản sẽ chia sẻ</summary><label className="field">Bạn có thể chọn văn bản để sao chép<textarea readOnly rows={6} value={shareText(selected)} onFocus={event => event.currentTarget.select()} /></label></details><p role="status" aria-live="polite">{shareStatus}</p></section>}
   <div className="stack">{filteredHistory.length ? filteredHistory.map(entry => <article className="card stack" key={entry.id}><div className="section-heading"><span className="eyebrow">{historyNames[entry.kind] ?? entry.kind}</span><time className="muted" dateTime={entry.at}>{new Date(entry.at).toLocaleString("vi-VN")}</time></div><h3>{entry.title}</h3><p style={{ whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{entry.text}</p><button className={`button ${selected?.id === entry.id ? "primary" : "secondary"}`} aria-pressed={selected?.id === entry.id} onClick={() => { setSelectedID(entry.id); setShareStatus(""); }}>{selected?.id === entry.id ? "Đang chọn để chia sẻ" : "Chọn trang này để chia sẻ"}</button></article>) : <p className="empty">{history.length ? "Không có ghi chép phù hợp bộ lọc." : "Hành trình chưa có ghi chép. Hãy nhận tu luyện hoặc bước vào giang hồ."}</p>}</div>
  </>}

  {tab === "inventory" && <>
   <section className="stat-grid"><div className="stat"><span>Linh thạch</span><strong>{number.format(p.stones)}</strong></div><div className="stat"><span>Ngọc ngoại hình</span><strong>{number.format(p.jade)}</strong></div><div className="stat"><span>Vé Cơ Duyên</span><strong>{number.format(p.tickets)}</strong></div><div className="stat"><span>Tu vi</span><strong>{number.format(p.cultivation)}</strong></div></section>
   <section className="panel stack"><h2>Vật phẩm hành trình</h2><p className="muted">Nguyên liệu dùng tặng hữu duyên, cường hóa hoặc chế đan phù tại Bí cảnh → Lò luyện. Đan phù chỉ dùng khi cho phép trước khiêu chiến; luyện công offline không tiêu vật phẩm.</p><div className="card-grid">{Object.entries(p.inventory).filter(([, count]) => count > 0).map(([id, count]) => <article className="card stack" key={id}><h3>{catalog.consumables.find(item => item.id === id)?.name ?? itemNames[id] ?? id}</h3><strong>× {number.format(count)}</strong><p className="muted">{catalog.consumables.find(item => item.id === id)?.description ?? (catalog.npcs.filter(npc => npc.gift === id).map(npc => npc.name).join(", ") || "Nguyên liệu luyện chế từ hành trình")}</p></article>)}</div>{!Object.values(p.inventory).some(count => count > 0) && <p className="empty">Hành trang chưa có vật phẩm. Chọn cơ duyên hoặc luyện công ở bí cảnh để nhận nguyên liệu.</p>}</section>
   <section className="panel stack"><div className="section-heading"><h2>Pháp bảo sở hữu</h2><span className="badge">{p.relics.length}/{catalog.relics.length}</span></div><p className="muted">Ba ô: binh khí, hộ giáp và phù ấn. Chế tạo, cường hóa đến +5 tại Lò luyện. Bí cảnh đang chạy giữ nguyên bộ cũ; trở về và xuất hành lại để dùng bộ mới.</p><div className="card-grid">{p.relics.map(id => {
    const relic = catalog.relics.find(item => item.id === id);
    if (!relic) return null;
    const level = p.refines[id] ?? 0;
    const equipped = p.equipment[relic.slot] === id;
    return <article className="card stack" key={id}><span className="badge">{catalog.slots.find(slot => slot.id === relic.slot)?.name} · {rarityNames[relic.rarity] ?? relic.rarity}</span><h3>{relic.name} +{level}</h3><p className="muted">{relic.description}</p><p>Uy lực +{relic.power + level * (1 + Math.floor(relic.power / 6))} · Phòng thủ +{relic.guard + level * (1 + Math.floor(relic.guard / 6))}</p><button className={`button ${equipped ? "primary" : "secondary"}`} disabled={busy || equipped} onClick={() => void perform("build.equip", { skills: p.equipped_skills, equipment: { ...p.equipment, [relic.slot]: id } })}>{equipped ? "Đang trang bị" : "Trang bị vào ô tương ứng"}</button></article>;
   })}</div></section>
   <section className="panel stack"><h2>Công pháp đã học · {p.skills.length}/{catalog.skills.length}</h2><p className="muted">Chọn tối đa ba công pháp tại Bí cảnh → Công pháp & pháp bảo. Tự động thi triển theo thứ tự đã lưu. Khiêu chiến thật tăng thuần thục; đánh thử không tăng, luyện công offline chỉ nhận tài nguyên.</p><div className="card-grid">{p.skills.map(id => { const skill = catalog.skills.find(item => item.id === id); const slot = p.equipped_skills.indexOf(id); return <article className="card stack" key={id}><h3>{skill?.name ?? id}</h3><p className="muted">{skill?.description}</p>{slot >= 0 && <span className="badge">Đang mang · Ô {slot + 1}</span>}</article>; })}</div></section>
  </>}

  {tab === "achievements" && <>
   <section className="panel stack"><div className="section-heading"><div><p className="eyebrow">Không đo bằng ví tiền</p><h2>Thành tựu tu hành</h2></div><span className="badge">{catalog.achievements.filter(item => unlocked.has(item.id)).length}/{catalog.achievements.length} đã đạt</span></div><p className="muted">Thưởng tự nhận một lần khi máy chủ ghi nhận đủ điều kiện. Không yêu cầu mua hàng, đăng bài hay điểm danh liên tục.</p><div className="actions">{[{ id: "all", name: "Tất cả" }, { id: "pending", name: "Đang tu luyện" }, { id: "earned", name: "Đã đạt" }].map(filter => <button className={`button ${achievementFilter === filter.id ? "primary" : "secondary"}`} key={filter.id} aria-pressed={achievementFilter === filter.id} onClick={() => setAchievementFilter(filter.id)}>{filter.name}</button>)}</div></section>
   <div className="card-grid">{achievements.map(item => { const earned = unlocked.has(item.id); const value = Math.min(item.threshold, Math.max(0, p.stats[item.stat] ?? 0)); return <article className="card stack" key={item.id}><span className="badge">{earned ? "Đã đạt · thưởng đã ghi nhận" : "Đang tu luyện"}</span><h3>{item.name}</h3><p className="muted">{item.description}</p><progress className="progress" aria-label={`Tiến độ ${item.name}`} max={item.threshold} value={earned ? item.threshold : value} style={{ width: "100%" }} /><p>{number.format(earned ? item.threshold : value)} / {number.format(item.threshold)}</p><p className="muted">Thưởng: {rewardText(item.reward, catalog)}</p></article>; })}</div>{!achievements.length && <p className="empty">Chưa có thành tựu trong bộ lọc này.</p>}
  </>}

  {tab === "wheel" && <>
   <WheelScene tickets={p.tickets} disabled={busy || p.tickets < 1 || weight <= 0} latest={latestWheel} spin={() => act("wheel.spin")} />
   <section className="panel stack"><div className="section-heading"><h2>Cơ duyên không bán lấy tiền</h2><span className="badge">{number.format(p.stats.wheel_spins ?? 0)} lượt đã quay</span></div><p className="muted">Một lượt dùng một Vé Cơ Duyên kiếm từ chơi và thành tựu. Vé không bán, không đổi từ ngọc hay thanh toán. Các pháp bảo đều có đường luyện chế bằng linh thạch.</p><progress className="progress" aria-label="Bộ đếm bảo đảm hiếm" value={Math.min(p.pity, pityLimit - 1)} max={pityLimit - 1} style={{ width: "100%" }} /><p className="notice">{pityActive ? "Lượt tiếp theo chắc chắn là Hiếm trở lên." : `Chậm nhất ${pityLimit - p.pity} lượt nữa nhận một kết quả Hiếm trở lên.`} Mỗi kết quả Hiếm trở lên đặt bộ đếm về 0, kể cả vật phẩm trùng. Mỗi vật phẩm trùng được đổi đúng 120 linh thạch, không quay lại và không mất thêm vé.</p></section>
   <section className="panel stack"><h2>Xác suất công khai</h2><p className="muted">Tỉ lệ thường dùng trọng số do máy chủ công bố. Ở lượt bảo đảm thứ 20 (sau 19 lượt không hiếm), chỉ quay trong nhóm Hiếm trở lên theo trọng số tương đối. Không có xác suất riêng cho người trả tiền.</p><div className="card-grid">{catalog.wheel.map(prize => { const duplicate = !!prize.reward.relic && p.relics.includes(prize.reward.relic) || !!prize.reward.skill && p.skills.includes(prize.reward.skill); const odds = weight ? prize.weight / weight * 100 : 0; const guaranteed = rare(prize.rarity) && rareWeight ? prize.weight / rareWeight * 100 : 0; return <article className="card stack" key={prize.id}><span className="badge">{rarityNames[prize.rarity] ?? prize.rarity}</span><h3>{prize.name}</h3><p>{rewardText(prize.reward, catalog)}</p><p>Thường: {number.format(odds)}%<br />Lượt bảo đảm: {number.format(guaranteed)}%</p><strong>Lượt tiếp theo: {number.format(pityActive ? guaranteed : odds)}%</strong>{duplicate && <p className="notice">Đã sở hữu · nếu trúng, nhận 120 linh thạch.</p>}</article>; })}</div></section>
  </>}

  {tab === "season" && <>
   <section className="panel stack"><p className="eyebrow">Hai tuyến, chung một hành trình</p><h2>Thanh Vân ký</h2><p className="muted">20 mốc, mỗi 100 kinh nghiệm mùa. Nhận kinh nghiệm qua tu luyện, cơ duyên, chiến đấu và trò chuyện. Không hết hạn theo đồng hồ, không cần chơi liên tiếp.</p><div className="section-heading"><strong>{number.format(p.season_xp)} kinh nghiệm mùa</strong><span className="badge">{p.season_premium ? "Đã mở tuyến ngoại hình" : "Tuyến miễn phí"}</span></div><progress className="progress" aria-label="Tiến độ mùa" value={Math.min(p.season_xp, lastTier?.xp ?? 2000)} max={lastTier?.xp ?? 2000} style={{ width: "100%" }} /><p>{nextTier ? `Còn ${number.format(nextTier.xp - p.season_xp)} kinh nghiệm để mở mốc ${nextTier.level}.` : "Đã mở toàn bộ mốc mùa. Các phần thưởng chưa nhận vẫn ở đây."}</p><p className="notice">Tuyến ngoại hình chỉ có diện mạo, không cộng chỉ số, không có vé quay và không nhân đôi thưởng miễn phí. Quyền Vé Mùa ở cửa hàng không tự hoàn thành các mốc.</p></section>
   <div className="card-grid">{catalog.season.map(tier => { const available = p.season_xp >= tier.xp; const freeClaimed = p.season_claims.includes(`free:${tier.level}`); const premiumClaimed = p.season_claims.includes(`premium:${tier.level}`); return <article className="card stack" key={tier.level}><div className="section-heading"><h3>Mốc {tier.level}</h3><span className="badge">{number.format(tier.xp)} XP</span></div><p className="muted">{available ? "Đã đủ kinh nghiệm" : `Còn ${number.format(tier.xp - p.season_xp)} XP`}</p><h4>Tuyến miễn phí</h4><p>{rewardText(tier.free, catalog)}</p><button className="button primary" disabled={busy || !available || freeClaimed} onClick={() => void perform("season.claim", { level: tier.level, track: "free" })}>{freeClaimed ? "Đã nhận miễn phí" : available ? "Nhận thưởng miễn phí" : "Chưa đủ kinh nghiệm"}</button><h4>Tuyến ngoại hình</h4><CosmeticArt id={tier.cosmetic} catalog={catalog} /><p>{cosmeticDetails(tier.cosmetic, catalog).name}</p><button className="button secondary" disabled={busy || !available || !p.season_premium || premiumClaimed} onClick={() => void perform("season.claim", { level: tier.level, track: "premium" })}>{premiumClaimed ? "Đã nhận ngoại hình" : !p.season_premium ? "Cần quyền Vé Mùa" : !available ? "Chưa đủ kinh nghiệm" : "Nhận ngoại hình"}</button></article>; })}</div>
  </>}

  {tab === "cosmetics" && <>
   <section className="panel stack"><div className="section-heading"><div><p className="eyebrow">Đạo danh, không phải sức mạnh</p><h2>Diện mạo đang dùng</h2></div><span className="badge">{p.cosmetics.length} ngoại hình sở hữu</span></div><CosmeticArt id={p.equipped_cosmetic} catalog={catalog} /><h3>{p.name} · {currentAppearance.name}</h3><p className="muted">{currentAppearance.description}</p></section>
   <div className="card-grid">{p.cosmetics.map(id => { const appearance = cosmeticDetails(id, catalog); return <article className="card stack" key={id}><CosmeticArt id={id} catalog={catalog} /><h3>{appearance.name}</h3><p className="muted">{appearance.description}</p><button className={`button ${p.equipped_cosmetic === id ? "primary" : "secondary"}`} disabled={busy || p.equipped_cosmetic === id} onClick={() => void perform("cosmetic.equip", { id })}>{p.equipped_cosmetic === id ? "Đang sử dụng" : "Dùng diện mạo này"}</button></article>; })}</div>
   <section className="panel stack"><p className="eyebrow">Tự chọn điều người khác được biết</p><h2>Quyền riêng tư hồ sơ</h2><p className="muted">Hồ sơ công khai chỉ chứa đạo danh, con đường tu, lập trường, cảnh giới, diện mạo, thành tựu và dữ liệu đấu trường. Không công khai email, số dư, đơn hàng, tiểu sử hay nội dung quan hệ NPC.</p><p className="notice">Ẩn hồ sơ chặn người khác mở trang hồ sơ chi tiết; không xóa tên bạn khỏi bảng xếp hạng, tông môn hay bài đã đăng. Tiểu sử chỉ chia sẻ khi bạn chủ động chọn một trang.</p><button className={`button ${p.public_profile ? "primary" : "secondary"}`} role="switch" aria-checked={p.public_profile} disabled={busy} onClick={() => void perform("profile.visibility", { enabled: !p.public_profile })}>{p.public_profile ? "Hồ sơ đang công khai · Chọn để ẩn" : "Hồ sơ đang riêng tư · Chọn để công khai"}</button></section>
  </>}
 </div>;
}
