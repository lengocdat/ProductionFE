"use client";

import { useEffect, useState } from "react";
import { Flag, MessageSquare, Shield, Swords, Trophy, Users } from "lucide-react";
import { request } from "../api";
import type { GameProps, SocialData } from "../types";
import CosmeticArt from "../CosmeticArt";

type Board = "arena" | "cultivation" | "contribution" | "achievements";
type Ticket = { id: number; subject: string; text: string; status: string; reply: string; created_at: string; updated_at: string };
type Profile = { id: number; name: string; path: string; alignment: string; realm: number; equipped_cosmetic: string; achievements: string[]; arena_rating: number; arena_enlisted: boolean };
const boards: { id: Board; label: string }[] = [{ id: "arena", label: "Đấu Pháp" }, { id: "cultivation", label: "Tu Vi" }, { id: "contribution", label: "Công Huân" }, { id: "achievements", label: "Kỳ Nhân" }];
const alignmentNames: Record<string, string> = { neutral: "Tự tại", righteous: "Chính Đạo", demonic: "Ma Đạo" };
const format = (value: number) => value.toLocaleString("vi-VN");
const date = (value: string) => new Date(value).toLocaleString("vi-VN");

export default function Social({ snapshot, act, busy }: GameProps) {
 const player = snapshot.player;
 const [tab, setTab] = useState("guild");
 const [board, setBoard] = useState<Board>("arena");
 const [data, setData] = useState<SocialData | null>(null);
 const [tickets, setTickets] = useState<Ticket[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [notice, setNotice] = useState("");
 const [refresh, setRefresh] = useState(0);
 const [guildName, setGuildName] = useState("");
 const [description, setDescription] = useState("");
 const [alignment, setAlignment] = useState("neutral");
 const [donation, setDonation] = useState("100");
 const [post, setPost] = useState("");
 const [reportID, setReportID] = useState("");
 const [reportText, setReportText] = useState("");
 const [subject, setSubject] = useState("");
 const [supportText, setSupportText] = useState("");
 const [profile, setProfile] = useState<Profile | null>(null);
 const [profileLoading, setProfileLoading] = useState(false);
 const [pending, setPending] = useState(false);

 useEffect(() => {
  if (!player) return;
  const controller = new AbortController();
  setLoading(true); setError(""); setData(null); setProfile(null);
  Promise.all([
   request<SocialData>(`/game/social?board=${board}`, { signal: controller.signal }),
   request<{ tickets: Ticket[] }>("/game/support", { signal: controller.signal }),
  ]).then(([social, support]) => { if (!controller.signal.aborted) { setData(social); setTickets(support.tickets); } })
   .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không thể tải giang hồ."); })
   .finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 }, [player?.id, player?.version, board, refresh]);

 if (!player) return null;
 const disabled = busy || pending;
 const guild = data?.guild;
 const now = new Date(snapshot.server_time).getTime();
 const joined = guild?.joined_at ? new Date(guild.joined_at).getTime() : 0;
 const warming = joined > 0 && now < joined + 86400000;
 const cooldown = (key: string, seconds: number) => {
  const remaining = (player.stats[key] || 0) + seconds - Math.floor(now / 1000);
  return remaining > 0 ? `Hồi phục đến ${date(new Date(((player.stats[key] || 0) + seconds) * 1000).toISOString())}` : "Sẵn sàng";
 };
 const mutate = async (type: string, payload: Record<string, unknown>, message: string, clear?: () => void) => {
  if (disabled) return;
  setPending(true); setError(""); setNotice("");
  try { await act(type, payload); clear?.(); setNotice(message); setRefresh(value => value + 1); }
  catch (cause) { setError(cause instanceof Error ? cause.message : "Thao tác chưa hoàn tất."); }
  finally { setPending(false); }
 };
 const inspect = async (id: number) => {
  setProfileLoading(true); setProfile(null); setError("");
  try { setProfile(await request<Profile>(`/game/profile/${id}`)); }
  catch (cause) { setError(cause instanceof Error ? cause.message : "Hồ sơ không khả dụng."); }
  finally { setProfileLoading(false); }
 };
 const shareProfile = async () => {
  if (!profile) return;
  const realm = snapshot.catalog.realms.find(item => item.id === profile.realm)?.name || "Tu sĩ";
  const path = snapshot.catalog.paths.find(item => item.id === profile.path)?.name || profile.path;
  const text = `${profile.name} · ${realm} · ${path}\n${profile.achievements.length} thành tựu · ${format(profile.arena_rating)} điểm Đấu Pháp\nCẩu Đạo Ký`;
  try {
   if (navigator.share) await navigator.share({ title: `Đạo đồ ${profile.name}`, text });
   else { await navigator.clipboard.writeText(text); setNotice("Đã sao chép thẻ hồ sơ công khai."); }
  } catch (cause) { if (!(cause instanceof DOMException && cause.name === "AbortError")) setError("Không thể chia sẻ. Hãy cho phép quyền sao chép trong trình duyệt."); }
 };
 const userActions = (id: number) => <div className="actions">
  <button className="button secondary" disabled={disabled || profileLoading} onClick={() => void inspect(id)}>Hồ sơ</button>
  {id !== player.id && <><button className="button secondary" disabled={disabled} onClick={() => void mutate("social.block", { user_id: id }, "Đã chặn đạo hữu. Hai bên không còn thấy hồ sơ và bản tin của nhau.")}>Chặn</button>
   <button className="button secondary" disabled={disabled || !data || (!data.muted.includes(id) && data.muted.length >= 100)} onClick={() => void mutate(data?.muted.includes(id) ? "social.unmute" : "social.mute", { user_id: id }, data?.muted.includes(id) ? "Đã bỏ ẩn bản tin của đạo hữu." : "Đã ẩn bản tin của đạo hữu chỉ với bạn. Hồ sơ, bảng vàng và đồng thuận đấu pháp không đổi.")}>{data?.muted.includes(id) ? "Bỏ ẩn bản tin" : "Ẩn bản tin"}</button>
   <button className="button secondary" disabled={disabled} onClick={() => { setReportID(String(id)); setTab("support"); setNotice("Điền nội dung báo cáo và gửi để ban quản trị xem xét."); }}>Báo cáo</button></>}
 </div>;

 return <div className="game-view stack">
  <header className="page-heading"><div><p className="eyebrow">Có nơi cùng trở về</p><h1>Tông môn & giang hồ</h1><p className="muted">Cùng dựng sơn môn. Luận bàn có chừng mực. Đấu pháp chỉ khi đôi bên đồng thuận.</p></div><Users aria-hidden="true" size={36} /></header>
  <div className="tabs" role="tablist" aria-label="Hoạt động cộng đồng">{[{ id: "guild", label: "Tông môn", icon: Flag }, { id: "board", label: "Bảng vàng", icon: Trophy }, { id: "feed", label: "Bản tin", icon: MessageSquare }, { id: "support", label: "An toàn & hỗ trợ", icon: Shield }].map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} className={`tab ${tab === item.id ? "active" : ""}`} onClick={() => setTab(item.id)}><item.icon size={16} aria-hidden="true" /> {item.label}</button>)}</div>
  {error && <div className="notice error" role="alert">{error} <button className="button secondary" onClick={() => setRefresh(value => value + 1)} disabled={loading}>Tải lại dữ liệu</button></div>}
  {notice && <p className="notice success" role="status">{notice}</p>}
  {loading && <p className="muted" role="status">Đang mở sổ giang hồ…</p>}
  {tab === "guild" && <>
   {guild ? <section className="panel stack"><div className="section-heading"><div><p className="eyebrow">{alignmentNames[guild.alignment]} · {guild.members}/30 đồng môn</p><h2>{guild.name}</h2></div><span className="badge">{guild.leader_id === player.id ? "Chưởng môn" : "Đồng môn"}</span></div><p>{guild.description || "Sơn môn mới, câu chuyện đang được viết."}</p>
    <div className="stat-grid"><div className="stat"><span>Công quỹ được bảo vệ</span><strong>{format(guild.treasury)}</strong></div><div className="stat"><span>Kho chiến tranh</span><strong>{format(guild.war_chest)}</strong></div><div className="stat"><span>Công huân tông môn</span><strong>{format(guild.season_score)}</strong></div><div className="stat"><span>Đồng môn đăng ký chiến dịch</span><strong>{guild.enlisted_members}</strong></div></div>
    {warming && <p className="notice">Chiến đấu và đăng ký chiến dịch mở lúc {date(new Date(joined + 86400000).toISOString())} — 24 giờ sau khi nhập môn.</p>}
    <form className="stack" onSubmit={event => { event.preventDefault(); void mutate("guild.donate", { amount: Number(donation) }, "Đóng góp đã ghi vào công quỹ và kho chiến tranh."); }}><label className="field">Đóng góp linh thạch<input type="number" min={10} max={10000} step={1} required value={donation} onChange={event => setDonation(event.target.value)} /></label><p className="muted">80% công quỹ, 20% kho chiến tranh. Tối đa 10.000/ngày UTC, không hoàn lại; không dùng tiên ngọc.</p><button className="button primary" disabled={disabled || Number(donation) > player.stones}>Góp sức dựng nhà</button></form>
    <div className="stack"><h3>Thủ lĩnh chung</h3><p className="muted">Một lượt mỗi 6 giờ; cộng dồn sát thương của đồng môn. Mỗi lượt +20 linh thạch, +10 kinh nghiệm mùa. Hạ mục tiêu: +100 công quỹ, +100 công huân; hồi sinh sau 24 giờ.</p><p className="muted">{cooldown("guild_raid_at", 21600)} · Mục tiêu hiện tại còn {format(guild.boss_hp)} sinh lực.</p><div className="card-grid">{snapshot.catalog.bosses.filter(boss => boss.guild).map(boss => <article key={boss.id} className="card stack"><h3>{boss.name}</h3><p>{boss.description}</p><p className="muted">Yêu cầu {snapshot.catalog.realms.find(realm => realm.id === boss.realm)?.name}</p><button className="button primary" disabled={disabled || warming || player.realm < boss.realm} onClick={() => void mutate("guild.raid", { id: boss.id }, "Kết quả đánh thủ lĩnh đã được ghi vào tiểu sử.")}>Cùng đánh thủ lĩnh</button></article>)}</div></div>
    <div className="stack"><h3>Chiến dịch đồng thuận</h3><p className="muted">Đăng ký cho phép đội dùng chiến thuật hiện tại của bạn trong trận bất đồng bộ. Mỗi bên ít nhất 3 người, chênh lệch tối đa 2. Chỉ chưởng môn đã đăng ký được mở trận. Kho chiến tranh mỗi bên cần 100; bên thua mất tối đa 10% kho và không quá 100. Công quỹ, đồ cá nhân không mất. Hai bên được bảo vệ 24 giờ sau mỗi trận. Công huân: thắng +20, thua +5.</p><button className="button secondary" disabled={disabled || (!guild.enlisted && warming)} onClick={() => void mutate("guild.enlist", { enabled: !guild.enlisted }, guild.enlisted ? "Đã rút đăng ký chiến dịch." : "Đã đăng ký chiến dịch tự nguyện.")}>{guild.enlisted ? "Rút đăng ký chiến dịch" : "Tôi đồng ý đăng ký chiến dịch"}</button>{guild.last_war_at && <p className="muted">Chiến dịch gần nhất: {date(guild.last_war_at)}</p>}</div>
    <button className="button danger" disabled={disabled} onClick={() => { if (window.confirm("Rời tông môn? Đóng góp không hoàn lại và cần chờ 24 giờ để nhập môn khác. Nếu là chưởng môn, quyền được chuyển cho thành viên lâu nhất; tông môn trống sẽ giải tán.")) void mutate("guild.leave", {}, "Đã rời tông môn. Có thể nhập môn mới sau 24 giờ."); }}>Rời tông môn</button>
   </section> : data && <section className="panel stack"><h2>Dựng cờ khai môn</h2><p className="muted">Lập tông môn cần 500 linh thạch. Hoặc gia nhập một sơn môn bên dưới hoàn toàn miễn phí. Sau khi rời cần chờ 24 giờ để nhập hoặc lập môn mới.</p><form className="stack" onSubmit={event => { event.preventDefault(); void mutate("guild.create", { name: guildName, description, alignment }, "Đã dựng cờ khai môn.", () => { setGuildName(""); setDescription(""); }); }}><label className="field">Tên tông môn<input required minLength={3} maxLength={32} value={guildName} onChange={event => setGuildName(event.target.value)} /></label><label className="field">Lời giới thiệu<textarea maxLength={300} value={description} onChange={event => setDescription(event.target.value)} /></label><label className="field">Lập trường<select value={alignment} onChange={event => setAlignment(event.target.value)}>{Object.entries(alignmentNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><button className="button primary" disabled={disabled || player.stones < 500}>Lập tông môn · 500 linh thạch</button></form></section>}
   {data && <section className="stack"><h2>Các sơn môn</h2>{data.guilds.filter(item => item.id !== guild?.id).length === 0 ? <p className="empty">Chưa có sơn môn nào khác. Danh sách chỉ có tông môn do người chơi thật lập.</p> : <div className="card-grid">{data.guilds.filter(item => item.id !== guild?.id).map(item => <article className="card stack" key={item.id}><p className="eyebrow">{alignmentNames[item.alignment]} · {item.members}/30</p><h3>{item.name}</h3><p>{item.description || "Chưa có lời giới thiệu."}</p><p className="muted">{format(item.season_score)} công huân · {item.enlisted_members} người đăng ký · kho chiến tranh {format(item.war_chest)}</p>{!guild && <button className="button primary" disabled={disabled || item.members >= 30} onClick={() => void mutate("guild.join", { id: item.id }, "Đã gia nhập sơn môn.")}>Xin nhập môn</button>}{guild?.leader_id === player.id && <button className="button secondary" disabled={disabled || !guild.enlisted || warming || item.enlisted_members < 3 || guild.enlisted_members < 3 || item.war_chest < 100 || guild.war_chest < 100} onClick={() => { if (window.confirm(`Mở chiến dịch với ${item.name}? Kho chiến tranh bên thua chịu thiệt hại tối đa 100 linh thạch.`)) void mutate("guild.war", { target_id: item.id }, "Chiến dịch đã kết thúc. Kết quả thật được ghi trong tiểu sử."); }}>Mở chiến dịch</button>}</article>)}</div>}</section>}
  </>}
  {tab === "board" && <section className="panel stack"><div className="section-heading"><h2>Bảng vàng người thật</h2><Trophy aria-hidden="true" /></div><p className="muted">Chỉ hiện hồ sơ công khai, còn hoạt động và không chặn nhau. Điểm xếp từ dữ liệu chơi thật; không bán phiếu hay thứ hạng.</p><div className="actions">{boards.map(item => <button key={item.id} className={`button ${board === item.id ? "primary" : "secondary"}`} aria-pressed={board === item.id} onClick={() => setBoard(item.id)}>{item.label}</button>)}</div><div className="notice stack"><h3>Đấu pháp chuẩn hóa</h3><p>Đồng ý tham gia để người khác thách đấu bất đồng bộ với bộ công pháp hiện tại của bạn. Cảnh giới, pháp bảo và ngoại hình không tạo lợi thế. Chỉ điểm người thách đấu thay đổi: thắng +16, thua −12 (không dưới 0); không mất tài sản.</p><p>Mỗi lượt cách 10 phút, cùng đối thủ cách 24 giờ. {cooldown("arena_at", 600)}.</p><button className="button secondary" disabled={disabled || (!player.public_profile && player.stats.arena_enlisted !== 1)} onClick={() => void mutate("arena.enlist", { enabled: player.stats.arena_enlisted !== 1 }, player.stats.arena_enlisted === 1 ? "Đã rút khỏi đấu trường." : "Đã đồng ý tham gia đấu trường.")}>{player.stats.arena_enlisted === 1 ? "Rút khỏi đấu trường" : "Tôi đồng ý tham gia đấu trường"}</button>{!player.public_profile && <p>Hãy bật hồ sơ công khai trong Đạo đồ trước khi tham gia.</p>}</div>
   {data && (data.leaders.length === 0 ? <p className="empty">Chưa có đạo hữu công khai để xếp hạng. Không có đối thủ giả.</p> : data.leaders.map(leader => <article className="card stack" key={leader.id}><div className="section-heading"><div><p className="eyebrow">Hạng {leader.rank} · {snapshot.catalog.realms.find(realm => realm.id === leader.realm)?.name}</p><h3>{leader.name}{leader.id === player.id ? " (bạn)" : ""}</h3></div><strong>{format(leader.score)}</strong></div>{userActions(leader.id)}{board === "arena" && leader.id !== player.id && <button className="button primary" disabled={disabled || !leader.arena_enlisted || player.stats.arena_enlisted !== 1 || !player.public_profile} onClick={() => void mutate("arena.challenge", { opponent_id: leader.id }, "Trận đấu đã hoàn tất. Xem diễn biến bên dưới.")}><Swords size={16} aria-hidden="true" /> {leader.arena_enlisted ? "Thi lễ thách đấu" : "Chưa đồng ý đấu trường"}</button>}</article>))}
  </section>}
  {tab === "feed" && <section className="panel stack"><h2>Bản tin giang hồ</h2><p className="muted">50 bản tin gần nhất. Mỗi người đăng cách 5 phút. Không chia sẻ thông tin cá nhân; nội dung vi phạm có thể được quản trị viên gỡ.</p><form className="stack" onSubmit={event => { event.preventDefault(); void mutate("feed.post", { text: post }, "Bản tin đã được đăng.", () => setPost("")); }}><label className="field">Chuyện hôm nay<textarea required maxLength={500} value={post} onChange={event => setPost(event.target.value)} placeholder="Kể một chuyện thật trên đường tu hành…" /></label><span className="muted">{post.length}/500 · {cooldown("feed_post_at", 300)}</span><button className="button primary" disabled={disabled || !player.public_profile}>Đăng bản tin công khai</button>{!player.public_profile && <p className="notice">Hồ sơ đang riêng tư. Bật công khai trong Đạo đồ để đăng bản tin.</p>}</form>{data && (data.feed.length === 0 ? <p className="empty">Giang hồ đang yên tĩnh. Chưa có bản tin công khai phù hợp.</p> : data.feed.map(entry => <article className="card stack" key={entry.id}><div className="section-heading"><h3>{entry.name}</h3><time className="muted" dateTime={entry.created_at}>{date(entry.created_at)}</time></div><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{entry.text}</p>{userActions(entry.user_id)}</article>))}</section>}
  {tab === "support" && <div className="stack"><section className="panel stack"><h2>Ranh giới của bạn</h2><p className="muted">Ẩn bản tin chỉ ẩn bài của đạo hữu với riêng bạn; không ẩn hồ sơ, bảng vàng hay thay đổi đồng thuận đấu pháp. Người đó vẫn thấy bản tin của bạn. Danh sách ẩn là riêng tư, tối đa 100 người. Chặn ẩn hồ sơ, bản tin và ngăn thách đấu giữa hai bên. Báo cáo được gửi riêng đến quản trị viên; không xuất hiện trên bảng tin.</p>
   <h3>Đạo hữu đã ẩn bản tin {data && `(${data.muted.length}/100)`}</h3>{data && (data.muted.length === 0 ? <p className="empty">Bạn chưa ẩn bản tin của ai.</p> : data.muted.map(id => <div className="section-heading" key={id}><span>Đạo hữu #{id}</span><button className="button secondary" disabled={disabled} onClick={() => void mutate("social.unmute", { user_id: id }, "Đã bỏ ẩn bản tin của đạo hữu.")}>Bỏ ẩn bản tin</button></div>))}
   <h3>Đạo hữu đã chặn</h3>{data && (data.blocked.length === 0 ? <p className="empty">Bạn chưa chặn ai.</p> : data.blocked.map(id => <div className="section-heading" key={id}><span>Đạo hữu #{id}</span><button className="button secondary" disabled={disabled} onClick={() => void mutate("social.unblock", { user_id: id }, "Đã bỏ chặn đạo hữu.")}>Bỏ chặn</button></div>))}<form className="stack" onSubmit={event => { event.preventDefault(); void mutate("social.report", { user_id: Number(reportID), text: reportText }, "Báo cáo đã gửi riêng tới quản trị viên.", () => setReportText("")); }}><h3>Báo cáo vi phạm</h3><label className="field">Mã đạo hữu<input type="number" required min={1} max={2147483647} step={1} value={reportID} onChange={event => setReportID(event.target.value)} /></label><label className="field">Nội dung và ngữ cảnh<textarea required minLength={10} maxLength={2000} value={reportText} onChange={event => setReportText(event.target.value)} /></label><button className="button danger" disabled={disabled}>Gửi báo cáo</button></form></section>
   <section className="panel stack"><h2>Liên hệ hỗ trợ</h2><p className="muted">Không gửi mật khẩu hay mã xác thực. Tối đa 5 yêu cầu chờ xử lý, cách nhau 10 phút.</p><form className="stack" onSubmit={event => { event.preventDefault(); void mutate("support.create", { subject, text: supportText }, "Yêu cầu hỗ trợ đã được lưu.", () => { setSubject(""); setSupportText(""); }); }}><label className="field">Chủ đề<input required minLength={3} maxLength={120} value={subject} onChange={event => setSubject(event.target.value)} /></label><label className="field">Mô tả vấn đề<textarea required minLength={10} maxLength={4000} value={supportText} onChange={event => setSupportText(event.target.value)} /></label><button className="button primary" disabled={disabled}>Gửi yêu cầu hỗ trợ</button></form><h3>Hộp thư hỗ trợ của bạn</h3>{!loading && tickets.length === 0 ? <p className="empty">Bạn chưa gửi yêu cầu hỗ trợ.</p> : tickets.map(ticket => <article className="card stack" key={ticket.id}><p className="eyebrow">#{ticket.id} · {ticket.status === "open" ? "Đang chờ" : ticket.status === "answered" ? "Đã trả lời" : "Đã đóng"} · {date(ticket.created_at)}</p><h3>{ticket.subject}</h3><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{ticket.text}</p>{ticket.reply && <div className="notice"><strong>Phản hồi từ hỗ trợ</strong><p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{ticket.reply}</p><time dateTime={ticket.updated_at}>{date(ticket.updated_at)}</time></div>}</article>)}</section>
  </div>}
  {profileLoading && <p role="status">Đang đọc hồ sơ công khai…</p>}
  {profile && <section className="panel stack" aria-label="Hồ sơ công khai"><div className="section-heading"><div><p className="eyebrow">Thẻ đạo đồ công khai · #{profile.id}</p><div className="public-appearance"><CosmeticArt id={profile.equipped_cosmetic} catalog={snapshot.catalog} /></div><h2>{profile.name}</h2></div><button className="button secondary" onClick={() => setProfile(null)}>Đóng hồ sơ</button></div><p>{snapshot.catalog.realms.find(realm => realm.id === profile.realm)?.name} · {snapshot.catalog.paths.find(path => path.id === profile.path)?.name} · {alignmentNames[profile.alignment]}</p><p>{profile.achievements.length} thành tựu · {format(profile.arena_rating)} điểm Đấu Pháp</p><p className="muted">Chỉ chia sẻ trường công khai. Không có ví tiền, giao dịch, lịch sử riêng hoặc quan hệ NPC.</p><button className="button primary" onClick={() => void shareProfile()}>Chia sẻ thẻ hồ sơ</button></section>}
  {(tab === "guild" || tab === "board") && player.last_battle && <section className="panel stack"><h2>Trận đấu gần nhất · {player.last_battle.opponent}</h2><p className="eyebrow">{date(player.last_battle.at)} · {player.last_battle.won ? "Chiến thắng" : "Chưa thắng"}</p><p>{player.last_battle.summary}</p><details><summary>Xem từng lượt thực tế</summary><ol className="stack">{player.last_battle.turns.map((turn, index) => <li key={index}>Hiệp {turn.round} · {turn.actor} dùng {turn.skill}: {turn.damage} sát thương. {turn.text}</li>)}</ol></details></section>}
  {tab === "guild" && <section className="panel stack"><h2>Ký sự sơn môn của bạn</h2>{player.history.filter(entry => entry.kind === "guild").length === 0 ? <p className="empty">Chưa có ký sự tông môn.</p> : player.history.filter(entry => entry.kind === "guild").slice(0, 10).map(entry => <article key={entry.id}><p className="eyebrow">{date(entry.at)}</p><h3>{entry.title}</h3><p>{entry.text}</p></article>)}</section>}
 </div>;
}
