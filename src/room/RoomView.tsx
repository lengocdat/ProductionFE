"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./room.css";
import { RoomClient, adoptToken, errMessage, storedToken, type RoomEnd } from "./RoomClient";
import { RoomScene } from "./RoomScene";
import { Sfx } from "./sfx";
import Coach, { COACH_CHAT, COACH_SIT, COACH_STEPS } from "./Coach";
import HelpSheet from "./HelpSheet";
import OfferingSheet from "./OfferingSheet";
import { ROBE_LOOKS, cssHex } from "./looks";
import { MODE_SIT, MODE_STAND, type ActMsg, type ChatMode, type EmoteDef, type GatherPhase, type OfferingItem, type Phrase, type PlayerId, type PollMsg, type RankDef, type ReportReason, type SectMsg, type SpotDef } from "./protocol";

type Phase = "join" | "connecting" | "live" | "ended";
type LogLine = { key: number; id: PlayerId; name: string; text: string; you: boolean; variant?: "system" | "twist" | "offering" | "event" | "spot" };
/** Linh mạch tụ khí as shown: `until` is when the blessing ends (local clock). */
type GatherView = { phase: GatherPhase; pct: number; mult: number; until: number };
/** The open Thiên Đạo hỏi poll; `endsAt` on the local clock, `total` the full duration for the time bar. */
type PollView = { id: number; q: string; opts: string[]; counts: number[]; endsAt: number; total: number };
type ModTarget = { id: PlayerId; name: string; step: "menu" | "report" };

/** Positions/delays of the falling-offering rain, fixed so re-renders do not reshuffle it. */
const RAIN = Array.from({ length: 18 }, (_, i) => ({ left: (i * 37) % 100, delay: (i * 0.17) % 1.6, size: 22 + ((i * 7) % 16) }));
/** A poll stays open 20 s (BE README); joiners get less via `left_ms`. */
const POLL_MS = 20_000;
const REPORT_REASONS: readonly { id: ReportReason; label: string }[] = [
  { id: "chat", label: "💬 Nói lời khó nghe" },
  { id: "name", label: "🏷️ Đạo hiệu bậy bạ" },
  { id: "spam", label: "📢 Spam, rao vặt, lừa đảo" },
];

/** Link fragment that carries a đạo tịch to another device; fragments never reach servers. */
const TOKEN_HASH = "#dt=";

const EMOTE_GLYPHS = ["🙏", "😊", "🙇", "👋", "😮", "🪷"];
const NAME_KEY = "dt:name";
const LOOK_KEY = "dt:look";
const GUIDE_KEY = "dt:guide";
const LOG_MAX = 30;

const glyphOf = (e: number | string): string => EMOTE_GLYPHS[Number(e)] ?? "✨";
/** "Ngoại môn đệ tử" → "Ngoại môn" for tight spots. */
const shortRank = (name: string): string => name.replace(/\s*đệ tử$/u, "");
const fmt = (n: number): string => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

/** BE README: after anyone rings the bell the whole room waits 45 s, on top of each disciple's own cooldown. */
const BELL_SPOT = "bell";
const BELL_ROOM_COOLDOWN_S = 45;
/** A second press of the same spot this soon is dropped: the reply is still on its way. */
const SPOT_PRESS_MS = 1200;
const ACT_BUBBLE_MS = 6000;
/** "4:05" from a minute up, else "12s". */
const fmtLeft = (s: number): string => (s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : `${s}s`);

/** Sound key (sfx.ts) for a spot outcome, or null for the quiet ones (plain smoke, ripples). */
function spotSound(msg: ActMsg): string | null {
  switch (msg.fx) {
    case "ring": return "bell";
    case "glow":
    case "dragon": return "offering";
    case "boom": return "boom";
    case "pill": return "scripture";
    // The incense fortune where the smoke curls into a chicken gets the chicken's cackle.
    case "smoke": return /con gà/u.test(msg.text) ? "chicken" : null;
    default: return null;
  }
}

export default function RoomView() {
  const stageRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<RoomClient | null>(null);
  const sceneRef = useRef<RoomScene | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logKey = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);
  // Cushions the server refused recently (id -> time) and the one currently being requested.
  const refused = useRef(new Map<number, number>());
  const wantedSeat = useRef<number | null>(null);

  const [phase, setPhase] = useState<Phase>("join");
  const [name, setName] = useState("");
  const [look, setLook] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [end, setEnd] = useState<RoomEnd | null>(null);
  const [roomName, setRoomName] = useState("");
  const [online, setOnline] = useState(0);
  const [qi, setQi] = useState(0);
  const [rate, setRate] = useState(0);
  const [seated, setSeated] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("preset");
  const [freeChatRank, setFreeChatRank] = useState(0);
  // What each rank unlocks, e.g. {1: ["tự gõ chat"], 2: ["ngồi linh mạch ×1,5"]}.
  const [perks, setPerks] = useState<Record<number, string[]>>({});
  const myRankRef = useRef(0);
  const [offerItems, setOfferItems] = useState<OfferingItem[]>([]);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  // Falling glyphs for a paid offering or a Thiên Đạo rain; key restarts the animation; `art` mixes in the offering images.
  const [rain, setRain] = useState<{ glyphs: readonly string[]; art: boolean; key: number } | null>(null);
  const rainTimer = useRef<number | undefined>(undefined);
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [emotes, setEmotes] = useState<EmoteDef[]>([]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [logOpen, setLogOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [afkUntil, setAfkUntil] = useState<number | null>(null);
  const [afkLeft, setAfkLeft] = useState(0);
  const [ranks, setRanks] = useState<RankDef[]>([]);
  const [myRank, setMyRank] = useState(0);
  const [banner, setBanner] = useState<{ text: string; offering: boolean } | null>(null);
  const bannerTimer = useRef<number | undefined>(undefined);
  const [sect, setSect] = useState<SectMsg | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [flash, setFlash] = useState(0);
  const [transferOpen, setTransferOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  // Master name from the previous sect frame; undefined until the first one after joining.
  const prevMaster = useRef<string | null | undefined>(undefined);
  const sfxRef = useRef<Sfx | null>(null);
  const [muted, setMuted] = useState(false);
  // Index into COACH_STEPS while the first-visit walkthrough runs, else null.
  const [coachStep, setCoachStep] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [together, setTogether] = useState(0);
  const [onInner, setOnInner] = useState(false);
  const [gather, setGather] = useState<GatherView | null>(null);
  const [blessLeft, setBlessLeft] = useState(0);
  const [poll, setPoll] = useState<PollView | null>(null);
  const [pollLeft, setPollLeft] = useState(0);
  // The option this browser picked, tracked locally (the server only sends tallies).
  const [myVote, setMyVote] = useState<{ poll: number; o: number } | null>(null);
  const lastPoll = useRef<PollMsg | null>(null);
  // Reconnect attempt number while the socket is being re-opened, else null.
  const [reconnecting, setReconnecting] = useState<number | null>(null);
  // Chặn: connection ids muted for this session (ref for socket handlers, state for rendering).
  const mutedRef = useRef(new Set<PlayerId>());
  const [mutedIds, setMutedIds] = useState<ReadonlySet<PlayerId>>(() => new Set());
  const [modTarget, setModTarget] = useState<ModTarget | null>(null);
  const [chatNote, setChatNote] = useState<string | null>(null);
  const chatNoteTimer = useRef<number | undefined>(undefined);
  // Interactive spots: the one the local player stands at (button shown), its cooldown left in seconds,
  // and local cooldown hints (spot id -> local time it is usable again; the server stays authoritative).
  const [spots, setSpots] = useState<SpotDef[]>([]);
  const [nearSpot, setNearSpot] = useState<SpotDef | null>(null);
  const [spotLeft, setSpotLeft] = useState(0);
  const spotReady = useRef(new Map<string, number>());
  const [spotRev, setSpotRev] = useState(0);
  const lastPress = useRef<{ id: string; at: number } | null>(null);
  // The help sheet was opened by reading the stele: scroll to the spot list.
  const [helpSpots, setHelpSpots] = useState(false);

  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    const saved = Number(localStorage.getItem(LOOK_KEY));
    if (Number.isInteger(saved) && saved >= 0 && saved < ROBE_LOOKS.length) setLook(saved);
    if (location.hash.startsWith(TOKEN_HASH)) {
      const ok = adoptToken(decodeURIComponent(location.hash.slice(TOKEN_HASH.length)));
      history.replaceState(null, "", location.pathname + location.search);
      setFormError(ok ? null : "Liên kết đạo tịch không hợp lệ.");
      if (ok) setBanner({ text: "Đã nhận đạo tịch từ thiết bị khác", offering: false });
    }
  }, []);

  const showBanner = useCallback((text: string, offering = false) => {
    setBanner({ text, offering });
    window.clearTimeout(bannerTimer.current);
    bannerTimer.current = window.setTimeout(() => setBanner(null), 4500);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const destroyScene = useCallback(() => {
    sceneRef.current?.destroy();
    sceneRef.current = null;
  }, []);

  const startRain = useCallback((glyphs: readonly string[], art: boolean) => {
    setRain({ glyphs, art, key: Date.now() });
    window.clearTimeout(rainTimer.current);
    rainTimer.current = window.setTimeout(() => setRain(null), 4200);
  }, []);

  const pushLog = useCallback((line: Omit<LogLine, "key">) => {
    setLog(prev => [...prev, { ...line, key: ++logKey.current }].slice(-LOG_MAX));
  }, []);

  // Uses a spot: the stele (the only local one) opens the help sheet, the rest go to the server.
  const actAt = useCallback((spot: SpotDef) => {
    if (spot.local) { setHelpSpots(true); setHelpOpen(true); return; }
    const client = clientRef.current;
    if (!client) return;
    const now = Date.now();
    const left = Math.ceil(((spotReady.current.get(spot.id) ?? 0) - now) / 1000);
    if (left > 0) { showToast(`${spot.emoji} ${spot.label}: còn ${fmtLeft(left)} nữa mới làm lại được.`); return; }
    const last = lastPress.current;
    if (last && last.id === spot.id && now - last.at < SPOT_PRESS_MS) return;
    lastPress.current = { id: spot.id, at: now };
    if (!client.act(spot.id)) showToast("Đang mất kết nối, chưa làm được.");
  }, [showToast]);

  // One client for the component's lifetime; every event is wired exactly once.
  useEffect(() => {
    const client = new RoomClient();
    clientRef.current = client;
    const sfx = new Sfx();
    sfxRef.current = sfx;
    setMuted(sfx.muted);
    // My pose and seat, plus how many people sit in the room (it drives the qi rate), and the spot I stand at.
    const syncMe = () => {
      const me = client.me;
      setSeated(me?.s === MODE_SIT);
      let sitting = 0;
      for (const p of client.players.values()) if (p.s === MODE_SIT) sitting++;
      setTogether(sitting);
      const seat = me && me.seat >= 0 ? client.room?.seats.find(s => s.i === me.seat) : undefined;
      setOnInner((seat?.min_rank ?? 0) > 0);
      let near: SpotDef | null = null;
      if (me && me.s === MODE_STAND) {
        let best = Infinity;
        for (const s of client.room?.spots ?? []) {
          const d = Math.hypot(s.x - me.x, s.z - me.z);
          if (d <= s.reach && d < best) { best = d; near = s; }
        }
      }
      setNearSpot(near);
    };

    const off = [
      client.on("welcome", msg => {
        const stage = stageRef.current;
        if (!stage) return;
        // A scene already exists when the client just reconnected: rebuild it from scratch, keep the chat log.
        const rejoin = sceneRef.current !== null;
        destroyScene();
        const rankNames: string[] = [];
        for (const r of msg.ranks) rankNames[r.id] = r.name;
        const scene = new RoomScene(stage, msg.room, msg.you, msg.tick_ms, rankNames, {
          onMove: (x, z) => { client.move(x, z); },
          onSit: seat => {
            const def = client.room?.seats.find(s => s.i === seat);
            const need = def && def.min_rank > (client.me?.rank ?? 0) ? client.ranks.find(r => r.id === def.min_rank) : undefined;
            if (need) {
              showToast(`Bồ đoàn linh mạch dành cho ${need.name} trở lên. Bạn còn thiếu ${Math.max(0, need.min_qi - client.qi).toLocaleString("vi-VN")} tu vi.`);
              return;
            }
            wantedSeat.current = seat;
            client.sit(seat);
          },
        });
        sceneRef.current = scene;
        const badges: string[] = [];
        for (const o of msg.offerings) badges[o.tier] = o.emoji;
        scene.setPatronBadges(badges);
        for (const p of msg.players) scene.addPlayer(p);
        scene.start();
        scene.setSpotTapHandler(id => {
          const spot = client.room?.spots.find(s => s.id === id);
          const me = client.me;
          if (!spot || !me) return;
          // Already standing there: tapping the prop uses it, like the button.
          if (me.s === MODE_STAND && Math.hypot(spot.x - me.x, spot.z - me.z) <= spot.reach) { actAt(spot); return; }
          client.move(spot.x, spot.z);
        });
        // Cooldown hints restart from the server's word after every (re)connect.
        spotReady.current.clear();
        lastPress.current = null;
        setSpotRev(n => n + 1);
        setSpots(msg.room.spots);
        scene.setLocalRank(client.me?.rank ?? 0);
        if (!rejoin && localStorage.getItem(GUIDE_KEY) !== "done") setCoachStep(s => s ?? 0);
        setRoomName(msg.room.name);
        setOnline(client.online);
        setPhrases(msg.phrases);
        setEmotes(msg.emotes);
        setChatMode(msg.room.chat_mode);
        setFreeChatRank(msg.room.free_chat_rank);
        const perkMap: Record<number, string[]> = {};
        const addPerk = (rank: number, text: string) => { (perkMap[rank] ??= []).push(text); };
        if (msg.room.chat_mode === "rank" && msg.room.free_chat_rank > 0) addPerk(msg.room.free_chat_rank, "tự gõ chat");
        const innerRanks = msg.room.seats.filter(s => s.min_rank > 0).map(s => s.min_rank);
        if (innerRanks.length > 0) addPerk(Math.min(...innerRanks), "ngồi linh mạch ×1,5");
        setPerks(perkMap);
        setOfferItems(msg.offerings);
        setPaymentsOpen(msg.payments);
        myRankRef.current = client.me?.rank ?? 0;
        setQi(msg.qi);
        setRanks(msg.ranks);
        setMyRank(client.me?.rank ?? 0);
        setRate(0);
        if (rejoin) pushLog({ id: 0, name: "", text: "📡 Đã nối lại linh mạch. Tu tiếp thôi!", you: false, variant: "event" });
        else setLog([]);
        setReconnecting(null);
        setPoll(null); // the server re-sends an open poll right after the welcome
        if (!rejoin) setGather(null);
        setSect(null);
        prevMaster.current = undefined;
        setAfkUntil(null);
        syncMe();
        setPhase("live");
      }),
      client.on("join", p => { sceneRef.current?.addPlayer(p); setOnline(client.online); }),
      client.on("leave", id => { sceneRef.current?.removePlayer(id); setOnline(client.online); syncMe(); }),
      client.on("delta", msg => {
        sceneRef.current?.applyDelta(msg.p);
        syncMe();
      }),
      client.on("chat", msg => {
        if (!mutedRef.current.has(msg.id)) sceneRef.current?.showChat(msg.id, msg.text);
        const author = client.players.get(msg.id)?.name ?? "Vô danh";
        setLog(prev => [...prev, { key: ++logKey.current, id: msg.id, name: author, text: msg.text, you: msg.id === client.you }].slice(-LOG_MAX));
        if (msg.id === client.you) setCoachStep(s => (s === COACH_CHAT ? s + 1 : s));
      }),
      client.on("emote", msg => sceneRef.current?.showEmote(msg.id, glyphOf(msg.e))),
      client.on("qi", msg => { setQi(msg.qi); setRate(msg.rate); }),
      client.on("rank", msg => {
        sceneRef.current?.setRank(msg.id, msg.rank);
        const title = client.ranks.find(r => r.id === msg.rank)?.name ?? "";
        const who = client.players.get(msg.id)?.name ?? "Vô danh";
        const you = msg.id === client.you;
        setLog(prev => [...prev, { key: ++logKey.current, id: msg.id, name: who, text: `được thăng làm ${title}.`, you, variant: "system" as const }].slice(-LOG_MAX));
        if (you) {
          const before = myRankRef.current;
          myRankRef.current = msg.rank;
          setMyRank(msg.rank);
          sceneRef.current?.setLocalRank(msg.rank);
          const room = client.room;
          const chatUnlocked = room?.chat_mode === "rank" && before < room.free_chat_rank && msg.rank >= room.free_chat_rank;
          showBanner(chatUnlocked ? `Đột phá thân phận: ${title}\n🔓 Đã mở chat tự do!` : `Đột phá thân phận: ${title}`);
          if (chatUnlocked) setLog(prev => [...prev, { key: ++logKey.current, id: msg.id, name: "Bạn", text: "đã có thể tự gõ chat. Gõ vào ô bên dưới nhé!", you: true, variant: "system" as const }].slice(-LOG_MAX));
        }
      }),
      client.on("sect", msg => {
        sceneRef.current?.setMaster(msg.master_id);
        setSect(msg);
        const now = msg.master?.name ?? null;
        const before = prevMaster.current;
        prevMaster.current = now;
        if (before === undefined || before === now || now === null) return;
        const text = before ? `đoạt ngôi Chưởng môn từ tay ${before}!` : "đăng vị Chưởng môn tuần này!";
        setLog(prev => [...prev, { key: ++logKey.current, id: 0, name: now, text, you: msg.master?.me === true, variant: "system" as const }].slice(-LOG_MAX));
        showBanner(msg.master?.me ? "Đăng vị Chưởng môn!" : `👑 ${now} ${text}`);
      }),
      client.on("twist", msg => {
        sceneRef.current?.playTwist(msg.id, msg.anim, msg.text);
        sfxRef.current?.play(msg.kind, msg.id === client.you ? 1 : 0.7);
        setLog(prev => [...prev, { key: ++logKey.current, id: msg.id, name: "", text: msg.text, you: msg.id === client.you, variant: "twist" as const }].slice(-LOG_MAX));
        if (msg.flash) setFlash(n => n + 1);
      }),
      client.on("offering", msg => {
        if (msg.id) sceneRef.current?.setPatron(msg.id, msg.patron);
        setQi(q => q + msg.gift);
        sfxRef.current?.play("offering", 1);
        showBanner(`${msg.emoji} ${msg.name} cúng ${msg.item}!\n🎁 Mọi người +${msg.gift} tu vi`, true);
        setLog(prev => [...prev, { key: ++logKey.current, id: msg.id, name: "", text: msg.text, you: msg.id === client.you, variant: "offering" as const }].slice(-LOG_MAX));
        startRain([msg.emoji], true);
      }),
      client.on("afk", msg => setAfkUntil(Date.now() + msg.deadline_s * 1000)),
      client.on("gather", msg => {
        setGather({ phase: msg.phase, pct: Math.min(100, Math.floor((msg.p * 100) / msg.goal)), mult: msg.mult, until: Date.now() + msg.left_s * 1000 });
        if (!msg.text) return;
        const glyph = msg.phase === "bless" ? "✨" : "🌀";
        showBanner(`${glyph} ${msg.text}`);
        pushLog({ id: 0, name: "", text: `${glyph} ${msg.text}`, you: false, variant: "event" });
        if (msg.phase === "bless") sfxRef.current?.play("offering", 0.8);
      }),
      client.on("poll", msg => {
        if (lastPoll.current?.id !== msg.id) {
          pushLog({ id: 0, name: "", text: `☁️ Thiên Đạo hỏi: ${msg.q}`, you: false, variant: "event" });
          setMyVote(null);
        }
        lastPoll.current = msg;
        setPoll({ id: msg.id, q: msg.q, opts: msg.opts, counts: msg.counts, endsAt: Date.now() + msg.left_ms, total: Math.max(POLL_MS, msg.left_ms) });
      }),
      client.on("poll_end", msg => {
        setPoll(p => (p && p.id === msg.id ? null : p));
        setMyVote(null);
        const asked = lastPoll.current?.id === msg.id ? lastPoll.current : null;
        const winner = asked?.opts[msg.win];
        showBanner(winner ? `☁️ Thiên Đạo chốt: ${winner}\n${msg.text}` : `☁️ ${msg.text}`);
        pushLog({ id: 0, name: "", text: `☁️ ${msg.text}`, you: false, variant: "event" });
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        switch (msg.effect) {
          case "rain":
            setQi(q => q + msg.qi);
            startRain(["💧", "✨"], false);
            return;
          case "chicken":
            sfxRef.current?.play("chicken", 1);
            if (!calm) for (const id of msg.targets) sceneRef.current?.playAnim(id, "jump");
            return;
          case "dance":
            if (!calm) for (const id of msg.targets) sceneRef.current?.playAnim(id, "spin");
            return;
          case "song":
            sfxRef.current?.play("offering", 1);
            return;
          case "gather":
            return; // the `gather` frame that follows moves the bar
        }
      }),
      client.on("report_ok", () => showToast("Đã gửi báo cáo. Cảm ơn đạo hữu giữ đạo tràng thanh tịnh 🙏")),
      client.on("act", msg => {
        const scene = sceneRef.current;
        const you = msg.id === client.you;
        const spot = client.room?.spots.find(s => s.id === msg.spot);
        if (msg.fx) scene?.playSpotFx(msg.spot, msg.fx, msg.id);
        if (msg.anim && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) scene?.playAnim(msg.id, msg.anim);
        scene?.showChat(msg.id, msg.text, ACT_BUBBLE_MS);
        const now = Date.now();
        const ready = spotReady.current;
        if (you && spot && spot.cooldown_s > 0) ready.set(spot.id, now + spot.cooldown_s * 1000);
        if (msg.spot === BELL_SPOT) ready.set(BELL_SPOT, Math.max(ready.get(BELL_SPOT) ?? 0, now + BELL_ROOM_COOLDOWN_S * 1000));
        setSpotRev(n => n + 1);
        setQi(client.qi); // the client already added msg.qi (actor) and msg.room_qi (everyone)
        const sound = spotSound(msg);
        if (sound) sfxRef.current?.play(sound, you || msg.fx === "ring" ? 1 : 0.6);
        const gain = `${msg.qi > 0 ? ` (+${msg.qi} tu vi)` : ""}${msg.room_qi > 0 ? ` · cả phòng +${msg.room_qi} tu vi` : ""}`;
        pushLog({ id: msg.id, name: "", text: `${spot?.emoji ?? "✨"} ${msg.text}${gain}`, you, variant: "spot" });
        if (msg.fx === "dragon") {
          showBanner(`🐉 ${msg.text}${msg.room_qi > 0 ? `\n🎁 Cả phòng +${msg.room_qi} tu vi` : ""}`);
          startRain(["🐉", "✨", "🪷"], false);
        } else if (msg.fx === "boom") {
          showBanner(`💥 ${msg.text}`);
        }
      }),
      client.on("reconnecting", r => {
        setReconnecting(r.attempt);
        setAfkUntil(null);
        setPoll(null);
        setNearSpot(null);
      }),
      client.on("err", e => {
        if (e.code === "seat_taken" && wantedSeat.current !== null) {
          // Two players raced for one cushion: quietly try the next nearest one.
          const now = Date.now();
          refused.current.set(wantedSeat.current, now);
          const skip = new Set<number>();
          refused.current.forEach((at, seat) => { if (now - at < 5000) skip.add(seat); });
          const next = client.nearestFreeSeat(skip);
          wantedSeat.current = next;
          if (next !== null) { client.sit(next); return; }
        }
        const text = errMessage(e);
        if (e.code === "chat_banned") {
          setChatNote(text);
          window.clearTimeout(chatNoteTimer.current);
          chatNoteTimer.current = window.setTimeout(() => setChatNote(null), 12_000);
        }
        showToast(text);
      }),
      client.on("end", info => {
        sfxRef.current?.stopMusic();
        destroyScene();
        setAfkUntil(null);
        setReconnecting(null);
        setPoll(null);
        setGather(null);
        setModTarget(null);
        setNearSpot(null);
        setEnd(info);
        setPhase(info.kind === "ticket_failed" ? "join" : "ended");
        if (info.kind === "ticket_failed") setFormError(info.message);
      }),
    ];
    return () => {
      off.forEach(fn => fn());
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(bannerTimer.current);
      window.clearTimeout(rainTimer.current);
      window.clearTimeout(chatNoteTimer.current);
      destroyScene();
      client.destroy();
      clientRef.current = null;
      sfxRef.current?.close();
      sfxRef.current = null;
    };
  }, [destroyScene, showToast, showBanner, startRain, pushLog, actAt]);

  // Cooldown left on the spot the player stands at, from the local hints.
  useEffect(() => {
    if (!nearSpot) { setSpotLeft(0); return; }
    const id = nearSpot.id;
    const tick = () => setSpotLeft(Math.max(0, Math.ceil(((spotReady.current.get(id) ?? 0) - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [nearSpot, spotRev]);

  // Blessing countdown, ticking locally from the last `gather` frame.
  useEffect(() => {
    if (gather?.phase !== "bless") return;
    const until = gather.until;
    const tick = () => setBlessLeft(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [gather]);

  // Poll time bar; a poll whose `poll_end` never came is dropped a few seconds after its deadline.
  useEffect(() => {
    if (!poll) return;
    const { endsAt, id: pollId } = poll;
    const tick = () => {
      const left = endsAt - Date.now();
      setPollLeft(Math.max(0, left));
      if (left < -5000) setPoll(p => (p && p.id === pollId ? null : p));
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [poll]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, logOpen, mutedIds]);

  useEffect(() => {
    if (afkUntil === null) return;
    const tick = () => setAfkLeft(Math.max(0, Math.ceil((afkUntil - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [afkUntil]);

  // The first coach step completes by actually sitting down.
  useEffect(() => {
    if (seated) setCoachStep(s => (s === COACH_SIT ? s + 1 : s));
  }, [seated]);

  const finishGuide = useCallback(() => {
    setCoachStep(null);
    localStorage.setItem(GUIDE_KEY, "done");
  }, []);

  const nextCoach = useCallback(() => {
    if (coachStep !== null && coachStep + 1 < COACH_STEPS.length) setCoachStep(coachStep + 1);
    else finishGuide();
  }, [coachStep, finishGuide]);

  const enter = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { setFormError("Đạo hiệu cần từ 2 đến 16 ký tự."); return; }
    setFormError(null);
    setEnd(null);
    localStorage.setItem(NAME_KEY, trimmed);
    localStorage.setItem(LOOK_KEY, String(look));
    setPhase("connecting");
    mutedRef.current = new Set();
    setMutedIds(new Set());
    sfxRef.current?.unlock(); // inside the click: browsers only allow audio after a gesture
    sfxRef.current?.startMusic();
    void clientRef.current?.connect({ name: trimmed, look });
  }, [name, look]);

  const leave = useCallback(() => {
    sfxRef.current?.stopMusic();
    destroyScene();
    clientRef.current?.disconnect();
    setAfkUntil(null);
    setReconnecting(null);
    setPoll(null);
    setGather(null);
    setModTarget(null);
    setNearSpot(null);
    setPhase("join");
  }, [destroyScene]);

  const toggleSit = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    if (client.me?.s === MODE_SIT) { client.stand(); return; }
    const seat = client.nearestFreeSeat();
    wantedSeat.current = seat;
    if (seat === null) showToast("Các bồ đoàn đều đã có người.");
    else client.sit(seat);
  }, [showToast]);

  const sendDraft = useCallback(() => {
    if (clientRef.current?.chatText(draft)) setDraft("");
  }, [draft]);

  const confirmHere = useCallback(() => {
    clientRef.current?.here();
    setAfkUntil(null);
  }, []);

  const vote = useCallback((pollId: number, o: number) => {
    if (clientRef.current?.vote(pollId, o)) setMyVote({ poll: pollId, o });
    else showToast("Đang mất kết nối, chưa bỏ phiếu được.");
  }, [showToast]);

  // Chặn / Bỏ chặn: hides that connection's bubbles and chat lines for this session only.
  const toggleMute = useCallback((target: ModTarget) => {
    const next = new Set(mutedRef.current);
    const muting = !next.has(target.id);
    if (muting) next.add(target.id);
    else next.delete(target.id);
    mutedRef.current = next;
    setMutedIds(next);
    setModTarget(null);
    showToast(muting ? `Đã chặn ${target.name}. Lời họ nói sẽ không hiện với bạn nữa (trong lần chơi này).` : `Đã bỏ chặn ${target.name}.`);
  }, [showToast]);

  const sendReport = useCallback((target: ModTarget, reason: ReportReason) => {
    setModTarget(null);
    if (!clientRef.current?.report(target.id, reason)) showToast("Đang mất kết nối, chưa gửi báo cáo được.");
  }, [showToast]);

  const curRank = ranks[myRank];
  const nextRank = ranks[myRank + 1];
  const progress = curRank && nextRank ? Math.min(1, Math.max(0, (qi - curRank.min_qi) / (nextRank.min_qi - curRank.min_qi))) : 1;
  const unlockRank = ranks[freeChatRank];
  const canType = chatMode === "free" || (chatMode === "rank" && myRank >= freeChatRank);
  const chatLockLabel = chatMode === "rank" && unlockRank
    ? `🔒 Đạt ${shortRank(unlockRank.name)} để tự gõ chat · còn ${Math.max(0, unlockRank.min_qi - qi).toLocaleString("vi-VN")} tu vi`
    : "🔒 Chat tự do đang tạm đóng";
  const chatLockReason = chatMode === "rank" && unlockRank
    ? `Mới vào chỉ dùng được câu có sẵn bên dưới. Ngồi thiền lên ${unlockRank.name} (còn ${Math.max(0, unlockRank.min_qi - qi).toLocaleString("vi-VN")} tu vi) là được tự gõ chat.`
    : "Chat tự do đang tạm đóng cho mọi người. Hãy dùng câu có sẵn bên dưới.";
  // Chặn hides a muted player's chat lines; system/event lines about them stay.
  const shownLog = mutedIds.size === 0 ? log : log.filter(line => line.variant !== undefined || !mutedIds.has(line.id));

  return (
    <main className="dt-root" id="main-content">
      <div className="dt-stage" ref={stageRef} />

      {phase === "live" && (
        <div className="dt-hud">
          <div className="dt-top">
            <div className="dt-top-left">
              <div className="dt-glass dt-roombar">
                <b>{roomName}</b>
                <span title="Số người trong phòng">👥 {online}</span>
                <span className="dt-roombar-actions">
                  <button type="button" className="dt-btn dt-btn--ghost dt-chip-btn" aria-pressed={!muted} title={muted ? "Bật âm thanh" : "Tắt âm thanh"} aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"} onClick={() => { const next = !muted; sfxRef.current?.setMuted(next); setMuted(next); }}>{muted ? "🔇" : "🔊"}</button>
                  <button type="button" className="dt-btn dt-btn--ghost dt-chip-btn" title="Cách chơi" aria-label="Cách chơi" onClick={() => { setHelpSpots(false); setHelpOpen(true); }}>❓</button>
                  <button type="button" className="dt-btn dt-btn--ghost dt-chip-btn" onClick={leave}>Rời đi</button>
                </span>
              </div>
              <button type="button" className="dt-glass dt-master" onClick={() => setBoardOpen(v => !v)} aria-expanded={boardOpen}>
                <span className="dt-master-crown">👑</span>
                <small>Chưởng môn tuần này · {boardOpen ? "đóng bảng" : "xem bảng"}</small>
                <b>{sect?.master ? sect.master.name : "đang bỏ trống"}</b>
              </button>
              <button type="button" className="dt-glass dt-offer-cta" onClick={() => setOfferOpen(true)}>
                🍜 Mời Thiên Đạo bát phở <small>· cả tông môn được phát lộc</small>
              </button>
              {boardOpen && (
                <div className="dt-glass dt-board" role="dialog" aria-label="Phong Vân bảng">
                  <h3>Bảng xếp hạng tu vi tuần này</h3>
                  <p className="dt-board-note">Ai đứng đầu là Chưởng môn 👑. Làm lại từ đầu lúc 0:00 thứ Hai.</p>
                  {sect && sect.top.length > 0 ? (
                    <ol>
                      {sect.top.map((e, i) => (
                        <li key={`${i}-${e.name}`} className={e.me ? "is-me" : undefined}>
                          <span className="dt-board-pos">{i === 0 ? "👑" : i + 1}</span>
                          <span className={`dt-rank dt-rank--${Math.min(e.rank, 5)}`}>{shortRank(ranks[e.rank]?.name ?? "")}</span>
                          <span className="dt-board-name">{e.me ? `${e.name} (bạn)` : e.name}</span>
                          <span className="dt-board-qi">{e.qi.toLocaleString("vi-VN")}</span>
                        </li>
                      ))}
                    </ol>
                  ) : <p className="dt-board-note">Tuần này chưa ai tu luyện. Ngồi xuống là thành Chưởng môn!</p>}
                </div>
              )}
            </div>

            <div className={`dt-glass dt-status${seated && rate > 0 ? " is-active" : ""}`} aria-live="off">
              <span className={`dt-rank dt-rank--${Math.min(myRank, 5)}`}>{curRank?.name ?? ""}</span>
              <span className="dt-qi-num">{qi.toLocaleString("vi-VN")} <small>tu vi</small></span>
              {nextRank ? (
                <>
                  <div className="dt-progress" aria-hidden="true"><div style={{ width: `${progress * 100}%` }} /></div>
                  <small>Còn {Math.max(0, nextRank.min_qi - qi).toLocaleString("vi-VN")} tu vi → {shortRank(nextRank.name)}{perks[nextRank.id] ? ` (mở ${perks[nextRank.id]?.join(", ")})` : ""}</small>
                </>
              ) : <small>Đã ở cấp cao nhất tông môn</small>}
              <small className="dt-rate">
                {!seated ? "Đang đứng: bấm Ngồi thiền để tăng tu vi"
                  : rate <= 0 ? "Đang vào thế ngồi…"
                    : `Đang tu luyện +${fmt(rate)}/giây${together > 1 ? ` · ${together} người cùng ngồi` : ""}${onInner ? " · linh mạch ×1,5" : ""}${gather?.phase === "bless" ? ` · lộc ×${fmt(gather.mult)}` : ""}`}
              </small>
              {gather && (gather.phase === "bless" ? (
                <div className="dt-gather is-bless" title="Cả phòng đang được nhân tu vi khi ngồi thiền">
                  ✨ Thiên Đạo giáng lộc ×{fmt(gather.mult)} · còn {Math.floor(blessLeft / 60)}:{String(blessLeft % 60).padStart(2, "0")}
                </div>
              ) : (
                <div className="dt-gather" title="Cả phòng cùng ngồi thiền để tụ khí; đầy thanh là cả phòng được nhân đôi tu vi">
                  <span>🌀 Linh mạch tụ khí {gather.pct}%</span>
                  <div className="dt-progress dt-gather-bar" role="progressbar" aria-label="Linh mạch tụ khí" aria-valuemin={0} aria-valuemax={100} aria-valuenow={gather.pct}>
                    <div style={{ width: `${gather.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {reconnecting !== null && (
            <div className="dt-glass dt-reconnect" role="status">📡 Mất kết nối, đang nối lại linh mạch… (lần {reconnecting})</div>
          )}
          {flash > 0 && <div key={flash} className="dt-flash" aria-hidden="true" />}
          {rain && (
            <div key={rain.key} className="dt-rain" aria-hidden="true">
              {RAIN.map((d, i) => (rain.art && i % 3 === 2
                ? <img key={i} src={i % 2 ? "/chanh-dien/la-ngoc.png" : "/chanh-dien/linh-lien.png"} alt="" style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, width: d.size * 1.4 }} />
                : <span key={i} style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, fontSize: d.size }}>{rain.glyphs[i % rain.glyphs.length]}</span>))}
            </div>
          )}
          {banner && <div className={banner.offering ? "dt-banner dt-banner--offering" : "dt-banner"} role="status">{banner.text}</div>}

          {toast && <div className="dt-glass dt-toast" role="status">{toast}</div>}
          {coachStep !== null && <Coach step={coachStep} onNext={nextCoach} onSkip={finishGuide} />}

          {modTarget && (
            <div className="dt-glass dt-modmenu" role="dialog" aria-label={`Tuỳ chọn cho ${modTarget.name}`}>
              <b className="dt-modmenu-name">{modTarget.name}</b>
              {modTarget.step === "menu" ? (
                <div className="dt-modmenu-actions">
                  <button type="button" className="dt-btn" onClick={() => toggleMute(modTarget)}>{mutedIds.has(modTarget.id) ? "🔈 Bỏ chặn" : "🔇 Chặn"}</button>
                  <button type="button" className="dt-btn" onClick={() => setModTarget({ ...modTarget, step: "report" })}>🚩 Báo cáo</button>
                  <button type="button" className="dt-btn dt-btn--ghost" onClick={() => setModTarget(null)}>Thôi</button>
                </div>
              ) : (
                <>
                  <small>Báo cáo vì lý do gì? Đủ nhiều người báo thì người này tạm bị khoá tự gõ chat.</small>
                  <div className="dt-modmenu-actions">
                    {REPORT_REASONS.map(r => (
                      <button key={r.id} type="button" className="dt-btn" onClick={() => sendReport(modTarget, r.id)}>{r.label}</button>
                    ))}
                    <button type="button" className="dt-btn dt-btn--ghost" onClick={() => setModTarget({ ...modTarget, step: "menu" })}>Quay lại</button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="dt-bottom">
            {poll && (
              <section className="dt-glass dt-poll" aria-label="Thiên Đạo hỏi">
                <div className="dt-poll-head">
                  <small>☁️ Thiên Đạo hỏi · còn {Math.ceil(pollLeft / 1000)}s</small>
                  <b>{poll.q}</b>
                </div>
                <div className="dt-poll-opts">
                  {poll.opts.map((o, i) => (
                    <button key={`${poll.id}-${i}`} type="button" className="dt-poll-opt" aria-pressed={myVote?.poll === poll.id && myVote.o === i} onClick={() => vote(poll.id, i)}>
                      <span>{o}</span>
                      <b>{poll.counts[i] ?? 0}</b>
                    </button>
                  ))}
                </div>
                <div className="dt-poll-time" aria-hidden="true"><div style={{ width: `${Math.min(100, (pollLeft / poll.total) * 100)}%` }} /></div>
                <small className="dt-poll-hint">{myVote?.poll === poll.id ? "Đã bỏ phiếu · đổi ý thì bấm lựa chọn khác" : "Bấm một lựa chọn, cả phòng cùng quyết"}</small>
              </section>
            )}
            <div className="dt-logwrap" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button type="button" className="dt-btn dt-glass dt-logtoggle" onClick={() => setLogOpen(v => !v)} aria-expanded={logOpen}>
                {logOpen ? "Ẩn lời trò chuyện" : `Lời trò chuyện (${shownLog.length})`}
              </button>
              {logOpen && shownLog.length > 0 && (
                <div className="dt-glass dt-log" ref={logRef}>
                  {shownLog.map(line => (
                    line.variant === "twist"
                      ? <p key={line.key} className="dt-log-twist">✨ {line.text}</p>
                      : line.variant === "offering"
                        ? <p key={line.key} className="dt-log-offering">🙏 {line.text}</p>
                      : line.variant === "spot"
                        ? <p key={line.key} className="dt-log-spot">{line.text}</p>
                      : line.variant === "event"
                        ? <p key={line.key} className="dt-log-event">{line.text}</p>
                      : line.variant === "system"
                        ? <p key={line.key} className="dt-log-system">✦ <b>{line.name}</b> {line.text}</p>
                        : line.you
                          ? <p key={line.key} className="dt-log-you"><b>{line.name}:</b> {line.text}</p>
                          : <p key={line.key}><button type="button" className="dt-log-name" title="Chặn hoặc báo cáo" onClick={() => setModTarget({ id: line.id, name: line.name, step: "menu" })}>{line.name}:</button> {line.text}</p>
                  ))}
                </div>
              )}
            </div>

            {nearSpot && (
              <button
                type="button"
                className={`dt-btn dt-btn--gold dt-spotbtn${spotLeft > 0 ? " is-cooling" : ""}`}
                aria-label={spotLeft > 0 ? `${nearSpot.label}, còn ${fmtLeft(spotLeft)}` : nearSpot.label}
                onClick={() => actAt(nearSpot)}
              >
                <span className="dt-spotbtn-emoji" aria-hidden="true">{nearSpot.emoji}</span>
                <span>{nearSpot.label}</span>
                {spotLeft > 0 && <small>còn {fmtLeft(spotLeft)}</small>}
              </button>
            )}

            <div className="dt-glass dt-dock">
              <div className="dt-row">
                <button type="button" className="dt-btn dt-btn--gold dt-sit" onClick={toggleSit}>{seated ? "Đứng dậy" : "Ngồi thiền"}</button>
                <div className="dt-scroll" role="group" aria-label="Biểu cảm">
                  {emotes.map(e => (
                    <button key={String(e.id)} type="button" className="dt-emobtn" title={e.name} aria-label={e.name} onClick={() => clientRef.current?.emote(e.id)}>{glyphOf(e.id)}</button>
                  ))}
                </div>
              </div>
              {chatNote && <p className="dt-chatnote" role="status">🔒 {chatNote}</p>}
              {canType ? (
                <form className="dt-chatform" onSubmit={ev => { ev.preventDefault(); sendDraft(); }}>
                  <input className="dt-input" value={draft} maxLength={80} placeholder="Nói với các đạo hữu…" aria-label="Tin nhắn" onChange={ev => setDraft(ev.target.value)} />
                  <button type="submit" className="dt-btn" disabled={draft.trim() === ""}>Gửi</button>
                </form>
              ) : (
                <button type="button" className="dt-chatlock" onClick={() => showToast(chatLockReason)}>{chatLockLabel}</button>
              )}
              <div className="dt-scroll dt-phrases" role="group" aria-label="Câu nói có sẵn">
                {phrases.map(p => (
                  <button key={String(p.id)} type="button" className="dt-chipbtn" onClick={() => clientRef.current?.chatPreset(p.id)}>{p.text}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {(phase === "join" || phase === "connecting") && (
        <div className="dt-overlay">
          <form className="dt-glass dt-card" onSubmit={ev => { ev.preventDefault(); if (phase === "join") enter(); }}>
            <h1 className="dt-title">Đạo Tràng Online</h1>
            <ul className="dt-intro">
              <li><span>🧘</span>Ngồi thiền cùng mọi người để tăng tu vi.</li>
              <li><span>📈</span>Thăng cấp từ Tạp dịch lên Trưởng lão.</li>
              <li><span>👑</span>Nhiều tu vi nhất tuần làm Chưởng môn.</li>
            </ul>
            <p className="dt-intro-note">Không cần đăng ký · tiến độ tự lưu trên máy này</p>
            {phase === "connecting" ? (
              <><div className="dt-spin" /><p className="dt-sub">Đang mở cửa đạo tràng…</p></>
            ) : (
              <>
                <label className="dt-field">
                  <span>Đạo hiệu</span>
                  <input className="dt-input" value={name} maxLength={16} autoComplete="nickname" placeholder="Ví dụ: Thanh Vân Tử" onChange={ev => setName(ev.target.value)} />
                </label>
                <div className="dt-field">
                  <span>Màu đạo bào</span>
                  <div className="dt-swatches" role="radiogroup" aria-label="Màu đạo bào">
                    {ROBE_LOOKS.map((l, i) => (
                      <button key={l.name} type="button" role="radio" aria-checked={look === i} aria-label={l.name} title={l.name} className="dt-swatch" style={{ background: cssHex(l.hex) }} onClick={() => setLook(i)} />
                    ))}
                  </div>
                  <div className="dt-look-name">{ROBE_LOOKS[look]?.name}</div>
                </div>
                {formError && <p className="dt-error" role="alert">{formError}</p>}
                <div className="dt-actions">
                  <button type="submit" className="dt-btn dt-btn--gold">Vào Đạo Tràng</button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {phase === "ended" && end && (
        <div className="dt-overlay dt-overlay--dim">
          <div className="dt-glass dt-card" role="alertdialog" aria-live="assertive">
            <h2 className="dt-title" style={{ fontSize: 26 }}>Đã rời đạo tràng</h2>
            <p className="dt-sub">{end.message}</p>
            <div className="dt-actions"><button type="button" className="dt-btn dt-btn--gold" onClick={() => { setEnd(null); setPhase("join"); }}>Vào lại</button></div>
          </div>
        </div>
      )}

      {phase === "live" && offerOpen && clientRef.current && (
        <OfferingSheet client={clientRef.current} items={offerItems} paymentsOpen={paymentsOpen} onClose={() => setOfferOpen(false)} showToast={showToast} />
      )}

      {phase === "live" && helpOpen && (
        <HelpSheet
          ranks={ranks}
          perks={perks}
          chatUnlock={chatMode === "rank" ? unlockRank ?? null : null}
          spots={spots}
          focusSpots={helpSpots}
          onClose={() => setHelpOpen(false)}
          onReplayGuide={() => { setHelpOpen(false); setCoachStep(0); }}
          onTransfer={() => { setHelpOpen(false); setTransferOpen(true); }}
        />
      )}

      {phase === "live" && transferOpen && (
        <div className="dt-overlay dt-overlay--dim" role="dialog" aria-label="Chuyển sang máy khác">
          <div className="dt-glass dt-card dt-transfer">
            <h2 className="dt-title" style={{ fontSize: 24 }}>Chuyển sang máy khác</h2>
            <p className="dt-sub">Tu vi của bạn lưu trên máy này. Mở liên kết dưới đây trên máy khác để chơi tiếp ở đó.</p>
            <p className="dt-error">Ai có liên kết này đều dùng được tu vi của bạn. Chỉ gửi cho chính mình.</p>
            <input className="dt-input" readOnly value={`${location.origin}/${TOKEN_HASH}${storedToken() ?? ""}`} aria-label="Liên kết đạo tịch" onFocus={ev => ev.currentTarget.select()} />
            <div className="dt-actions">
              <button type="button" className="dt-btn dt-btn--gold" onClick={() => {
                void navigator.clipboard.writeText(`${location.origin}/${TOKEN_HASH}${storedToken() ?? ""}`)
                  .then(() => showToast("Đã chép liên kết đạo tịch."), () => showToast("Không chép được, hãy chọn và chép thủ công."));
              }}>Chép liên kết</button>
            </div>
            <hr />
            <label className="dt-field">
              <span>Hoặc dán đạo tịch / liên kết từ máy khác</span>
              <input className="dt-input" value={pasted} onChange={ev => setPasted(ev.target.value)} placeholder="…#dt=xxxx hoặc mã đạo tịch" />
            </label>
            <div className="dt-actions">
              <button type="button" className="dt-btn" disabled={pasted.trim() === ""} onClick={() => {
                const raw = pasted.includes(TOKEN_HASH) ? pasted.slice(pasted.indexOf(TOKEN_HASH) + TOKEN_HASH.length) : pasted;
                if (!adoptToken(decodeURIComponent(raw))) { showToast("Đạo tịch không hợp lệ."); return; }
                setPasted("");
                setTransferOpen(false);
                leave();
                enter();
              }}>Dùng đạo tịch này</button>
              <button type="button" className="dt-btn dt-btn--ghost" onClick={() => setTransferOpen(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {phase === "live" && afkUntil !== null && (
        <div className="dt-overlay dt-overlay--dim" role="alertdialog" aria-live="assertive">
          <div className="dt-glass dt-card">
            <h2 className="dt-title" style={{ fontSize: 26 }}>Bạn còn ở đây không?</h2>
            <p className="dt-sub">Đạo hữu sẽ được mời ra để nhường chỗ nếu không trả lời.</p>
            <div className="dt-count">{afkLeft}s</div>
            <div className="dt-actions"><button type="button" className="dt-btn dt-btn--gold" onClick={confirmHere}>Tôi vẫn ở đây</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
