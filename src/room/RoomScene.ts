import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CharacterAssets, CharacterRig, CUSHION_H } from './characters';
import { ParticleField } from './particles';
import { MODE_SIT, MODE_WALK, type DeltaPlayer, type PlayerId, type PlayerMode, type PlayerState, type Room, type SpotDef, type TwistAnim } from './protocol';
import { SECT_MIST, SectWorld, type SectProp } from './sect';
import { Batch, placeAt } from './sectGeo';
import { makeRadialTexture, makeRingTexture } from './textures';

export interface RoomSceneHandlers {
  onMove(x: number, z: number): void;
  onSit(seat: number): void;
}

const FOV = 30;
/** Camera pitch when fully zoomed in (shows the hall and the peaks) and fully zoomed out (overview). */
const PITCH_NEAR = (26 * Math.PI) / 180;
const PITCH_FAR = (47 * Math.PI) / 180;
const ZOOM_MIN = 9;
const ZOOM_MAX = 44;
const BUBBLE_MS = 5000;
const BUBBLE_FADE_MS = 500;
const EMOTE_MS = 2000;
const PROMOTED_MS = 4000;
const TWIST_BUBBLE_MS = 7000;
const SNAP_DIST = 8;
const FAR_ZOOM = 30;
const FOCUS_Y = 0.7;

/** Rendered positions ease toward the interpolated server position at this rate (1/s): hides tick jitter and hard stops. */
const ACTOR_SMOOTH = 16;
/** Graphics tiers, best first: [max device pixel ratio, bloom]. The scene steps down when frames run long. */
const GFX_TIERS: ReadonlyArray<readonly [number, boolean]> = [[2, true], [1.5, true], [1.25, false], [1, false]];
const GFX_KEY = 'dt:gfx';
/** Average frame time (ms) over a sample window above which the scene drops one tier. */
const GFX_SLOW_MS = 24;
const GFX_WINDOW = 90;
const BLOOM_STRENGTH = 0.42;
const BLOOM_RADIUS = 0.7;
const BLOOM_THRESHOLD = 0.9;
/** With bloom on, emissive parts (lantern paper, fire) are pushed past white so they are what blooms. */
const GLOW_BOOST = 1.9;

const COL_BG = SECT_MIST;
const COL_JADE = 0x5fd9b0;
const COL_GOLD = 0xf2d27a;

/** Badge text: "Ngoại môn đệ tử" → "Ngoại môn"; elders keep their full title. */
function shortRankName(name: string): string {
  return name.replace(/\s*đệ tử$/u, '');
}
interface Tag {
  el: HTMLDivElement;
  nameEl: HTMLDivElement;
  rankEl: HTMLSpanElement;
  patronEl: HTMLSpanElement;
  promotedUntil: number;
  bubbleEl: HTMLDivElement;
  emoteEl: HTMLDivElement;
  bubbleUntil: number;
  emoteUntil: number;
  bubbleOn: boolean;
  fading: boolean;
  hidden: boolean;
  px: number;
  py: number;
  z: number;
}

interface Actor {
  id: PlayerId;
  isLocal: boolean;
  rig: CharacterRig;
  tag: Tag;
  x: number;
  z: number;
  /** Interpolated server position the rendered x/z eases toward. */
  aimX: number;
  aimZ: number;
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  t0: number;
  s: PlayerMode;
  seat: number;
  heading: number;
  speed: number;
}

interface SeatVisual {
  index: number;
  /** linh mạch cushion reserved for higher ranks */
  inner: boolean;
  x: number;
  z: number;
  /** instance slot in the seat ring / glow meshes */
  slot: number;
  level: number;
  /** 0 free, 1 someone walking to it, 2 someone seated */
  state: 0 | 1 | 2;
}

/** Floating "{emoji} {label}" over an interactive prop; tapping it (or the prop) asks to use the spot. */
interface SpotLabel {
  spot: SpotDef;
  prop: SectProp | null;
  el: HTMLDivElement;
  x: number;
  y: number;
  z: number;
  shown: boolean;
  /** local player is within reach of the stand point */
  near: boolean;
  px: number;
  py: number;
}

interface Disposable { dispose(): void }

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function wrapPi(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

export class RoomScene {
  private readonly renderer: THREE.WebGLRenderer;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private tier = 0;
  private slowMs = 0;
  private slowFrames = 0;
  /** Frames to skip before sampling frame time (start-up and tier changes compile shaders). */
  private settle = 120;
  private prevFrameMs = 0;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 300);
  private readonly fog = new THREE.Fog(COL_BG, 20, 80);
  private readonly canvas: HTMLCanvasElement;
  private readonly tagsLayer: HTMLDivElement;
  private readonly disposables: Disposable[] = [];
  private readonly assets: CharacterAssets;

  private readonly actors = new Map<PlayerId, Actor>();
  private readonly actorList: Actor[] = [];
  private local: Actor | null = null;
  /** Connection id of the weekly Chưởng môn in this room, or 0. */
  private masterId: PlayerId = 0;
  /** Floating label over the rank-gated linh mạch ring. */
  private zone: { el: HTMLDivElement; x: number; z: number; minRank: number; bonus: number } | null = null;
  /** Badge emoji per cúng dường patron tier (index = tier), from the welcome catalogue. */
  private patronBadges: readonly string[] = [];
  private readonly seatVisuals: SeatVisual[] = [];
  private seatRings: THREE.InstancedMesh | null = null;
  private seatGlows: THREE.InstancedMesh | null = null;
  private readonly seatBySeatIndex = new Map<number, SeatVisual>();
  private readonly seatHits: THREE.Mesh[] = [];
  private readonly seatHitIndex = new Map<THREE.Object3D, number>();
  private readonly seatFacing = new Map<number, number>();
  private seatsDirty = true;

  /** Sect environment and interactive props (owns lights, ambience and spot effects). */
  private readonly sect: SectWorld;
  private readonly spotLabels: SpotLabel[] = [];
  private spotTap: ((spotId: string) => void) | null = null;
  private readonly tmpHead = new THREE.Vector3();
  private readonly tmpFocus = new THREE.Vector3();
  private qi: ParticleField | null = null;
  private motes: ParticleField;
  private readonly marker = new THREE.Group();
  private readonly markerRing: THREE.Mesh;
  private markerOn = false;
  private markerX = 0;
  private markerZ = 0;
  private markerAt = 0;
  private markerSeenWalking = false;

  // camera rig
  private yaw = 0;
  private yawTarget = 0;
  /** Drag speed in rad/s, for the little glide after the finger lifts. */
  private yawVel = 0;
  private lastDragAt = 0;
  private zoom: number;
  private zoomTarget: number;
  private focusX: number;
  private focusZ: number;

  private width = 1;
  private height = 1;
  private raf = 0;
  private lastMs = 0;
  private destroyed = false;
  private tickMs: number;

  // input
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private downX = 0;
  private downY = 0;
  private downAt = 0;
  private dragged = false;
  private pinchStartDist = 0;
  private pinchStartZoom = 0;
  private hoverSeat = -1;
  private lastHoverAt = 0;
  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly tmpV = new THREE.Vector3();
  private readonly resizeObserver: ResizeObserver;

  private readonly tmpColor = new THREE.Color();
  private readonly tmpM = new THREE.Matrix4();
  private readonly colJade = new THREE.Color(COL_JADE);
  private readonly colGold = new THREE.Color(COL_GOLD);

  constructor(
    private readonly container: HTMLElement,
    private readonly room: Room,
    private readonly you: PlayerId,
    tickMs: number,
    /** Rank names indexed by rank id, from the welcome message. */
    private readonly rankNames: readonly string[],
    private readonly handlers: RoomSceneHandlers,
  ) {
    this.tickMs = tickMs;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    const savedTier = Number(sessionStorage.getItem(GFX_KEY));
    if (Number.isInteger(savedTier) && savedTier > 0 && savedTier < GFX_TIERS.length) this.tier = savedTier;
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setClearColor(COL_BG);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'dt-canvas';
    container.appendChild(this.canvas);
    this.tagsLayer = document.createElement('div');
    this.tagsLayer.className = 'dt-tags';
    container.appendChild(this.tagsLayer);

    this.scene.background = new THREE.Color(COL_BG);
    this.scene.fog = this.fog;

    const aspectGuess = Math.max(0.4, container.clientWidth / Math.max(1, container.clientHeight));
    this.zoom = this.zoomTarget = clamp(20 * (aspectGuess < 1 ? 1.2 : 1), ZOOM_MIN, ZOOM_MAX);
    this.focusX = room.spawn.x;
    this.focusZ = room.spawn.z;

    const shadowTex = this.track(makeRadialTexture([[0, 'rgba(0,0,0,0.9)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]));
    this.assets = new CharacterAssets(shadowTex);
    this.disposables.push(this.assets);

    this.sect = new SectWorld({ track: o => this.track(o), maxAnisotropy: this.renderer.capabilities.getMaxAnisotropy() }, room);
    this.scene.add(this.sect.root);
    this.buildSeats();
    this.buildSpotLabels();
    this.motes = this.buildMotes();
    this.markerRing = this.buildMarker();
    this.computeSeatFacing();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.applyTier();

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  // ------------------------------------------------------------------ public API

  start(): void {
    if (this.destroyed || this.raf !== 0 || document.hidden) return;
    // Compile every material now (one-shot effects included) so the first bell or explosion does not hitch.
    this.updateCamera(0);
    this.renderer.compile(this.scene, this.camera);
    this.lastMs = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  setTickMs(ms: number): void {
    if (ms > 0) this.tickMs = ms;
  }

  addPlayer(p: PlayerState): void {
    if (this.destroyed) return;
    const existing = this.actors.get(p.id);
    if (existing) {
      this.removeActor(existing);
    }
    const isLocal = p.id === this.you;
    const rig = new CharacterRig(this.assets, p.look, p.rank, isLocal, hashId(p.id));
    rig.setPatron(p.patron);
    const tag = this.createTag(p.name, p.rank, isLocal);
    this.paintPatron(tag.patronEl, p.patron);
    const now = performance.now();
    const actor: Actor = {
      id: p.id, isLocal, rig, tag,
      x: p.x, z: p.z, aimX: p.x, aimZ: p.z, fromX: p.x, fromZ: p.z, toX: p.x, toZ: p.z, t0: now,
      s: p.s, seat: p.seat, heading: this.initialHeading(p), speed: 0,
    };
    rig.root.position.set(p.x, 0, p.z);
    rig.root.rotation.y = actor.heading;
    this.scene.add(rig.root);
    this.actors.set(p.id, actor);
    this.actorList.push(actor);
    if (isLocal) {
      this.local = actor;
      this.focusX = p.x;
      this.focusZ = p.z;
    }
    if (p.id === this.masterId) this.paintMaster(actor, true);
    this.seatsDirty = true;
  }

  removePlayer(id: PlayerId): void {
    const actor = this.actors.get(id);
    if (actor) this.removeActor(actor);
  }

  setPatronBadges(badges: readonly string[]): void {
    this.patronBadges = badges;
  }

  /** A paid offering: the donor gets the tier's badge and, from tier 2, a cloud to ride. */
  setPatron(id: PlayerId, tier: number): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.rig.setPatron(tier);
    this.paintPatron(a.tag.patronEl, tier);
  }

  private paintPatron(el: HTMLSpanElement, tier: number): void {
    const badge = tier > 0 ? this.patronBadges[tier] ?? '' : '';
    el.textContent = badge;
    el.title = badge ? 'Đã mời Thiên Đạo ăn' : '';
    el.hidden = badge === '';
  }

  /** Crowns the weekly Chưởng môn (0 = not in this room) and uncrowns the previous one. */
  setMaster(id: PlayerId): void {
    if (id === this.masterId) return;
    const prev = this.actors.get(this.masterId);
    if (prev) this.paintMaster(prev, false);
    this.masterId = id;
    const next = this.actors.get(id);
    if (next) this.paintMaster(next, true);
  }

  private paintMaster(a: Actor, on: boolean): void {
    a.rig.setMaster(on);
    a.tag.el.classList.toggle('dt-tag--master', on);
  }

  /** Plays a Thiên Cơ surprise: body animation plus a long golden caption above the head. */
  playTwist(id: PlayerId, anim: TwistAnim, text: string): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.rig.playTwist(anim);
    this.showChat(id, text, TWIST_BUBBLE_MS);
    a.tag.bubbleEl.classList.add('dt-bubble--twist');
  }

  /** Plays a body animation only (Thiên Đạo hỏi effects); the caption is shown elsewhere. */
  playAnim(id: PlayerId, anim: TwistAnim): void {
    this.actors.get(id)?.rig.playTwist(anim);
  }

  /** While set, tapping a prop or its floating label calls `cb(spotId)` instead of moving there. */
  setSpotTapHandler(cb: ((spotId: string) => void) | null): void {
    this.spotTap = cb;
  }

  /** Plays a spot outcome (smoke|glow|ring|boom|pill|ripple|dragon) on its prop; a pill flies to `actorId`. */
  playSpotFx(spotId: string, fx: string, actorId: PlayerId): void {
    const l = this.spotLabels.find(q => q.spot.id === spotId);
    if (this.destroyed || !l || !l.prop) return;
    const a = this.actors.get(actorId);
    this.sect.playFx(l.prop, fx, l.spot, a ? this.tmpHead.set(a.x, a.rig.anchorY - 0.35, a.z) : null);
  }

  /** Updates the linh mạch label for the local player's rank (locked vs. open). */
  setLocalRank(rank: number): void {
    const zone = this.zone;
    if (!zone) return;
    const locked = rank < zone.minRank;
    zone.el.classList.toggle('is-locked', locked);
    zone.el.textContent = locked
      ? `🔒 Linh mạch · từ ${shortRankName(this.rankNames[zone.minRank] ?? '')}`
      : `✨ Linh mạch · tu vi ×${zone.bonus.toLocaleString('vi-VN')}`;
  }

  /** Applies a promotion: new ornaments, new badge, and a short golden glow on the tag. */
  setRank(id: PlayerId, rank: number): void {
    const a = this.actors.get(id);
    if (!a) return;
    a.rig.setRank(rank);
    this.sect.celebrate(a.x, a.rig.anchorY - 0.6, a.z);
    this.paintRank(a.tag.rankEl, rank);
    a.tag.el.classList.add('dt-tag--promoted');
    a.tag.promotedUntil = performance.now() + PROMOTED_MS;
  }

  private paintRank(el: HTMLSpanElement, rank: number): void {
    el.className = `dt-rank dt-rank--${Math.min(rank, 5)}`;
    el.textContent = shortRankName(this.rankNames[rank] ?? '');
  }

  applyDelta(list: readonly DeltaPlayer[]): void {
    if (this.destroyed) return;
    const now = performance.now();
    for (const u of list) {
      const a = this.actors.get(u.id);
      if (!a) continue;
      const jump = Math.hypot(u.x - a.toX, u.z - a.toZ);
      if (jump > SNAP_DIST) {
        a.x = a.aimX = u.x;
        a.z = a.aimZ = u.z;
      }
      a.fromX = a.aimX;
      a.fromZ = a.aimZ;
      a.toX = u.x;
      a.toZ = u.z;
      a.t0 = now;
      if (a.s !== u.s || a.seat !== u.seat) this.seatsDirty = true;
      if (a.s !== u.s && u.s === MODE_SIT) {
        const seat = this.seatBySeatIndex.get(u.seat);
        this.sect.settle(seat ? seat.x : u.x, seat ? seat.z : u.z, seat?.inner === true);
      }
      a.s = u.s;
      a.seat = u.seat;
    }
  }

  showChat(id: PlayerId, text: string, durationMs = BUBBLE_MS): void {
    const a = this.actors.get(id);
    if (!a) return;
    const tag = a.tag;
    tag.bubbleEl.classList.remove('dt-bubble--twist');
    tag.bubbleEl.textContent = text.length > 200 ? `${text.slice(0, 200)}…` : text;
    tag.bubbleUntil = performance.now() + durationMs;
    tag.bubbleOn = true;
    if (tag.fading) {
      tag.fading = false;
      tag.bubbleEl.classList.remove('is-fading');
    }
    tag.bubbleEl.classList.add('is-on');
  }

  showEmote(id: PlayerId, glyph: string): void {
    const a = this.actors.get(id);
    if (!a) return;
    const el = a.tag.emoteEl;
    el.classList.remove('is-on');
    el.textContent = glyph;
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('is-on');
    a.tag.emoteUntil = performance.now() + EMOTE_MS;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.actors.clear();
    this.actorList.length = 0;
    this.local = null;
    this.tagsLayer.remove();
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.qi?.dispose();
    this.motes.dispose();
    this.scene.clear();
    this.disposeComposer();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }

  // ------------------------------------------------------------------ construction helpers

  private track<T extends Disposable>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  private lambert(color: number, extra?: THREE.MeshLambertMaterialParameters): THREE.MeshLambertMaterial {
    return this.track(new THREE.MeshLambertMaterial({ color, ...extra }));
  }

  private geo<T extends THREE.BufferGeometry>(g: T): T {
    return this.track(g);
  }

  private buildSpotLabels(): void {
    for (const spot of this.room.spots) {
      const prop = this.sect.propFor(spot.prop, spot.x, spot.z);
      const el = document.createElement('div');
      el.className = 'dt-spot';
      const inner = document.createElement('span');
      inner.className = 'dt-spot-in';
      inner.textContent = `${spot.emoji} ${spot.label}`;
      el.appendChild(inner);
      el.style.visibility = 'hidden';
      this.tagsLayer.appendChild(el);
      this.spotLabels.push({
        spot, prop, el,
        x: prop ? prop.x : spot.x,
        y: prop ? prop.top + 0.35 : 1.6,
        z: prop ? prop.z : spot.z,
        shown: false, near: false, px: -9999, py: -9999,
      });
    }
  }

  private buildSeats(): void {
    const seats = this.room.seats;
    const n = seats.length;
    if (n === 0) return;
    // Every cushion goes into one merged vertex-coloured mesh; rings and glows are one instanced mesh each.
    // Linh mạch cushions (rank-gated): jade silk on a gold base, ringed in gold.
    const cushions = new Batch();
    for (const seat of seats) {
      const inner = seat.min_rank > 0;
      cushions.within(placeAt(seat.x, 0, seat.z), () => {
        cushions.add(new THREE.CylinderGeometry(0.4, 0.45, CUSHION_H, 20).translate(0, CUSHION_H / 2, 0), inner ? 0xe3bd5a : 0xc7993a);
        cushions.add(new THREE.CylinderGeometry(0.32, 0.36, 0.03, 20).translate(0, CUSHION_H + 0.005, 0), inner ? 0x2f8f78 : 0xa5472f);
        cushions.add(new THREE.TorusGeometry(0.42, 0.05, 6, 22).rotateX(Math.PI / 2).translate(0, CUSHION_H * 0.55, 0), 0xe3bd5a);
        cushions.add(new THREE.SphereGeometry(0.05, 6, 4).translate(0, CUSHION_H + 0.02, 0), 0xe3bd5a);
      });
    }
    const cushionGeo = cushions.build();
    if (cushionGeo) {
      const mesh = new THREE.Mesh(this.geo(cushionGeo), this.lambert(0xffffff, { vertexColors: true, emissive: 0x1c1406 }));
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
    }
    const hitGeo = this.geo(new THREE.CylinderGeometry(0.75, 0.75, 0.7, 12).translate(0, 0.3, 0));
    const hitMat = this.track(new THREE.MeshBasicMaterial({ visible: false }));
    const glowTex = this.track(makeRadialTexture([[0, 'rgba(255,255,255,0.95)'], [0.45, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));
    // Additive blending: an instance colour scaled by its opacity looks exactly like that opacity.
    // A soft-edged ring texture on a disc: no stair-stepped rim, and it blooms evenly.
    const ringTex = this.track(makeRingTexture(0.74, 0.9, 0.07));
    const rings = this.track(new THREE.InstancedMesh(this.geo(new THREE.CircleGeometry(0.86, 32).rotateX(-Math.PI / 2)),
      this.track(new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), n));
    const glows = this.track(new THREE.InstancedMesh(this.geo(new THREE.CircleGeometry(1.35, 32).rotateX(-Math.PI / 2)),
      this.track(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })), n));
    rings.renderOrder = 2;
    glows.renderOrder = 1;
    seats.forEach((seat, slot) => {
      glows.setMatrixAt(slot, this.tmpM.makeTranslation(seat.x, 0.02, seat.z));
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.position.set(seat.x, 0, seat.z);
      hit.matrixAutoUpdate = false;
      hit.updateMatrix();
      this.scene.add(hit);
      const visual: SeatVisual = { index: seat.i, slot, inner: seat.min_rank > 0, x: seat.x, z: seat.z, level: 0, state: 0 };
      this.seatVisuals.push(visual);
      this.seatBySeatIndex.set(seat.i, visual);
      this.seatHits.push(hit);
      this.seatHitIndex.set(hit, seat.i);
    });
    for (const im of [rings, glows]) {
      im.frustumCulled = false;
      this.scene.add(im);
    }
    this.seatRings = rings;
    this.seatGlows = glows;

    // One floating label over the rank-gated ring explains why those cushions differ.
    const inner = seats.filter(s => s.min_rank > 0);
    if (inner.length > 0) {
      const el = document.createElement('div');
      el.className = 'dt-zone';
      this.tagsLayer.appendChild(el);
      this.zone = {
        el,
        x: inner.reduce((sum, s) => sum + s.x, 0) / inner.length,
        z: inner.reduce((sum, s) => sum + s.z, 0) / inner.length,
        minRank: Math.min(...inner.map(s => s.min_rank)),
        bonus: Math.max(...inner.map(s => s.bonus)),
      };
      this.setLocalRank(0);
    }

    if (seats.length > 0) {
      const qiTex = this.track(makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]));
      const field = new ParticleField('qi', seats.length, 12, qiTex, 0x9ff2d0, true);
      seats.forEach((s, i) => {
        field.origins[i * 3] = s.x;
        field.origins[i * 3 + 1] = CUSHION_H;
        field.origins[i * 3 + 2] = s.z;
      });
      this.qi = field;
      this.scene.add(field.points);
    }
    this.updateSeats(0, 0);
  }

  private buildMotes(): ParticleField {
    const tex = this.track(makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]));
    const field = new ParticleField('mote', 1, 36, tex, 0xffe9a8, true, { w: this.room.w, d: this.room.d });
    field.intensity[0] = 1;
    this.scene.add(field.points);
    return field;
  }

  private buildMarker(): THREE.Mesh {
    const mat = this.track(new THREE.MeshBasicMaterial({ color: COL_GOLD, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const ring = new THREE.Mesh(this.geo(new THREE.RingGeometry(0.3, 0.38, 32).rotateX(-Math.PI / 2)), mat);
    const dot = new THREE.Mesh(this.geo(new THREE.CircleGeometry(0.07, 12).rotateX(-Math.PI / 2)), mat);
    ring.renderOrder = 3;
    dot.renderOrder = 3;
    this.marker.add(ring, dot);
    this.marker.position.y = 0.05;
    this.marker.visible = false;
    this.scene.add(this.marker);
    return ring;
  }

  /** Seated disciples face the heart of the bát quái circle (the centre of the seat rings). */
  private computeSeatFacing(): void {
    const seats = this.room.seats;
    if (seats.length === 0) return;
    const tx = seats.reduce((s, q) => s + q.x, 0) / seats.length;
    const tz = seats.reduce((s, q) => s + q.z, 0) / seats.length;
    for (const s of seats) {
      const dx = tx - s.x;
      const dz = tz - s.z;
      this.seatFacing.set(s.i, dx * dx + dz * dz < 0.01 ? 0 : Math.atan2(dx, dz));
    }
  }

  private initialHeading(p: PlayerState): number {
    return p.seat >= 0 ? this.seatFacing.get(p.seat) ?? 0 : 0;
  }

  // ------------------------------------------------------------------ DOM tags

  private createTag(name: string, rank: number, isLocal: boolean): Tag {
    const el = document.createElement('div');
    el.className = 'dt-tag';
    const inner = document.createElement('div');
    inner.className = 'dt-tag-inner';
    const emoteEl = document.createElement('div');
    emoteEl.className = 'dt-emote';
    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'dt-bubble';
    const nameEl = document.createElement('div');
    nameEl.className = isLocal ? 'dt-name dt-name--you' : 'dt-name';
    const rankEl = document.createElement('span');
    this.paintRank(rankEl, rank);
    const patronEl = document.createElement('span');
    patronEl.className = 'dt-patron';
    patronEl.hidden = true;
    const textEl = document.createElement('span');
    textEl.textContent = name;
    nameEl.append(rankEl, patronEl, textEl);
    inner.append(emoteEl, bubbleEl, nameEl);
    el.appendChild(inner);
    el.style.visibility = 'hidden';
    this.tagsLayer.appendChild(el);
    return { el, nameEl, rankEl, patronEl, promotedUntil: 0, bubbleEl, emoteEl, bubbleUntil: 0, emoteUntil: 0, bubbleOn: false, fading: false, hidden: true, px: -9999, py: -9999, z: 0 };
  }

  private removeActor(a: Actor): void {
    this.scene.remove(a.rig.root);
    a.tag.el.remove();
    this.actors.delete(a.id);
    const i = this.actorList.indexOf(a);
    if (i >= 0) {
      const last = this.actorList.pop() as Actor;
      if (last !== a) this.actorList[i] = last;
    }
    if (this.local === a) this.local = null;
    this.seatsDirty = true;
  }

  private updateTags(now: number): void {
    const { width, height, tmpV, camera } = this;
    // Snap to device pixels, not CSS pixels: on a 2x-3x phone tags then glide instead of stepping.
    const snap = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));
    const far = this.zoom > FAR_ZOOM;
    this.tagsLayer.classList.toggle('dt-tags--far', far);
    const zone = this.zone;
    if (zone) {
      tmpV.set(zone.x, 0.25, zone.z).project(camera);
      const on = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
      zone.el.style.visibility = on ? 'visible' : 'hidden';
      if (on) zone.el.style.transform = `translate3d(${Math.round((tmpV.x * 0.5 + 0.5) * width)}px,${Math.round((-tmpV.y * 0.5 + 0.5) * height)}px,0)`;
    }
    const me = this.local;
    for (const l of this.spotLabels) {
      tmpV.set(l.x, l.y, l.z).project(camera);
      const sx = Math.round((tmpV.x * 0.5 + 0.5) * width * snap) / snap;
      const sy = Math.round((-tmpV.y * 0.5 + 0.5) * height * snap) / snap;
      const on = tmpV.z < 1 && sx > -80 && sx < width + 80 && sy > -40 && sy < height + 80;
      if (on !== l.shown) {
        l.shown = on;
        l.el.style.visibility = on ? 'visible' : 'hidden';
      }
      if (on && (sx !== l.px || sy !== l.py)) {
        l.px = sx;
        l.py = sy;
        l.el.style.transform = `translate3d(${sx}px,${sy}px,0)`;
      }
      const near = me !== null && Math.hypot(me.x - l.spot.x, me.z - l.spot.z) <= l.spot.reach;
      if (near !== l.near) {
        l.near = near;
        l.el.classList.toggle('is-near', near);
      }
    }
    for (const a of this.actorList) {
      const tag = a.tag;
      tmpV.set(a.x, a.rig.anchorY, a.z).project(camera);
      const sx = Math.round((tmpV.x * 0.5 + 0.5) * width * snap) / snap;
      const sy = Math.round((-tmpV.y * 0.5 + 0.5) * height * snap) / snap;
      const visible = tmpV.z < 1 && sx > -120 && sx < width + 120 && sy > -120 && sy < height + 120;
      if (!visible) {
        if (!tag.hidden) {
          tag.hidden = true;
          tag.el.style.visibility = 'hidden';
        }
        continue;
      }
      if (tag.hidden) {
        tag.hidden = false;
        tag.el.style.visibility = 'visible';
        tag.px = -9999;
      }
      if (sx !== tag.px || sy !== tag.py) {
        tag.px = sx;
        tag.py = sy;
        tag.el.style.transform = `translate3d(${sx}px,${sy}px,0)`;
      }
      const z = Math.round(sy) + (tag.bubbleOn ? 5000 : 0) + (a.isLocal ? 2000 : 0);
      if (z !== tag.z) {
        tag.z = z;
        tag.el.style.zIndex = String(z);
      }
    }
    for (const a of this.actorList) {
      const tag = a.tag;
      if (tag.bubbleOn) {
        if (now >= tag.bubbleUntil) {
          tag.bubbleOn = false;
          tag.fading = false;
          tag.bubbleEl.classList.remove('is-on', 'is-fading');
        } else if (!tag.fading && now >= tag.bubbleUntil - BUBBLE_FADE_MS) {
          tag.fading = true;
          tag.bubbleEl.classList.add('is-fading');
        }
      }
      if (tag.emoteUntil !== 0 && now >= tag.emoteUntil) {
        tag.emoteUntil = 0;
        tag.emoteEl.classList.remove('is-on');
      }
      if (tag.promotedUntil !== 0 && now >= tag.promotedUntil) {
        tag.promotedUntil = 0;
        tag.el.classList.remove('dt-tag--promoted');
      }
    }
  }

  // ------------------------------------------------------------------ frame loop

  private readonly frame = (nowMs: number): void => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, Math.max(0, (nowMs - this.lastMs) / 1000));
    this.lastMs = nowMs;
    const time = nowMs / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.6);

    this.updateActors(dt, time, nowMs);
    this.updateSeats(dt, pulse);
    this.updateAmbient(time, pulse);
    this.updateMarker(time, nowMs);
    this.updateCamera(dt);
    this.camera.updateMatrixWorld();
    const me = this.local;
    this.sect.update(time, dt, this.camera, me ? this.tmpFocus.set(me.x, me.rig.anchorY - 0.6, me.z) : null);
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
    this.updateTags(nowMs);
    this.watchFrameTime(this.prevFrameMs > 0 ? nowMs - this.prevFrameMs : 0);
    this.prevFrameMs = nowMs;
  };

  // ------------------------------------------------------------------ graphics quality

  private pixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, (GFX_TIERS[this.tier] ?? [1, false])[0]);
  }

  /** Builds or drops the bloom chain for the current tier, then resizes everything to match. */
  private applyTier(): void {
    const bloom = (GFX_TIERS[this.tier] ?? [1, false])[1];
    if (!this.composer) {
      // Every tier renders through the same linear chain so glows blend identically; low tiers only skip the bloom pass.
      // Half-float keeps lanterns and qi brighter than white so only they bloom; MSAA keeps edges clean.
      const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
      const composer = new EffectComposer(this.renderer, target);
      composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
      composer.addPass(this.bloomPass);
      composer.addPass(new OutputPass());
      this.composer = composer;
    }
    if (this.bloomPass) this.bloomPass.enabled = bloom;
    this.sect.setGlowBoost(bloom ? GLOW_BOOST : 1);
    this.settle = 120;
    this.slowMs = 0;
    this.slowFrames = 0;
    this.resize();
  }

  private disposeComposer(): void {
    const c = this.composer;
    if (!c) return;
    for (const pass of c.passes) pass.dispose();
    c.renderTarget1.dispose();
    c.renderTarget2.dispose();
    this.composer = null;
    this.bloomPass = null;
  }

  /** Steps down one graphics tier when a whole window of frames ran slow (never back up: no flip-flopping). */
  private watchFrameTime(ms: number): void {
    if (this.tier >= GFX_TIERS.length - 1) return;
    if (this.settle > 0) { this.settle--; return; }
    if (ms <= 0 || ms > 250) return; // tab switches and breakpoints are not a slow GPU
    this.slowMs += ms;
    if (++this.slowFrames < GFX_WINDOW) return;
    const avg = this.slowMs / this.slowFrames;
    this.slowMs = 0;
    this.slowFrames = 0;
    if (avg <= GFX_SLOW_MS) return;
    this.tier++;
    try { sessionStorage.setItem(GFX_KEY, String(this.tier)); } catch { /* private mode */ }
    this.applyTier();
  }

  private updateActors(dt: number, time: number, now: number): void {
    const dur = this.tickMs * 1.25;
    const invDt = dt > 0 ? 1 / dt : 0;
    const ease = 1 - Math.exp(-dt * ACTOR_SMOOTH);
    for (const a of this.actorList) {
      const k = clamp01((now - a.t0) / dur);
      a.aimX = a.fromX + (a.toX - a.fromX) * k;
      a.aimZ = a.fromZ + (a.toZ - a.fromZ) * k;
      const nx = a.x + (a.aimX - a.x) * ease;
      const nz = a.z + (a.aimZ - a.z) * ease;
      const dx = nx - a.x;
      const dz = nz - a.z;
      a.x = nx;
      a.z = nz;
      const inst = Math.sqrt(dx * dx + dz * dz) * invDt;
      a.speed += (inst - a.speed) * clamp01(dt * 10);

      const sitting = a.s === MODE_SIT;
      let target = a.heading;
      if (inst > 0.2 && !sitting) target = Math.atan2(dx, dz);
      else if (sitting && a.seat >= 0) target = this.seatFacing.get(a.seat) ?? a.heading;
      a.heading += wrapPi(target - a.heading) * clamp01(dt * 9);

      const rig = a.rig;
      rig.update(dt, time, a.speed > 0.35, a.speed, sitting);
      rig.root.position.x = a.x;
      rig.root.position.z = a.z;
      rig.root.rotation.y = a.heading + rig.twistYaw;
    }
  }

  private updateSeats(dt: number, pulse: number): void {
    if (this.seatsDirty) {
      this.seatsDirty = false;
      for (const v of this.seatVisuals) v.state = 0;
      for (const a of this.actorList) {
        if (a.seat < 0) continue;
        const v = this.seatBySeatIndex.get(a.seat);
        if (!v) continue;
        if (a.s === MODE_SIT) v.state = 2;
        else if (v.state === 0) v.state = 1;
      }
    }
    const rings = this.seatRings;
    const glows = this.seatGlows;
    if (!rings || !glows) return;
    const k = clamp01(dt * 3);
    const qi = this.qi;
    const c = this.tmpColor;
    for (let i = 0; i < this.seatVisuals.length; i++) {
      const v = this.seatVisuals[i] as SeatVisual;
      const target = v.state === 2 ? 1 : v.state === 1 ? 0.4 : 0;
      v.level += (target - v.level) * k;
      const hover = v.index === this.hoverSeat ? 1 : 0;
      const l = v.level;
      const ringOpacity = Math.min(1, 0.004 + hover * 0.25 + l * (0.24 + 0.12 * pulse));
      rings.setColorAt(v.slot, c.copy(v.inner ? this.colGold : this.colJade).lerp(this.colGold, l * 0.7).multiplyScalar(ringOpacity));
      const s = 1 + 0.05 * pulse * (0.4 + l) + hover * 0.1;
      rings.setMatrixAt(v.slot, this.tmpM.makeScale(s, 1, s).setPosition(v.x, 0.025, v.z));
      const glowOpacity = 0.002 + hover * 0.05 + l * (0.085 + 0.045 * pulse);
      glows.setColorAt(v.slot, c.copy(this.colJade).lerp(this.colGold, l * 0.5).multiplyScalar(glowOpacity));
      if (qi) qi.intensity[i] = clamp01((l - 0.5) * 2);
    }
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) rings.instanceColor.needsUpdate = true;
    if (glows.instanceColor) glows.instanceColor.needsUpdate = true;
  }

  private updateAmbient(time: number, pulse: number): void {
    this.qi?.update(time);
    this.motes.update(time);
    this.assets.update(time, pulse, this.local ? this.local.rig.sitBlend : 0);
  }

  private updateMarker(time: number, now: number): void {
    if (!this.markerOn) return;
    const me = this.local;
    if (me) {
      if (me.s === MODE_WALK) this.markerSeenWalking = true;
      const dx = me.x - this.markerX;
      const dz = me.z - this.markerZ;
      const arrived = dx * dx + dz * dz < 0.12 && me.speed < 0.3;
      const stopped = this.markerSeenWalking && me.s !== MODE_WALK && me.speed < 0.3;
      const sat = me.s === MODE_SIT && now - this.markerAt > 600;
      const stale = !this.markerSeenWalking && now - this.markerAt > 1800;
      if (arrived || stopped || sat || stale) {
        this.markerOn = false;
        this.marker.visible = false;
        return;
      }
    }
    const s = 1 + 0.14 * Math.sin(time * 7);
    this.marker.scale.set(s, 1, s);
    this.markerRing.rotation.y = time * 0.8;
  }

  private placeMarker(x: number, z: number): void {
    this.markerOn = true;
    this.markerX = x;
    this.markerZ = z;
    this.markerAt = performance.now();
    this.markerSeenWalking = false;
    this.marker.position.set(x, 0.05, z);
    this.marker.visible = true;
  }

  private updateCamera(dt: number): void {
    const { camera, room } = this;
    const me = this.local;
    const tx = me ? me.x : room.spawn.x;
    const tz = me ? me.z : room.spawn.z;
    const f = 1 - Math.exp(-dt * 6);
    this.focusX += (tx - this.focusX) * f;
    this.focusZ += (tz - this.focusZ) * f;
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-dt * 9));
    this.yaw += (this.yawTarget - this.yaw) * (1 - Math.exp(-dt * 16));
    const aspect = this.width / this.height;
    const dist = this.zoom * (aspect < 1 ? 1 + (1 - aspect) * 0.45 : 1);
    const pitch = PITCH_NEAR + (PITCH_FAR - PITCH_NEAR) * clamp01((this.zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN));
    const horiz = Math.cos(pitch) * dist;
    // Two detuned sines per axis: a rumble that reads as a shake, not as per-frame noise.
    const st = performance.now() / 1000;
    const shake = this.sect.shakeAt(st);
    const jx = shake > 0 ? (Math.sin(st * 61) * 0.6 + Math.sin(st * 37 + 1.3) * 0.4) * shake * 0.5 : 0;
    const jy = shake > 0 ? (Math.sin(st * 53 + 0.7) * 0.6 + Math.sin(st * 29) * 0.4) * shake * 0.5 : 0;
    camera.position.set(
      this.focusX + Math.sin(this.yaw) * horiz + jx,
      FOCUS_Y + Math.sin(pitch) * dist + jy,
      this.focusZ + Math.cos(this.yaw) * horiz,
    );
    camera.lookAt(this.focusX + jx, FOCUS_Y + jy, this.focusZ);
    this.fog.near = dist * 1.05;
    this.fog.far = dist * 3.4;
  }

  // ------------------------------------------------------------------ sizing / visibility

  private resize(): void {
    if (this.destroyed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.renderer.setPixelRatio(this.pixelRatio());
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.pixelRatio());
      this.composer.setSize(w, h);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const buf = this.renderer.getDrawingBufferSize(this.tmpV2);
    this.sect.setScale(buf.y, FOV);
    this.qi?.setScale(buf.y, FOV);
    this.motes.setScale(buf.y, FOV);
  }

  private readonly tmpV2 = new THREE.Vector2();

  private readonly onVisibility = (): void => {
    if (this.destroyed) return;
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      return;
    }
    // Deltas kept arriving while hidden: jump to the latest authoritative positions.
    for (const a of this.actorList) {
      a.x = a.aimX = a.fromX = a.toX;
      a.z = a.aimZ = a.fromZ = a.toZ;
    }
    this.settle = 60;
    this.prevFrameMs = 0;
    if (this.raf === 0) {
      this.lastMs = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  // ------------------------------------------------------------------ input

  private setNdc(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  private pickSeat(clientX: number, clientY: number): number {
    this.setNdc(clientX, clientY);
    const hits = this.raycaster.intersectObjects(this.seatHits, false);
    const first = hits[0];
    if (!first) return -1;
    return this.seatHitIndex.get(first.object) ?? -1;
  }

  /** Spot whose floating label covers the pointer. */
  private pickLabel(clientX: number, clientY: number): SpotLabel | null {
    for (const l of this.spotLabels) {
      if (!l.shown) continue;
      const r = l.el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return l;
    }
    return null;
  }

  /** Spot whose prop the current ray hits (call after setNdc/pickSeat aimed the ray). */
  private pickProp(): SpotLabel | null {
    const first = this.raycaster.intersectObjects(this.sect.hits, false)[0];
    const prop = first ? this.sect.propOf(first.object) : null;
    return prop ? this.spotLabels.find(l => l.prop === prop) ?? null : null;
  }

  private useSpot(l: SpotLabel, cb: (spotId: string) => void): void {
    const me = this.local;
    if (!me || Math.hypot(me.x - l.spot.x, me.z - l.spot.z) > l.spot.reach) this.placeMarker(l.spot.x, l.spot.z);
    cb(l.spot.id);
  }

  private handleClick(clientX: number, clientY: number): void {
    const tap = this.spotTap;
    const label = tap ? this.pickLabel(clientX, clientY) : null;
    if (tap && label) {
      this.useSpot(label, tap);
      return;
    }
    const seat = this.pickSeat(clientX, clientY);
    if (seat >= 0) {
      const v = this.seatBySeatIndex.get(seat);
      if (v) this.placeMarker(v.x, v.z);
      this.handlers.onSit(seat);
      return;
    }
    // pickSeat already aimed the ray at the pointer.
    const prop = tap ? this.pickProp() : null;
    if (tap && prop) {
      this.useSpot(prop, tap);
      return;
    }
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmpV);
    if (!hit) return;
    const { w, d } = this.room;
    const margin = 1.5;
    if (hit.x < -margin || hit.x > w + margin || hit.z < -margin || hit.z > d + margin) return;
    const x = clamp(hit.x, 0, w);
    const z = clamp(hit.z, 0, d);
    this.placeMarker(x, z);
    this.handlers.onMove(x, z);
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.downX = e.clientX;
      this.downY = e.clientY;
      this.downAt = performance.now();
      this.dragged = false;
      this.yawVel = 0;
      this.lastDragAt = this.downAt;
    } else if (this.pointers.size === 2) {
      this.dragged = true;
      const [p, q] = Array.from(this.pointers.values()) as [{ x: number; y: number }, { x: number; y: number }];
      this.pinchStartDist = Math.max(10, Math.hypot(p.x - q.x, p.y - q.y));
      this.pinchStartZoom = this.zoomTarget;
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const p = this.pointers.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse') this.updateHover(e);
      return;
    }
    if (this.pointers.size === 1) {
      if (!this.dragged && Math.hypot(e.clientX - this.downX, e.clientY - this.downY) > 8) this.dragged = true;
      if (this.dragged) {
        const dYaw = -(e.clientX - p.x) * 0.006;
        const now = performance.now();
        const gap = Math.max(4, now - this.lastDragAt);
        this.lastDragAt = now;
        this.yawTarget += dYaw;
        this.yawVel += ((dYaw / gap) * 1000 - this.yawVel) * 0.5;
      }
    } else if (this.pointers.size === 2) {
      p.x = e.clientX;
      p.y = e.clientY;
      const [a, b] = Array.from(this.pointers.values()) as [{ x: number; y: number }, { x: number; y: number }];
      const dist = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y));
      this.zoomTarget = clamp(this.pinchStartZoom * (this.pinchStartDist / dist), ZOOM_MIN, ZOOM_MAX);
      return;
    }
    p.x = e.clientX;
    p.y = e.clientY;
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const wasSingle = this.pointers.size === 1;
    this.pointers.delete(e.pointerId);
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    if (wasSingle && !this.dragged && e.button === 0 && performance.now() - this.downAt < 600) {
      this.handleClick(e.clientX, e.clientY);
    } else if (wasSingle && this.dragged && performance.now() - this.lastDragAt < 80) {
      // Let go mid-swipe: the view glides on a little instead of stopping dead.
      this.yawTarget += clamp(this.yawVel, -6, 6) * 0.16;
    }
    if (this.pointers.size === 1) {
      // Pinch ended with one finger left: do not treat the remainder as a click or sudden yaw jump.
      this.dragged = true;
    }
  };

  private readonly onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
  };

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : 1;
    this.zoomTarget = clamp(this.zoomTarget * Math.exp(e.deltaY * unit * 0.0012), ZOOM_MIN, ZOOM_MAX);
  };

  private readonly onContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private updateHover(e: PointerEvent): void {
    const now = performance.now();
    if (now - this.lastHoverAt < 60) return;
    this.lastHoverAt = now;
    this.hoverSeat = this.pickSeat(e.clientX, e.clientY);
    const spot = this.spotTap !== null && this.hoverSeat < 0 && (this.pickLabel(e.clientX, e.clientY) ?? this.pickProp()) !== null;
    this.canvas.style.cursor = this.hoverSeat >= 0 || spot ? 'pointer' : 'crosshair';
  }
}

function hashId(id: PlayerId): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 10;
}
