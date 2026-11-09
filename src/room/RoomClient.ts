import { APIError, request } from '@/game/api';
import {
  CLOSE_AFK, CLOSE_BAD_TICKET, CLOSE_FULL, CLOSE_REPLACED, CLOSE_SPAM, CLOSE_TOO_MANY, CHAT_MAX_LEN, MODE_SIT,
  parseDiscipleResponse, parseServerMessage, parseTicketResponse,
  type ActMsg, type AfkMsg, type ChatMsg, type ClientMessage, type DeltaMsg, type EmoteDef, type EmoteMsg, type ErrMsg, type GatherMsg, type GuestTicketResponse,
  type Id, type OfferingMsg, type OfferingOrder, type PlayerId, type PlayerState, type Phrase, type PollEndMsg, type PollMsg, type QiMsg, type RankDef, type RankMsg,
  type RecentOffering, type ReportOkMsg, type ReportReason, type Room, type SectMsg, type ServerMessage, type TwistMsg, type WelcomeMsg,
  parseOfferingOrder, parseRecentOfferings,
} from './protocol';

/** Device token of this browser's disciple (đạo tịch). Losing it loses the tu vi. */
const TOKEN_KEY = 'dt:token';
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,64}$/;

/** The đạo tịch of this browser, or null on first visit. It is a bearer secret. */
export function storedToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** Adopts a đạo tịch brought from another device. Returns false for anything malformed. */
export function adoptToken(token: string): boolean {
  const clean = token.trim();
  if (!TOKEN_SHAPE.test(clean)) return false;
  localStorage.setItem(TOKEN_KEY, clean);
  return true;
}

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'ended';

export type EndKind = 'full' | 'bad_ticket' | 'afk' | 'too_many' | 'spam' | 'replaced' | 'kicked' | 'ticket_failed' | 'network';

export interface RoomEnd {
  kind: EndKind;
  /** Vietnamese message safe to show to the user. */
  message: string;
  code: number | null;
}

export interface RoomClientEvents {
  state: ConnectionState;
  welcome: WelcomeMsg;
  join: PlayerState;
  leave: PlayerId;
  delta: DeltaMsg;
  chat: ChatMsg;
  emote: EmoteMsg;
  qi: QiMsg;
  afk: AfkMsg;
  err: ErrMsg;
  rank: RankMsg;
  sect: SectMsg;
  twist: TwistMsg;
  offering: OfferingMsg;
  gather: GatherMsg;
  poll: PollMsg;
  poll_end: PollEndMsg;
  report_ok: ReportOkMsg;
  /** Someone used a spot; the client already added `qi`/`room_qi` to its own tu vi. */
  act: ActMsg;
  /** An established session dropped; attempt `attempt` (1-based) starts after `delayMs`. A `welcome` means it worked. */
  reconnecting: { attempt: number; delayMs: number };
  /** Fired once per session when the connection is over. A new session needs `connect()` again (fresh ticket). */
  end: RoomEnd;
}

type Listener<K extends keyof RoomClientEvents> = (payload: RoomClientEvents[K]) => void;
type ListenerSets = { [K in keyof RoomClientEvents]?: Set<Listener<K>> };

export interface ConnectOptions { name: string; look: number }

export const END_MESSAGES: Record<Exclude<EndKind, 'kicked' | 'ticket_failed'>, string> = {
  full: 'Đạo tràng đã đầy người. Hãy thử lại sau ít phút.',
  bad_ticket: 'Phiên vào đạo tràng đã hết hạn hoặc không hợp lệ. Hãy vào lại.',
  afk: 'Bạn đã bị mời ra vì không hoạt động quá lâu.',
  too_many: 'Có quá nhiều kết nối từ mạng của bạn. Hãy đóng bớt tab khác rồi vào lại.',
  spam: 'Bạn đã bị mời ra vì gửi tin quá nhanh.',
  replaced: 'Đạo tịch của bạn vừa vào đạo tràng từ một tab hoặc thiết bị khác.',
  network: 'Mất kết nối với đạo tràng. Hãy vào lại.',
};

const ERR_MESSAGES: Record<string, string> = {
  seat_taken: 'Bồ đoàn này đã có người.',
  chat_rate: 'Hãy chậm lại một chút trước khi nói tiếp.',
  chat_bad: 'Lời nói không hợp lệ.',
  bad_msg: 'Thao tác không hợp lệ.',
  vote_bad: 'Thiên Đạo đã hỏi xong rồi, phiếu này không kịp nữa.',
  report_bad: 'Không báo cáo được người này.',
  report_dup: 'Bạn đã báo cáo người này rồi. Thiên Đạo ghi nhớ cả, đừng lo.',
  report_rate: 'Báo cáo dồn dập quá, nghỉ tay một phút rồi báo tiếp nhé.',
  act_bad: 'Chỗ này không dùng được.',
};

/** Codes the server words itself (distance, time left); the fallback covers an empty `msg`. */
const ERR_FALLBACKS: Record<string, string> = {
  chat_banned: 'Bạn đang tạm bị khoá tự gõ chat. Câu có sẵn vẫn dùng được.',
  act_far: 'Lại gần thêm chút nữa.',
  act_cooldown: 'Chỗ này vừa dùng xong, quay lại sau nhé.',
};

export function errMessage(e: ErrMsg): string {
  const own = ERR_FALLBACKS[e.code];
  if (own !== undefined) return e.msg || own;
  return ERR_MESSAGES[e.code] ?? (e.msg || 'Có lỗi xảy ra.');
}

/** Reconnect back-off: 1, 2, 4, 8, 16 s, each ±30%. */
const RETRY_BASE_MS = 1000;
const RETRY_MAX = 5;
const RETRY_JITTER = 0.3;

function resolveWsUrl(wsPath: string): string {
  const configured = process.env.NEXT_PUBLIC_ROOM_WS_URL;
  if (configured) return configured;
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  // The ticket response names the path; fall back to the documented one if it is odd.
  const path = wsPath.startsWith('/') ? wsPath : '/v1/room/ws';
  return `${scheme}//${location.host}${path}`;
}

export class RoomClient {
  readonly players = new Map<PlayerId, PlayerState>();
  room: Room | null = null;
  you: PlayerId | null = null;
  tickMs = 100;
  phrases: Phrase[] = [];
  emotes: EmoteDef[] = [];
  ranks: RankDef[] = [];
  qi = 0;
  qiRate = 0;
  state: ConnectionState = 'idle';
  /** Latest Linh mạch tụ khí frame, or null before the server sent one. */
  gather: GatherMsg | null = null;
  /** The open Thiên Đạo hỏi poll, or null. */
  poll: PollMsg | null = null;

  private ws: WebSocket | null = null;
  private listeners: ListenerSets = {};
  /** Incremented per connect(); callbacks of an older session are ignored. */
  private session = 0;
  private pending: ConnectOptions | null = null;
  /** Name/look of the session that got a `welcome`; non-null while a network drop may be retried. */
  private live: ConnectOptions | null = null;
  /** Reconnect attempts since the last `welcome`. */
  private retries = 0;
  private retryTimer: number | undefined;
  /** Cushion to sit on again once a reconnect is welcomed, or -1. */
  private resitSeat = -1;

  on<K extends keyof RoomClientEvents>(event: K, fn: Listener<K>): () => void {
    let set = this.listeners[event] as Set<Listener<K>> | undefined;
    if (!set) {
      set = new Set();
      (this.listeners as Record<string, unknown>)[event] = set;
    }
    set.add(fn);
    return () => { set.delete(fn); };
  }

  private emit<K extends keyof RoomClientEvents>(event: K, payload: RoomClientEvents[K]): void {
    const set = this.listeners[event] as Set<Listener<K>> | undefined;
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (error) { console.error('RoomClient listener failed', error); }
    }
  }

  private setState(state: ConnectionState): void {
    this.state = state;
    this.emit('state', state);
  }

  private resetWorld(): void {
    this.players.clear();
    this.room = null;
    this.you = null;
    this.qi = 0;
    this.qiRate = 0;
    this.gather = null;
    this.poll = null;
  }

  /** Creates the đạo tịch on first visit, then trades it for a one-shot ticket. A token the
   *  server no longer knows (e.g. wiped database) is replaced once with a fresh disciple. */
  private async fetchTicket(opts: ConnectOptions): Promise<GuestTicketResponse> {
    const profile = { name: opts.name, look: opts.look };
    for (let attempt = 0; ; attempt++) {
      let token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        token = parseDiscipleResponse(await request<unknown>('/room/disciple', { method: 'POST', body: JSON.stringify(profile) }));
        if (!token) throw new Error('bad disciple response');
        localStorage.setItem(TOKEN_KEY, token);
      }
      try {
        const parsed = parseTicketResponse(await request<unknown>('/room/guest', { method: 'POST', body: JSON.stringify({ ...profile, token }) }));
        if (!parsed) throw new Error('bad ticket response');
        return parsed;
      } catch (error) {
        if (attempt === 0 && error instanceof APIError && (error.status === 409 || error.status === 400)) {
          localStorage.removeItem(TOKEN_KEY);
          continue;
        }
        throw error;
      }
    }
  }

  /** User-initiated join: fetches a fresh one-shot ticket, then opens the socket. Safe to call again after `end`. */
  async connect(opts: ConnectOptions): Promise<void> {
    this.stopRetrying();
    this.live = null;
    this.resitSeat = -1;
    this.resetWorld();
    await this.open(opts);
  }

  /** One attempt: ticket + socket. While `live` is set (reconnecting) a network failure schedules the next attempt. */
  private async open(opts: ConnectOptions): Promise<void> {
    this.teardownSocket();
    const session = ++this.session;
    this.pending = opts;
    this.setState('connecting');

    let wsPath = '/v1/room/ws';
    let ticket: string;
    try {
      const parsed = await this.fetchTicket(opts);
      if (session !== this.session) return;
      ticket = parsed.ticket;
      wsPath = parsed.ws_path;
    } catch (error) {
      if (session !== this.session) return;
      if (this.live) { this.retryOrFinish({ kind: 'network', code: null, message: END_MESSAGES.network }); return; }
      const detail = error instanceof Error && error.message && !error.message.startsWith('bad ') ? ` ${error.message}` : '';
      this.finish({ kind: 'ticket_failed', code: null, message: `Không lấy được vé vào đạo tràng.${detail}` });
      return;
    }

    let socket: WebSocket;
    try {
      const url = new URL(resolveWsUrl(wsPath), location.href);
      url.searchParams.set('ticket', ticket);
      socket = new WebSocket(url.toString());
    } catch {
      this.retryOrFinish({ kind: 'network', code: null, message: END_MESSAGES.network });
      return;
    }
    this.ws = socket;

    socket.onmessage = ev => {
      if (session !== this.session || typeof ev.data !== 'string') return;
      let json: unknown;
      try { json = JSON.parse(ev.data); } catch { return; }
      const msg = parseServerMessage(json);
      if (msg) this.handle(msg);
    };
    socket.onerror = () => { /* onclose always follows and carries the outcome */ };
    socket.onclose = ev => {
      if (session !== this.session) return;
      this.ws = null;
      this.retryOrFinish(this.endFromClose(ev.code));
    };
  }

  /** Network drops of a welcomed session back off and retry; everything else (and giving up) ends it. */
  private retryOrFinish(end: RoomEnd): void {
    if (end.kind !== 'network' || !this.live || this.retries >= RETRY_MAX) {
      this.finish(end);
      return;
    }
    if (this.retries === 0) {
      // First drop since the welcome: remember the cushion before the stale world is replaced.
      const me = this.me;
      this.resitSeat = me && me.s === MODE_SIT && me.seat >= 0 ? me.seat : -1;
    }
    const base = RETRY_BASE_MS * 2 ** this.retries;
    const delayMs = Math.round(base * (1 - RETRY_JITTER + Math.random() * 2 * RETRY_JITTER));
    this.retries += 1;
    this.poll = null;
    this.setState('connecting');
    window.clearTimeout(this.retryTimer);
    this.retryTimer = window.setTimeout(this.retryNow, delayMs);
    window.addEventListener('online', this.retryNow);
    this.emit('reconnecting', { attempt: this.retries, delayMs });
  }

  /** Fires the pending attempt now (timer or the browser saying the network is back). */
  private readonly retryNow = (): void => {
    if (this.retryTimer === undefined) return;
    this.stopRetrying();
    if (this.live) void this.open(this.live);
  };

  private stopRetrying(): void {
    window.clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    window.removeEventListener('online', this.retryNow);
  }

  private kickReason: string | null = null;

  private endFromClose(code: number): RoomEnd {
    switch (code) {
      case CLOSE_FULL: return { kind: 'full', code, message: END_MESSAGES.full };
      case CLOSE_BAD_TICKET: return { kind: 'bad_ticket', code, message: END_MESSAGES.bad_ticket };
      case CLOSE_AFK: return { kind: 'afk', code, message: END_MESSAGES.afk };
      case CLOSE_TOO_MANY: return { kind: 'too_many', code, message: END_MESSAGES.too_many };
      case CLOSE_SPAM: return { kind: 'spam', code, message: END_MESSAGES.spam };
      case CLOSE_REPLACED: return { kind: 'replaced', code, message: END_MESSAGES.replaced };
      default:
        if (this.kickReason !== null) {
          return { kind: 'kicked', code, message: this.kickReason ? `Bạn bị mời ra khỏi đạo tràng: ${this.kickReason}` : 'Bạn bị mời ra khỏi đạo tràng.' };
        }
        return { kind: 'network', code, message: END_MESSAGES.network };
    }
  }

  private finish(end: RoomEnd): void {
    if (this.state === 'ended') return;
    this.stopRetrying();
    this.live = null;
    this.retries = 0;
    this.resitSeat = -1;
    this.kickReason = null;
    this.pending = null;
    this.poll = null;
    this.setState('ended');
    this.emit('end', end);
  }

  private handle(msg: ServerMessage): void {
    switch (msg.t) {
      case 'welcome': {
        this.players.clear();
        this.room = msg.room;
        this.you = msg.you;
        this.tickMs = msg.tick_ms;
        this.phrases = msg.phrases;
        this.emotes = msg.emotes;
        this.ranks = msg.ranks;
        this.qi = msg.qi;
        this.qiRate = 0;
        for (const p of msg.players) this.players.set(p.id, p);
        if (!this.players.has(msg.you)) {
          // README does not say whether `players` includes the receiver; make sure we exist locally.
          this.players.set(msg.you, {
            id: msg.you,
            name: this.pending?.name ?? '',
            look: this.pending?.look ?? 0,
            x: msg.room.spawn.x,
            z: msg.room.spawn.z,
            s: 0,
            seat: -1,
            rank: 0,
            patron: 0,
          });
        }
        this.gather = null;
        this.poll = null;
        this.live = this.pending;
        this.retries = 0;
        this.stopRetrying();
        this.setState('open');
        this.emit('welcome', { ...msg, players: Array.from(this.players.values()) });
        if (this.resitSeat >= 0) {
          // Back from a dropped connection: take the same cushion again (the server may refuse).
          this.sit(this.resitSeat);
          this.resitSeat = -1;
        }
        return;
      }
      case 'join':
        this.players.set(msg.p.id, msg.p);
        this.emit('join', msg.p);
        return;
      case 'leave': {
        this.players.delete(msg.id);
        this.emit('leave', msg.id);
        return;
      }
      case 'd':
        for (const dp of msg.p) {
          const cur = this.players.get(dp.id);
          if (cur) {
            cur.x = dp.x;
            cur.z = dp.z;
            cur.s = dp.s;
            cur.seat = dp.seat;
          }
        }
        this.emit('delta', msg);
        return;
      case 'chat': {
        // Defensive clamp: server is untrusted for text length too.
        const text = msg.text.length > 400 ? msg.text.slice(0, 400) : msg.text;
        this.emit('chat', text === msg.text ? msg : { ...msg, text });
        return;
      }
      case 'emote':
        this.emit('emote', msg);
        return;
      case 'qi':
        this.qi = msg.qi;
        this.qiRate = msg.rate;
        this.emit('qi', msg);
        return;
      case 'afk':
        this.emit('afk', msg);
        return;
      case 'err':
        this.emit('err', msg);
        return;
      case 'kick':
        this.kickReason = msg.reason;
        return;
      case 'rank': {
        const p = this.players.get(msg.id);
        if (p) p.rank = msg.rank;
        this.emit('rank', msg);
        return;
      }
      case 'sect':
        this.emit('sect', msg);
        return;
      case 'twist':
        this.emit('twist', msg);
        return;
      case 'offering': {
        const donor = this.players.get(msg.id);
        if (donor) donor.patron = msg.patron;
        this.qi += msg.gift; // the server added the same gift to everyone's tu vi
        this.emit('offering', msg);
        return;
      }
      case 'gather':
        this.gather = msg;
        this.emit('gather', msg);
        return;
      case 'poll':
        this.poll = msg;
        this.emit('poll', msg);
        return;
      case 'poll_end':
        if (this.poll?.id === msg.id) this.poll = null;
        if (msg.effect === 'rain') this.qi += msg.qi; // the server gave the same rain to everyone here
        this.emit('poll_end', msg);
        return;
      case 'report_ok':
        this.emit('report_ok', msg);
        return;
      case 'act':
        // Standing players get no `qi` frames, so keep the total in step here.
        if (msg.id === this.you) this.qi += msg.qi;
        this.qi += msg.room_qi;
        this.emit('act', msg);
        return;
    }
  }

  // ---------- derived helpers ----------

  /** Nearest cushion nobody sits on or walks to, measured from the local player. `exclude` lists cushions the server just refused. */
  nearestFreeSeat(exclude?: ReadonlySet<number>): number | null {
    const room = this.room;
    const me = this.you === null ? undefined : this.players.get(this.you);
    if (!room || !me) return null;
    let best: number | null = null;
    let bestD = Infinity;
    for (const seat of room.seats) {
      let taken = false;
      for (const p of this.players.values()) {
        if (p.seat === seat.i && p.id !== me.id) { taken = true; break; }
      }
      if (taken || exclude?.has(seat.i) || seat.min_rank > me.rank) continue;
      const dx = seat.x - me.x;
      const dz = seat.z - me.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = seat.i; }
    }
    return best;
  }

  get me(): PlayerState | null {
    return this.you === null ? null : this.players.get(this.you) ?? null;
  }

  get online(): number {
    return this.players.size;
  }

  // ---------- client -> server ----------

  private send(msg: ClientMessage): boolean {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }

  move(x: number, z: number): boolean { return this.send({ t: 'move', x, z }); }
  sit(seat: number): boolean { return this.send({ t: 'sit', seat }); }
  stand(): boolean { return this.send({ t: 'stand' }); }
  emote(e: Id): boolean { return this.send({ t: 'emote', e }); }
  here(): boolean { return this.send({ t: 'here' }); }
  chatPreset(ph: Id): boolean { return this.send({ t: 'chat', ph }); }
  chatText(text: string): boolean {
    const clean = text.trim().slice(0, CHAT_MAX_LEN);
    return clean !== '' && this.send({ t: 'chat', text: clean });
  }

  /** Thiên Đạo hỏi: votes (or moves the vote to) option `o` of poll `poll`. */
  vote(poll: number, o: number): boolean { return this.send({ t: 'vote', poll, o }); }
  report(id: PlayerId, reason: ReportReason): boolean { return this.send({ t: 'report', id, reason }); }
  /** Uses an interactive spot (thắp hương, gõ chuông…); the server checks reach and cooldowns. */
  act(spot: string): boolean { return this.send({ t: 'act', spot }); }

  // ---------- lifecycle ----------

  private teardownSocket(): void {
    const ws = this.ws;
    this.ws = null;
    if (!ws) return;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    try { ws.close(1000); } catch { /* already closed */ }
  }

  /** User-initiated leave: closes the socket without raising `end` and never reconnects. */
  disconnect(): void {
    this.session += 1;
    this.stopRetrying();
    this.live = null;
    this.retries = 0;
    this.resitSeat = -1;
    this.teardownSocket();
    this.pending = null;
    this.kickReason = null;
    this.resetWorld();
    this.state = 'idle';
  }

  // ---------- cúng dường (HTTP; the đạo tịch proves who is paying) ----------

  /** Opens (or re-opens) a bank-transfer order. `requestId` makes retries idempotent. */
  async createOffering(offering: string, requestId: string): Promise<OfferingOrder> {
    const order = parseOfferingOrder(await request<unknown>('/room/offerings', {
      method: 'POST', body: JSON.stringify({ token: storedToken(), offering, request_id: requestId }),
    }));
    if (!order) throw new Error('Phản hồi đơn mời không hợp lệ.');
    return order;
  }

  async offeringStatus(id: string): Promise<OfferingOrder> {
    const order = parseOfferingOrder(await request<unknown>('/room/offerings/status', {
      method: 'POST', body: JSON.stringify({ token: storedToken(), id }),
    }));
    if (!order) throw new Error('Phản hồi đơn mời không hợp lệ.');
    return order;
  }

  async recentOfferings(): Promise<RecentOffering[]> {
    return parseRecentOfferings(await request<unknown>('/room/offerings/recent'));
  }

  destroy(): void {
    this.disconnect();
    this.listeners = {};
  }
}
