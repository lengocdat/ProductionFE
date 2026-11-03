// Wire protocol of the shared cultivation room. Authoritative spec: BE/internal/room/README.md.
// Everything arriving from the socket is `unknown` until it passes parseServerMessage().

/** README does not pin the id type; accept number or string and echo it back unchanged. */
export type Id = number | string;

export type PlayerId = Id;

/** `s`: 0 standing, 1 walking, 2 seated. */
export type PlayerMode = 0 | 1 | 2;
export const MODE_STAND = 0;
export const MODE_WALK = 1;
export const MODE_SIT = 2;

export type ObstacleKind = 'altar' | 'pond' | 'tree';
/** `rank`: presets for all, free text from `free_chat_rank`; `preset`: presets only; `free`: everyone types. */
export type ChatMode = 'preset' | 'rank' | 'free';

export interface PlayerState {
  id: PlayerId;
  name: string;
  look: number;
  x: number;
  z: number;
  s: PlayerMode;
  /** cushion index or -1 */
  seat: number;
  /** sect rank index into WelcomeMsg.ranks */
  rank: number;
  /** Cúng dường patron tier 0..4: badge from 1, cloud from 2. */
  patron: number;
}

/** One sect tier; `min_qi` is the total tu vi needed. */
export interface RankDef { id: number; name: string; min_qi: number }

/** One cúng dường item. `gift` is tu vi given to EVERYONE online when it is paid. */
export interface OfferingItem { id: string; emoji: string; name: string; price: number; gift: number; tier: number; perk_days: number; perk: string; blurb: string }
/** A bank-transfer offering order, as returned to its buyer. */
export interface OfferingOrder {
  id: string; offering: string; amount: number; transfer_content: string;
  bank_name: string; bank_account: string; bank_holder: string; status: 'pending' | 'paid'; qr_url?: string;
}
export interface RecentOffering { name: string; emoji: string; item: string; paid_at: string }

export interface DeltaPlayer {
  id: PlayerId;
  x: number;
  z: number;
  s: PlayerMode;
  seat: number;
}

/** `min_rank`: lowest sect rank allowed to sit; `bonus`: multiplier on the qi rate. */
export interface Seat { i: number; x: number; z: number; min_rank: number; bonus: number }
export interface Obstacle { x: number; z: number; r: number; kind: ObstacleKind }

export interface Room {
  id: Id;
  name: string;
  w: number;
  d: number;
  speed: number;
  capacity: number;
  chat_mode: ChatMode;
  free_chat_rank: number;
  spawn: { x: number; z: number };
  seats: Seat[];
  obstacles: Obstacle[];
}

export interface Phrase { id: Id; text: string }
export interface EmoteDef { id: Id; name: string }

export type ErrCode =
  | 'seat_taken' | 'chat_rate' | 'chat_bad' | 'bad_msg'
  | 'vote_bad' | 'report_bad' | 'report_dup' | 'report_rate' | 'chat_banned';

// ---------- server -> client ----------

export interface WelcomeMsg {
  t: 'welcome';
  you: PlayerId;
  tick_ms: number;
  room: Room;
  phrases: Phrase[];
  emotes: EmoteDef[];
  ranks: RankDef[];
  players: PlayerState[];
  qi: number;
  offerings: OfferingItem[];
  /** false until the operator opens payments: show the catalogue, refuse orders. */
  payments: boolean;
}
export interface JoinMsg { t: 'join'; p: PlayerState }
export interface LeaveMsg { t: 'leave'; id: PlayerId }
export interface DeltaMsg { t: 'd'; n: number; p: DeltaPlayer[] }
export interface ChatMsg { t: 'chat'; id: PlayerId; text: string; ts: number; ph?: Id }
export interface EmoteMsg { t: 'emote'; id: PlayerId; e: Id }
export interface QiMsg { t: 'qi'; qi: number; rate: number }
export interface AfkMsg { t: 'afk'; deadline_s: number }
export interface ErrMsg { t: 'err'; code: string; msg: string }
export interface KickMsg { t: 'kick'; reason: string }
export interface RankMsg { t: 'rank'; id: PlayerId; rank: number }
/** One Phong Vân bảng line: `qi` is this week's tu vi, `rank` the lifetime sect rank. */
export interface SectEntry { name: string; qi: number; rank: number; me: boolean }
/** Weekly board; `master` (= top[0]) is the Chưởng môn, `master_id` their id if in this room, else 0. */
export interface SectMsg { t: 'sect'; week: string; master: SectEntry | null; master_id: PlayerId; top: SectEntry[] }
export type TwistAnim = 'faint' | 'jump' | 'spin' | 'flip';
/** Thiên Cơ Bất Ngờ: a shared, funny surprise that happened to player `id`. */
export interface TwistMsg { t: 'twist'; id: PlayerId; kind: string; anim: TwistAnim; text: string; qi: number; flash: boolean }
/** A paid offering: `id` is the donor's connection in this room (0 = elsewhere). */
export interface OfferingMsg { t: 'offering'; id: PlayerId; name: string; emoji: string; item: string; text: string; gift: number; patron: number }
/** Linh mạch tụ khí: room-wide bar. `left_s` is blessing time left (0 in fill); `text` only on phase changes. */
export type GatherPhase = 'fill' | 'bless';
export interface GatherMsg { t: 'gather'; phase: GatherPhase; p: number; goal: number; left_s: number; mult: number; text?: string }
/** Thiên Đạo hỏi: an open room vote; re-sent on every tally change with a fresh `left_ms`. */
export interface PollMsg { t: 'poll'; id: number; q: string; opts: string[]; counts: number[]; left_ms: number }
export type PollEffect = 'rain' | 'chicken' | 'dance' | 'gather' | 'song';
export interface PollEndMsg { t: 'poll_end'; id: number; win: number; counts: number[]; text: string; effect: PollEffect; targets: PlayerId[]; qi: number }
export interface ReportOkMsg { t: 'report_ok'; id: PlayerId }

export type ServerMessage =
  | WelcomeMsg | JoinMsg | LeaveMsg | DeltaMsg | ChatMsg | EmoteMsg | QiMsg | AfkMsg | ErrMsg | KickMsg | RankMsg | SectMsg | TwistMsg | OfferingMsg
  | GatherMsg | PollMsg | PollEndMsg | ReportOkMsg;

// ---------- client -> server ----------

export type ReportReason = 'chat' | 'name' | 'spam';

export type ClientMessage =
  | { t: 'move'; x: number; z: number }
  | { t: 'sit'; seat: number }
  | { t: 'stand' }
  | { t: 'chat'; ph: Id }
  | { t: 'chat'; text: string }
  | { t: 'emote'; e: Id }
  | { t: 'here' }
  | { t: 'vote'; poll: number; o: number }
  | { t: 'report'; id: PlayerId; reason: ReportReason };

export interface GuestTicketRequest { token: string; name: string; look: number }
export interface GuestTicketResponse { ticket: string; expires_in: number; ws_path: string }

// ---------- close codes ----------

export const CLOSE_FULL = 4001;
export const CLOSE_BAD_TICKET = 4002;
export const CLOSE_AFK = 4003;
export const CLOSE_TOO_MANY = 4004;
export const CLOSE_SPAM = 4005;
export const CLOSE_REPLACED = 4007;

export const CHAT_MAX_LEN = 80;
export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 16;
export const LOOK_COUNT = 6;

// ---------- guards ----------

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function isId(v: unknown): v is Id {
  return isNum(v) || (isStr(v) && v.length > 0);
}
function asMode(v: unknown): PlayerMode | null {
  return v === 0 || v === 1 || v === 2 ? v : null;
}

function parsePlayer(v: unknown): PlayerState | null {
  if (!isRec(v)) return null;
  const mode = asMode(v.s);
  if (!isId(v.id) || !isNum(v.x) || !isNum(v.z) || mode === null) return null;
  return {
    id: v.id,
    name: isStr(v.name) ? v.name : '',
    look: isNum(v.look) ? Math.max(0, Math.min(LOOK_COUNT - 1, Math.trunc(v.look))) : 0,
    x: v.x,
    z: v.z,
    s: mode,
    seat: isNum(v.seat) ? Math.trunc(v.seat) : -1,
    rank: isNum(v.rank) ? Math.max(0, Math.trunc(v.rank)) : 0,
    patron: isNum(v.patron) ? Math.max(0, Math.trunc(v.patron)) : 0,
  };
}

function parseDeltaPlayer(v: unknown): DeltaPlayer | null {
  if (!isRec(v)) return null;
  const mode = asMode(v.s);
  if (!isId(v.id) || !isNum(v.x) || !isNum(v.z) || mode === null) return null;
  return { id: v.id, x: v.x, z: v.z, s: mode, seat: isNum(v.seat) ? Math.trunc(v.seat) : -1 };
}

function parseList<T>(v: unknown, item: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  const out: T[] = [];
  for (const el of v) {
    const parsed = item(el);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

function parseRoom(v: unknown): Room | null {
  if (!isRec(v)) return null;
  if (!isNum(v.w) || !isNum(v.d) || v.w <= 0 || v.d <= 0) return null;
  const spawn = isRec(v.spawn) && isNum(v.spawn.x) && isNum(v.spawn.z)
    ? { x: v.spawn.x, z: v.spawn.z }
    : { x: v.w / 2, z: v.d / 2 };
  const seats = parseList<Seat>(v.seats, s => (isRec(s) && isNum(s.i) && isNum(s.x) && isNum(s.z)
    ? { i: Math.trunc(s.i), x: s.x, z: s.z, min_rank: isNum(s.min_rank) ? Math.trunc(s.min_rank) : 0, bonus: isNum(s.bonus) && s.bonus > 0 ? s.bonus : 1 }
    : null));
  const obstacles = parseList<Obstacle>(v.obstacles, o => {
    if (!isRec(o) || !isNum(o.x) || !isNum(o.z) || !isNum(o.r)) return null;
    if (o.kind !== 'altar' && o.kind !== 'pond' && o.kind !== 'tree') return null;
    return { x: o.x, z: o.z, r: Math.max(0.1, o.r), kind: o.kind };
  });
  return {
    id: isId(v.id) ? v.id : 'room',
    name: isStr(v.name) ? v.name : 'Đạo Tràng',
    w: v.w,
    d: v.d,
    speed: isNum(v.speed) && v.speed > 0 ? v.speed : 3,
    capacity: isNum(v.capacity) ? v.capacity : 50,
    chat_mode: v.chat_mode === 'free' || v.chat_mode === 'rank' ? v.chat_mode : 'preset',
    free_chat_rank: isNum(v.free_chat_rank) ? Math.max(0, Math.trunc(v.free_chat_rank)) : 0,
    spawn,
    seats,
    obstacles,
  };
}

/** Parses one text frame. Returns null for anything malformed or unknown (callers ignore it). */
export function parseServerMessage(raw: unknown): ServerMessage | null {
  if (!isRec(raw) || !isStr(raw.t)) return null;
  switch (raw.t) {
    case 'welcome': {
      const room = parseRoom(raw.room);
      if (!room || !isId(raw.you)) return null;
      return {
        t: 'welcome',
        you: raw.you,
        tick_ms: isNum(raw.tick_ms) && raw.tick_ms > 0 ? raw.tick_ms : 100,
        room,
        phrases: parseList<Phrase>(raw.phrases, p => (isRec(p) && isId(p.id) && isStr(p.text) ? { id: p.id, text: p.text } : null)),
        emotes: parseList<EmoteDef>(raw.emotes, e => (isRec(e) && isId(e.id) ? { id: e.id, name: isStr(e.name) ? e.name : String(e.id) } : null)),
        ranks: parseList<RankDef>(raw.ranks, r => (isRec(r) && isNum(r.id) && isStr(r.name) && isNum(r.min_qi) ? { id: Math.trunc(r.id), name: r.name, min_qi: r.min_qi } : null)),
        players: parseList(raw.players, parsePlayer),
        qi: isNum(raw.qi) ? raw.qi : 0,
        offerings: parseList<OfferingItem>(raw.offerings, parseOfferingItem),
        payments: raw.payments === true,
      };
    }
    case 'join': {
      const p = parsePlayer(raw.p);
      return p ? { t: 'join', p } : null;
    }
    case 'leave':
      return isId(raw.id) ? { t: 'leave', id: raw.id } : null;
    case 'd':
      return { t: 'd', n: isNum(raw.n) ? raw.n : 0, p: parseList(raw.p, parseDeltaPlayer) };
    case 'chat':
      if (!isId(raw.id) || !isStr(raw.text)) return null;
      return { t: 'chat', id: raw.id, text: raw.text, ts: isNum(raw.ts) ? raw.ts : Date.now(), ph: isId(raw.ph) ? raw.ph : undefined };
    case 'emote':
      return isId(raw.id) && isId(raw.e) ? { t: 'emote', id: raw.id, e: raw.e } : null;
    case 'qi':
      return isNum(raw.qi) ? { t: 'qi', qi: raw.qi, rate: isNum(raw.rate) ? raw.rate : 0 } : null;
    case 'afk':
      return { t: 'afk', deadline_s: isNum(raw.deadline_s) && raw.deadline_s > 0 ? raw.deadline_s : 60 };
    case 'err':
      return isStr(raw.code) ? { t: 'err', code: raw.code, msg: isStr(raw.msg) ? raw.msg : '' } : null;
    case 'kick':
      return { t: 'kick', reason: isStr(raw.reason) ? raw.reason : '' };
    case 'rank':
      return isId(raw.id) && isNum(raw.rank) ? { t: 'rank', id: raw.id, rank: Math.max(0, Math.trunc(raw.rank)) } : null;
    case 'sect': {
      const top = parseList<SectEntry>(raw.top, parseSectEntry);
      return { t: 'sect', week: isStr(raw.week) ? raw.week : '', master: parseSectEntry(raw.master), master_id: isId(raw.master_id) ? raw.master_id : 0, top };
    }
    case 'offering':
      if (!isId(raw.id) || !isStr(raw.name) || !isStr(raw.text)) return null;
      return {
        t: 'offering', id: raw.id, name: raw.name, emoji: isStr(raw.emoji) ? raw.emoji : '🙏', item: isStr(raw.item) ? raw.item : '',
        text: raw.text, gift: isNum(raw.gift) ? raw.gift : 0, patron: isNum(raw.patron) ? Math.max(0, Math.trunc(raw.patron)) : 0,
      };
    case 'twist': {
      if (!isId(raw.id) || !isStr(raw.text)) return null;
      const anim: TwistAnim = raw.anim === 'faint' || raw.anim === 'jump' || raw.anim === 'flip' ? raw.anim : 'spin';
      return { t: 'twist', id: raw.id, kind: isStr(raw.kind) ? raw.kind : '', anim, text: raw.text, qi: isNum(raw.qi) ? raw.qi : 0, flash: raw.flash === true };
    }
    case 'gather': {
      if (raw.phase !== 'fill' && raw.phase !== 'bless') return null;
      const goal = isNum(raw.goal) && raw.goal > 0 ? raw.goal : 1;
      return {
        t: 'gather', phase: raw.phase, p: isNum(raw.p) ? Math.max(0, Math.min(goal, raw.p)) : 0, goal,
        left_s: isNum(raw.left_s) ? Math.max(0, raw.left_s) : 0, mult: isNum(raw.mult) && raw.mult > 0 ? raw.mult : 1,
        text: isStr(raw.text) && raw.text !== '' ? raw.text : undefined,
      };
    }
    case 'poll': {
      if (!isNum(raw.id) || !isStr(raw.q) || !Array.isArray(raw.opts)) return null;
      const opts = raw.opts.filter(isStr).slice(0, 3);
      if (opts.length < 2 || opts.length !== raw.opts.length) return null;
      return { t: 'poll', id: raw.id, q: raw.q, opts, counts: parseCounts(raw.counts, opts.length), left_ms: isNum(raw.left_ms) ? Math.max(0, raw.left_ms) : 0 };
    }
    case 'poll_end': {
      if (!isNum(raw.id) || !isNum(raw.win) || !isStr(raw.text)) return null;
      const effect: PollEffect = raw.effect === 'rain' || raw.effect === 'chicken' || raw.effect === 'dance' || raw.effect === 'song' ? raw.effect : 'gather';
      const counts = Array.isArray(raw.counts) ? parseCounts(raw.counts, Math.min(3, raw.counts.length)) : [];
      return {
        t: 'poll_end', id: raw.id, win: Math.trunc(raw.win), counts, text: raw.text, effect,
        targets: parseList<PlayerId>(raw.targets, v => (isId(v) ? v : null)), qi: isNum(raw.qi) ? Math.max(0, raw.qi) : 0,
      };
    }
    case 'report_ok':
      return isId(raw.id) ? { t: 'report_ok', id: raw.id } : null;
    default:
      return null;
  }
}

/** Vote tallies: exactly `n` non-negative integers, missing ones as 0. */
function parseCounts(v: unknown, n: number): number[] {
  const src = Array.isArray(v) ? v : [];
  return Array.from({ length: n }, (_, i) => {
    const c: unknown = src[i];
    return isNum(c) ? Math.max(0, Math.trunc(c)) : 0;
  });
}

export function parseTicketResponse(raw: unknown): GuestTicketResponse | null {
  if (!isRec(raw) || !isStr(raw.ticket) || raw.ticket === '') return null;
  return {
    ticket: raw.ticket,
    expires_in: isNum(raw.expires_in) ? raw.expires_in : 30,
    ws_path: isStr(raw.ws_path) && raw.ws_path.startsWith('/') ? raw.ws_path : '/v1/room/ws',
  };
}

export function parseDiscipleResponse(raw: unknown): string | null {
  return isRec(raw) && isStr(raw.token) && raw.token !== '' ? raw.token : null;
}

function parseOfferingItem(v: unknown): OfferingItem | null {
  if (!isRec(v) || !isStr(v.id) || !isStr(v.name) || !isNum(v.price) || !isNum(v.gift)) return null;
  return {
    id: v.id, emoji: isStr(v.emoji) ? v.emoji : '🙏', name: v.name, price: v.price, gift: v.gift,
    tier: isNum(v.tier) ? v.tier : 0, perk_days: isNum(v.perk_days) ? v.perk_days : 0,
    perk: isStr(v.perk) ? v.perk : '', blurb: isStr(v.blurb) ? v.blurb : '',
  };
}

/** Parses `{order: …}` from the offering endpoints. */
export function parseOfferingOrder(raw: unknown): OfferingOrder | null {
  const o = isRec(raw) && isRec(raw.order) ? raw.order : null;
  if (!o || !isStr(o.id) || !isStr(o.offering) || !isNum(o.amount) || !isStr(o.transfer_content)) return null;
  return {
    id: o.id, offering: o.offering, amount: o.amount, transfer_content: o.transfer_content,
    bank_name: isStr(o.bank_name) ? o.bank_name : '', bank_account: isStr(o.bank_account) ? o.bank_account : '',
    bank_holder: isStr(o.bank_holder) ? o.bank_holder : '', status: o.status === 'paid' ? 'paid' : 'pending',
    qr_url: isStr(o.qr_url) && o.qr_url.startsWith('https://img.vietqr.io/') ? o.qr_url : undefined,
  };
}

export function parseRecentOfferings(raw: unknown): RecentOffering[] {
  return parseList<RecentOffering>(isRec(raw) ? raw.recent : null, r => (isRec(r) && isStr(r.name) && isStr(r.item) && isStr(r.paid_at)
    ? { name: r.name, emoji: isStr(r.emoji) ? r.emoji : '🙏', item: r.item, paid_at: r.paid_at }
    : null));
}

function parseSectEntry(v: unknown): SectEntry | null {
  if (!isRec(v) || !isStr(v.name) || !isNum(v.qi)) return null;
  return { name: v.name, qi: v.qi, rank: isNum(v.rank) ? Math.max(0, Math.trunc(v.rank)) : 0, me: v.me === true };
}
