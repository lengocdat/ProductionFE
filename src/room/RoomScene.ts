import * as THREE from 'three';
import { CharacterAssets, CharacterRig, CUSHION_H } from './characters';
import { ParticleField } from './particles';
import { MODE_SIT, MODE_WALK, type DeltaPlayer, type PlayerId, type PlayerMode, type PlayerState, type Room, type TwistAnim } from './protocol';
import { makeGroundTexture, makePondTexture, makeRadialTexture, makeRippleTexture, mulberry32 } from './textures';

export interface RoomSceneHandlers {
  onMove(x: number, z: number): void;
  onSit(seat: number): void;
}

const FOV = 30;
const PITCH = (50 * Math.PI) / 180;
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
const MAX_ALTAR_LIGHTS = 2;

const COL_BG = 0x0a1a1c;
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
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  glow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  level: number;
  /** 0 free, 1 someone walking to it, 2 someone seated */
  state: 0 | 1 | 2;
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
  private readonly seatBySeatIndex = new Map<number, SeatVisual>();
  private readonly seatHits: THREE.Mesh[] = [];
  private readonly seatHitIndex = new Map<THREE.Object3D, number>();
  private readonly seatFacing = new Map<number, number>();
  private seatsDirty = true;

  private smoke: ParticleField | null = null;
  private qi: ParticleField | null = null;
  private motes: ParticleField;
  private readonly rippleA: THREE.Texture;
  private readonly rippleB: THREE.Texture;
  private readonly lights: THREE.PointLight[] = [];
  private readonly marker = new THREE.Group();
  private readonly markerRing: THREE.Mesh;
  private markerOn = false;
  private markerX = 0;
  private markerZ = 0;
  private markerAt = 0;
  private markerSeenWalking = false;

  // camera rig
  private yaw = 0;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    this.zoom = this.zoomTarget = clamp(24 * (aspectGuess < 1 ? 1.2 : 1), ZOOM_MIN, ZOOM_MAX);
    this.focusX = room.spawn.x;
    this.focusZ = room.spawn.z;

    const shadowTex = this.track(makeRadialTexture([[0, 'rgba(0,0,0,0.9)'], [0.55, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]));
    this.assets = new CharacterAssets(shadowTex);
    this.disposables.push(this.assets);

    this.rippleA = this.track(makeRippleTexture());
    this.rippleB = this.track(makeRippleTexture());
    this.rippleA.repeat.set(2.5, 2.5);
    this.rippleB.repeat.set(1.7, 1.7);

    this.buildLights();
    this.buildGround();
    this.buildWalls();
    this.buildTrees();
    this.buildObstacles();
    this.buildSeats();
    this.motes = this.buildMotes();
    this.markerRing = this.buildMarker();
    this.computeSeatFacing();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

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
      x: p.x, z: p.z, fromX: p.x, fromZ: p.z, toX: p.x, toZ: p.z, t0: now,
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
    el.title = badge ? 'Đã cúng dường Thiên Đạo' : '';
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
        a.x = u.x;
        a.z = u.z;
      }
      a.fromX = a.x;
      a.fromZ = a.z;
      a.toX = u.x;
      a.toZ = u.z;
      a.t0 = now;
      if (a.s !== u.s || a.seat !== u.seat) this.seatsDirty = true;
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
    this.smoke?.dispose();
    this.qi?.dispose();
    this.motes.dispose();
    this.scene.clear();
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

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0x9fd8cc, 0x4a3a28, 0.8));
    const sun = new THREE.DirectionalLight(0xffd8a0, 1.0);
    sun.position.set(-12, 22, 9);
    this.scene.add(sun);
  }

  private buildGround(): void {
    const { w, d } = this.room;
    const tex = this.track(makeGroundTexture(this.renderer.capabilities.getMaxAnisotropy()));
    tex.repeat.set(w / 4, d / 4);
    const ground = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), this.lambert(0xffffff, { map: tex }));
    ground.position.set(w / 2, 0, d / 2);
    ground.matrixAutoUpdate = false;
    ground.updateMatrix();
    this.scene.add(ground);

    const soil = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(w + 3.2, d + 3.2).rotateX(-Math.PI / 2)), this.lambert(0x1d3330));
    soil.position.set(w / 2, -0.012, d / 2);
    soil.matrixAutoUpdate = false;
    soil.updateMatrix();
    this.scene.add(soil);

    const outer = new THREE.Mesh(this.geo(new THREE.PlaneGeometry(700, 700).rotateX(-Math.PI / 2)), this.lambert(0x0e1f1e));
    outer.position.set(w / 2, -0.03, d / 2);
    outer.matrixAutoUpdate = false;
    outer.updateMatrix();
    this.scene.add(outer);
  }

  private buildWalls(): void {
    const { w, d } = this.room;
    const wallMat = this.lambert(0x3b504d);
    const capMat = this.lambert(0x5a7469);
    const sides: ReadonlyArray<readonly [number, number, number, number]> = [
      [w / 2, -0.2, w + 0.8, 0.4],
      [w / 2, d + 0.2, w + 0.8, 0.4],
      [-0.2, d / 2, 0.4, d],
      [w + 0.2, d / 2, 0.4, d],
    ];
    for (const [cx, cz, sx, sz] of sides) {
      const body = new THREE.Mesh(this.geo(new THREE.BoxGeometry(sx, 0.5, sz)), wallMat);
      body.position.set(cx, 0.25, cz);
      body.matrixAutoUpdate = false;
      body.updateMatrix();
      const cap = new THREE.Mesh(this.geo(new THREE.BoxGeometry(sx + 0.1, 0.08, sz + 0.1)), capMat);
      cap.position.set(cx, 0.54, cz);
      cap.matrixAutoUpdate = false;
      cap.updateMatrix();
      this.scene.add(body, cap);
    }

    // Lantern pillars: corners plus roughly every 8 m along each side.
    const spots: Array<[number, number]> = [[-0.2, -0.2], [w + 0.2, -0.2], [-0.2, d + 0.2], [w + 0.2, d + 0.2]];
    const nx = Math.max(1, Math.round(w / 8));
    const nz = Math.max(1, Math.round(d / 8));
    for (let i = 1; i < nx; i++) {
      spots.push([(w * i) / nx, -0.2], [(w * i) / nx, d + 0.2]);
    }
    for (let i = 1; i < nz; i++) {
      spots.push([-0.2, (d * i) / nz], [w + 0.2, (d * i) / nz]);
    }
    const n = spots.length;
    const pillars = this.track(new THREE.InstancedMesh(this.geo(new THREE.BoxGeometry(0.52, 1.0, 0.52).translate(0, 0.5, 0)), this.lambert(0x4b6359), n));
    const lanterns = this.track(new THREE.InstancedMesh(
      this.geo(new THREE.SphereGeometry(0.15, 8, 6).translate(0, 1.2, 0)),
      this.track(new THREE.MeshBasicMaterial({ color: 0xffd58a })), n));
    const poolTex = this.track(makeRadialTexture([[0, 'rgba(255,196,110,0.55)'], [0.5, 'rgba(255,170,80,0.18)'], [1, 'rgba(255,160,70,0)']]));
    const pools = this.track(new THREE.InstancedMesh(
      this.geo(new THREE.PlaneGeometry(5, 5).rotateX(-Math.PI / 2)),
      this.track(new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })), n));
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const [x, z] = spots[i] as [number, number];
      m.makeTranslation(x, 0, z);
      pillars.setMatrixAt(i, m);
      lanterns.setMatrixAt(i, m);
      m.makeTranslation(x, 0.02, z);
      pools.setMatrixAt(i, m);
    }
    pools.renderOrder = 1;
    for (const im of [pillars, lanterns, pools]) {
      im.instanceMatrix.needsUpdate = true;
      im.frustumCulled = false;
      this.scene.add(im);
    }
  }

  private buildTrees(): void {
    const { w, d } = this.room;
    const rnd = mulberry32(4242);
    // [x, z, scale]
    const trees: Array<[number, number, number]> = [];
    const ring = (offset: number, step: number, jitter: number): void => {
      for (let x = -offset; x <= w + offset; x += step * (0.8 + rnd() * 0.5)) {
        trees.push([x + (rnd() - 0.5) * jitter, -offset - rnd() * 1.8, 0.9 + rnd() * 0.7]);
        trees.push([x + (rnd() - 0.5) * jitter, d + offset + rnd() * 1.8, 0.9 + rnd() * 0.7]);
      }
      for (let z = -offset + step; z < d + offset; z += step * (0.8 + rnd() * 0.5)) {
        trees.push([-offset - rnd() * 1.8, z + (rnd() - 0.5) * jitter, 0.9 + rnd() * 0.7]);
        trees.push([w + offset + rnd() * 1.8, z + (rnd() - 0.5) * jitter, 0.9 + rnd() * 0.7]);
      }
    };
    ring(1.8, 3, 1.4);
    ring(5.5, 4.5, 2.5);
    for (const o of this.room.obstacles) {
      if (o.kind === 'tree') trees.push([o.x, o.z, clamp(o.r / 0.4, 0.8, 2.4)]);
    }
    this.buildTreeInstances(trees, rnd);
  }

  private buildTreeInstances(trees: ReadonlyArray<readonly [number, number, number]>, rnd: () => number): void {
    const n = trees.length;
    if (n === 0) return;
    const trunkGeo = this.geo(new THREE.CylinderGeometry(0.1, 0.16, 1.1, 6).translate(0, 0.55, 0));
    const cone = (r: number, h: number, y: number): THREE.ConeGeometry => this.geo(new THREE.ConeGeometry(r, h, 7).translate(0, y + h / 2, 0));
    const layerGeos = [cone(0.98, 1.35, 0.85), cone(0.74, 1.2, 1.6), cone(0.5, 1.05, 2.3)];
    const layerTints = [0, 0.04, 0.08];
    const trunk = this.track(new THREE.InstancedMesh(trunkGeo, this.lambert(0x4a3524), n));
    const foliageMat = this.lambert(0xffffff, { flatShading: true });
    const foliage = layerGeos.map(g => this.track(new THREE.InstancedMesh(g, foliageMat, n)));
    const palette = [0x2a6b57, 0x347a5f, 0x23604f, 0x3d8466, 0x2f6e62, 0x6f8a4a].map(c => new THREE.Color(c));
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const [x, z, s] = trees[i] as readonly [number, number, number];
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, rnd() * 6.28, 0);
      dummy.scale.set(s, s * (0.9 + rnd() * 0.3), s);
      dummy.updateMatrix();
      trunk.setMatrixAt(i, dummy.matrix);
      const base = palette[Math.floor(rnd() * (palette.length - (rnd() < 0.85 ? 1 : 0)))] as THREE.Color;
      foliage.forEach((f, li) => {
        f.setMatrixAt(i, dummy.matrix);
        col.copy(base).offsetHSL(0, 0, layerTints[li] ?? 0);
        f.setColorAt(i, col);
      });
    }
    for (const im of [trunk, ...foliage]) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.frustumCulled = false;
      this.scene.add(im);
    }
  }

  private buildObstacles(): void {
    const altars: Array<{ x: number; z: number; r: number }> = [];
    const stoneMat = this.lambert(0x546b64);
    const stoneLight = this.lambert(0x6f867b);
    const bronze = this.lambert(0x9a7632, { emissive: 0x2a1a05 });
    const stickMat = this.lambert(0xa83a2c);
    const tipMat = this.track(new THREE.MeshBasicMaterial({ color: 0xff9a4a }));
    const glowTex = this.track(makeRadialTexture([[0, 'rgba(255,190,100,0.6)'], [0.5, 'rgba(255,160,80,0.2)'], [1, 'rgba(255,150,70,0)']]));
    const glowMat = this.track(new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

    const pondTex = this.track(makePondTexture());
    const pondMat = this.track(new THREE.MeshBasicMaterial({ map: pondTex }));
    const rimMat = this.lambert(0x607a70);
    const rippleMats = [this.rippleA, this.rippleB].map(t =>
      this.track(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending })));
    const padMat = this.lambert(0x3f8b5e, { side: THREE.DoubleSide });
    const padGeo = this.geo(new THREE.CircleGeometry(0.24, 10).rotateX(-Math.PI / 2));
    const lotusMat = this.lambert(0xf0b8c4, { emissive: 0x3a1a22 });
    const lotusGeo = this.geo(new THREE.ConeGeometry(0.1, 0.16, 6).translate(0, 0.08, 0));
    const rnd = mulberry32(99);

    for (const o of this.room.obstacles) {
      if (o.kind === 'altar') {
        altars.push({ x: o.x, z: o.z, r: o.r });
        const g = new THREE.Group();
        g.position.set(o.x, 0, o.z);
        const base1 = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(o.r + 0.5, o.r + 0.56, 0.12, 24).translate(0, 0.06, 0)), stoneMat);
        const base2 = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(o.r + 0.2, o.r + 0.26, 0.14, 24).translate(0, 0.19, 0)), stoneLight);
        g.add(base1, base2);
        const cs = clamp(o.r / 0.8, 0.7, 1.5);
        const bowl = new THREE.Mesh(this.geo(new THREE.LatheGeometry([
          new THREE.Vector2(0, 0.03), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.31, 0.12), new THREE.Vector2(0.37, 0.3),
          new THREE.Vector2(0.34, 0.42), new THREE.Vector2(0.39, 0.46), new THREE.Vector2(0.3, 0.46), new THREE.Vector2(0, 0.36),
        ], 16)), bronze);
        bowl.position.y = 0.26 + 0.1 * cs;
        bowl.scale.setScalar(cs);
        g.add(bowl);
        const legGeo = this.geo(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 5).translate(0, 0.06, 0));
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 + 0.5;
          const leg = new THREE.Mesh(legGeo, bronze);
          leg.position.set(Math.cos(a) * 0.22 * cs, 0.26, Math.sin(a) * 0.22 * cs);
          leg.scale.setScalar(cs);
          g.add(leg);
        }
        const stickGeo = this.geo(new THREE.CylinderGeometry(0.009, 0.009, 0.55, 4).translate(0, 0.275, 0));
        const tipGeo = this.geo(new THREE.SphereGeometry(0.022, 5, 4));
        const topY = 0.26 + 0.1 * cs + 0.4 * cs;
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const rr = 0.04 + (i % 3) * 0.045;
          const stick = new THREE.Mesh(stickGeo, stickMat);
          stick.position.set(Math.cos(a) * rr * cs, topY - 0.3 * cs, Math.sin(a) * rr * cs);
          stick.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
          stick.scale.setScalar(cs);
          g.add(stick);
          const tip = new THREE.Mesh(tipGeo, tipMat);
          tip.position.set(Math.cos(a) * rr * cs + Math.cos(a) * 0.065 * cs, topY - 0.3 * cs + 0.55 * cs, Math.sin(a) * rr * cs + Math.sin(a) * 0.065 * cs);
          g.add(tip);
        }
        const pool = new THREE.Mesh(this.geo(new THREE.CircleGeometry((o.r + 1.4) * 1.5, 24).rotateX(-Math.PI / 2)), glowMat);
        pool.position.y = 0.03;
        pool.renderOrder = 1;
        g.add(pool);
        for (const child of g.children) {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
        this.scene.add(g);
        if (this.lights.length < MAX_ALTAR_LIGHTS) {
          const light = new THREE.PointLight(0xffa860, 14, 11, 1.6);
          light.position.set(o.x, 1.3, o.z);
          this.scene.add(light);
          this.lights.push(light);
        }
      } else if (o.kind === 'pond') {
        const g = new THREE.Group();
        g.position.set(o.x, 0, o.z);
        const rim = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(o.r + 0.32, o.r + 0.4, 0.12, 28).translate(0, 0.05, 0)), rimMat);
        const water = new THREE.Mesh(this.geo(new THREE.CircleGeometry(o.r, 36).rotateX(-Math.PI / 2)), pondMat);
        water.position.y = 0.115;
        g.add(rim, water);
        const rippleGeo = this.geo(new THREE.CircleGeometry(o.r * 0.97, 36).rotateX(-Math.PI / 2));
        rippleMats.forEach((mat, i) => {
          const ripple = new THREE.Mesh(rippleGeo, mat);
          ripple.position.y = 0.12 + i * 0.004;
          ripple.renderOrder = 1;
          g.add(ripple);
        });
        const pads = 3 + Math.floor(o.r);
        for (let i = 0; i < pads; i++) {
          const a = rnd() * Math.PI * 2;
          const rr = Math.sqrt(rnd()) * o.r * 0.7;
          const pad = new THREE.Mesh(padGeo, padMat);
          pad.position.set(Math.cos(a) * rr, 0.13, Math.sin(a) * rr);
          pad.scale.setScalar(0.8 + rnd() * 0.9);
          g.add(pad);
          if (i % 2 === 0) {
            const lotus = new THREE.Mesh(lotusGeo, lotusMat);
            lotus.position.set(pad.position.x, 0.13, pad.position.z);
            g.add(lotus);
          }
        }
        for (const child of g.children) {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
        this.scene.add(g);
      }
    }

    if (altars.length > 0) {
      const smokeTex = this.track(makeRadialTexture([[0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));
      const field = new ParticleField('smoke', altars.length, 26, smokeTex, 0xc4cfc8, false);
      altars.forEach((a, i) => {
        const cs = clamp(a.r / 0.8, 0.7, 1.5);
        field.origins[i * 3] = a.x;
        field.origins[i * 3 + 1] = 0.26 + 0.1 * cs + 0.42 * cs;
        field.origins[i * 3 + 2] = a.z;
        field.intensity[i] = 1;
      });
      this.smoke = field;
      this.scene.add(field.points);
    }
  }

  private buildSeats(): void {
    const seats = this.room.seats;
    const cushionGeo = this.geo(new THREE.CylinderGeometry(0.4, 0.45, CUSHION_H, 20).translate(0, CUSHION_H / 2, 0));
    const topGeo = this.geo(new THREE.CylinderGeometry(0.32, 0.36, 0.03, 20).translate(0, CUSHION_H + 0.005, 0));
    const rimGeo = this.geo(new THREE.TorusGeometry(0.42, 0.05, 6, 22).rotateX(Math.PI / 2).translate(0, CUSHION_H * 0.55, 0));
    const buttonGeo = this.geo(new THREE.SphereGeometry(0.05, 6, 4).translate(0, CUSHION_H + 0.02, 0));
    const cushionMat = this.lambert(0xc7993a, { emissive: 0x2a1c06 });
    const topMat = this.lambert(0xa5472f);
    const rimMat = this.lambert(0xe3bd5a);
    // Linh mạch cushions (rank-gated): jade silk on a gold base, ringed in gold.
    const innerCushionMat = this.lambert(0xe3bd5a, { emissive: 0x3a2a08 });
    const innerTopMat = this.lambert(0x2f8f78, { emissive: 0x08261e });
    const hitGeo = this.geo(new THREE.CylinderGeometry(0.75, 0.75, 0.7, 12).translate(0, 0.3, 0));
    const hitMat = this.track(new THREE.MeshBasicMaterial({ visible: false }));
    const ringGeo = this.geo(new THREE.RingGeometry(0.62, 0.78, 40).rotateX(-Math.PI / 2));
    const glowGeo = this.geo(new THREE.CircleGeometry(1.35, 32).rotateX(-Math.PI / 2));
    const glowTex = this.track(makeRadialTexture([[0, 'rgba(255,255,255,0.95)'], [0.45, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));

    for (const seat of seats) {
      const g = new THREE.Group();
      g.position.set(seat.x, 0, seat.z);
      const inner = seat.min_rank > 0;
      g.add(new THREE.Mesh(cushionGeo, inner ? innerCushionMat : cushionMat), new THREE.Mesh(topGeo, inner ? innerTopMat : topMat), new THREE.Mesh(rimGeo, rimMat), new THREE.Mesh(buttonGeo, rimMat));
      for (const child of g.children) {
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
      const ring = new THREE.Mesh(ringGeo, this.track(new THREE.MeshBasicMaterial({
        color: inner ? COL_GOLD : COL_JADE, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false,
      })));
      ring.position.y = 0.025;
      ring.renderOrder = 2;
      const glow = new THREE.Mesh(glowGeo, this.track(new THREE.MeshBasicMaterial({
        map: glowTex, color: COL_JADE, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false,
      })));
      glow.position.y = 0.02;
      glow.renderOrder = 1;
      const hit = new THREE.Mesh(hitGeo, hitMat);
      hit.matrixAutoUpdate = false;
      hit.updateMatrix();
      g.add(ring, glow, hit);
      this.scene.add(g);
      const visual: SeatVisual = { index: seat.i, inner, x: seat.x, z: seat.z, ring, glow, level: 0, state: 0 };
      this.seatVisuals.push(visual);
      this.seatBySeatIndex.set(seat.i, visual);
      this.seatHits.push(hit);
      this.seatHitIndex.set(hit, seat.i);
    }

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
      const field = new ParticleField('qi', seats.length, 9, qiTex, 0x9ff2d0, true);
      seats.forEach((s, i) => {
        field.origins[i * 3] = s.x;
        field.origins[i * 3 + 1] = CUSHION_H;
        field.origins[i * 3 + 2] = s.z;
      });
      this.qi = field;
      this.scene.add(field.points);
    }
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

  private computeSeatFacing(): void {
    const altar = this.room.obstacles.find(o => o.kind === 'altar');
    const tx = altar ? altar.x : this.room.w / 2;
    const tz = altar ? altar.z : this.room.d / 2;
    for (const s of this.room.seats) {
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
    const far = this.zoom > FAR_ZOOM;
    this.tagsLayer.classList.toggle('dt-tags--far', far);
    const zone = this.zone;
    if (zone) {
      tmpV.set(zone.x, 0.25, zone.z).project(camera);
      const on = tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1;
      zone.el.style.visibility = on ? 'visible' : 'hidden';
      if (on) zone.el.style.transform = `translate3d(${Math.round((tmpV.x * 0.5 + 0.5) * width)}px,${Math.round((-tmpV.y * 0.5 + 0.5) * height)}px,0)`;
    }
    for (const a of this.actorList) {
      const tag = a.tag;
      tmpV.set(a.x, a.rig.anchorY, a.z).project(camera);
      const sx = Math.round((tmpV.x * 0.5 + 0.5) * width);
      const sy = Math.round((-tmpV.y * 0.5 + 0.5) * height);
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
      const z = sy + (tag.bubbleOn ? 5000 : 0) + (a.isLocal ? 2000 : 0);
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
    this.renderer.render(this.scene, this.camera);
    this.updateTags(nowMs);
  };

  private updateActors(dt: number, time: number, now: number): void {
    const dur = this.tickMs * 1.25;
    const invDt = dt > 0 ? 1 / dt : 0;
    for (const a of this.actorList) {
      const k = clamp01((now - a.t0) / dur);
      const nx = a.fromX + (a.toX - a.fromX) * k;
      const nz = a.fromZ + (a.toZ - a.fromZ) * k;
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
    const k = clamp01(dt * 3);
    const qi = this.qi;
    for (let i = 0; i < this.seatVisuals.length; i++) {
      const v = this.seatVisuals[i] as SeatVisual;
      const target = v.state === 2 ? 1 : v.state === 1 ? 0.4 : 0;
      v.level += (target - v.level) * k;
      const hover = v.index === this.hoverSeat ? 1 : 0;
      const l = v.level;
      v.ring.material.opacity = Math.min(1, 0.24 + hover * 0.3 + l * (0.5 + 0.22 * pulse));
      v.ring.material.color.copy(v.inner ? this.colGold : this.colJade).lerp(this.colGold, l * 0.7);
      const s = 1 + 0.05 * pulse * (0.4 + l) + hover * 0.1;
      v.ring.scale.set(s, 1, s);
      v.glow.material.opacity = 0.1 + hover * 0.08 + l * (0.38 + 0.14 * pulse);
      v.glow.material.color.copy(this.colJade).lerp(this.colGold, l * 0.5);
      if (qi) qi.intensity[i] = clamp01((l - 0.5) * 2);
    }
  }

  private updateAmbient(time: number, pulse: number): void {
    this.smoke?.update(time);
    this.qi?.update(time);
    this.motes.update(time);
    this.rippleA.offset.set(time * 0.012, time * 0.007);
    this.rippleB.offset.set(-time * 0.009, time * 0.011);
    const auras = this.assets.auraMats;
    for (let i = 0; i < auras.length; i++) (auras[i] as THREE.MeshBasicMaterial).opacity = (this.assets.auraBase[i] ?? 0.1) * (0.7 + 0.6 * pulse);
    for (let i = 0; i < this.lights.length; i++) {
      const light = this.lights[i] as THREE.PointLight;
      light.intensity = 13 + Math.sin(time * 7.3 + i * 2) * 0.9 + Math.sin(time * 3.1 + i) * 0.6;
    }
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
    this.zoom += (this.zoomTarget - this.zoom) * clamp01(dt * 8);
    const aspect = this.width / this.height;
    const dist = this.zoom * (aspect < 1 ? 1 + (1 - aspect) * 0.45 : 1);
    const horiz = Math.cos(PITCH) * dist;
    camera.position.set(
      this.focusX + Math.sin(this.yaw) * horiz,
      FOCUS_Y + Math.sin(PITCH) * dist,
      this.focusZ + Math.cos(this.yaw) * horiz,
    );
    camera.lookAt(this.focusX, FOCUS_Y, this.focusZ);
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const buf = this.renderer.getDrawingBufferSize(this.tmpV2);
    this.smoke?.setScale(buf.y, FOV);
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
      a.x = a.fromX = a.toX;
      a.z = a.fromZ = a.toZ;
    }
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

  private handleClick(clientX: number, clientY: number): void {
    const seat = this.pickSeat(clientX, clientY);
    if (seat >= 0) {
      const v = this.seatBySeatIndex.get(seat);
      if (v) this.placeMarker(v.x, v.z);
      this.handlers.onSit(seat);
      return;
    }
    // pickSeat already aimed the ray at the pointer.
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
      if (this.dragged) this.yaw -= (e.clientX - p.x) * 0.006;
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
    this.canvas.style.cursor = this.hoverSeat >= 0 ? 'pointer' : 'crosshair';
  }
}

function hashId(id: PlayerId): number {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 10;
}
