import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BurstField, ParticleField } from './particles';
import type { ObstacleKind, Room } from './protocol';
import {
  Batch, bamboo, bannerPole, bellFrame, bellGeometry, cauldron, furnace, gate, hall, island, koiGeometry, peach, peak, pine,
  placeAt, plateau, pondDecor, stairs, statue, stele, stoneLantern, strikerGeometry, wall, wallPost,
} from './sectGeo';
import {
  makeBannerTexture, makeBeamTexture, makeCloudSeaTexture, makeCloudTexture, makeGroundTexture, makePathTexture, makePlaqueTexture,
  makePondTexture, makeRadialTexture, makeRippleTexture, makeSteleTexture, makeTaijiTexture, makeWaterfallTexture, mulberry32,
} from './textures';

interface Disposable { dispose(): void }

/** What the scene lends the sect builder: disposal tracking (freed in RoomScene.destroy) and GPU limits. */
export interface SectKit {
  track<T extends Disposable>(o: T): T;
  maxAnisotropy: number;
}

/** Backdrop and fog colour: dusky violet-blue mist under a moonlit sky. */
export const SECT_MIST = 0x464f72;
/** Colour the peaks fade into where they meet the sea of clouds. */
const PEAK_FOOT = 0x5e688c;
const MAX_POINT_LIGHTS = 4;
const KOI = 6;
const DRAGON_SEGS = 40;
const RING_POOL = 6;
const FLASH_POOL = 5;
const CLOUDS = 12;

/** A server obstacle turned into a scene prop; `top` is the label / effect anchor height. */
export interface SectProp {
  readonly kind: ObstacleKind;
  readonly x: number;
  readonly z: number;
  readonly r: number;
  readonly top: number;
  /** Facing of the prop (radians about +y; 0 = toward +z). */
  readonly yaw: number;
}

interface Ring { mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>; active: boolean; t0: number; dur: number; maxR: number; alpha: number }
interface Flash { sprite: THREE.Sprite; active: boolean; t0: number; dur: number; size: number; follow: THREE.Vector3 | null }
interface Fader { mats: THREE.Material[]; box: THREE.Box3; level: number }
interface Floater { group: THREE.Group; baseY: number; phase: number }
interface Lamp { light: THREE.PointLight; base: number; phase: number; furnace: boolean }

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Builds and animates Cẩu Đạo Tông: the mountain-top terrace and sea of clouds, the walled courtyard with
 * its bát quái circle, the main hall and gate, and every interactive prop from `room.obstacles`.
 * Static parts are merged into a handful of vertex-coloured meshes; animated parts are few small meshes.
 */
export class SectWorld {
  readonly root = new THREE.Group();
  readonly props: SectProp[] = [];
  /** Invisible pick proxies, one per non-tree prop. */
  readonly hits: THREE.Mesh[] = [];
  private readonly hitProp = new Map<THREE.Object3D, SectProp>();

  private readonly matStatic: THREE.MeshLambertMaterial;
  private readonly matGlow: THREE.MeshBasicMaterial;
  private readonly glow = new Batch();
  private readonly stat = new Batch(this.glow);
  private readonly halos: number[] = [];
  private readonly pools: Array<readonly [number, number, number, number]> = [];
  private readonly shadows: Array<readonly [number, number, number]> = [];
  private readonly petalOrigins: number[] = [];

  private readonly lamps: Lamp[] = [];
  private readonly faders: Fader[] = [];
  private readonly floaters: Floater[] = [];
  private readonly fields: Array<ParticleField | BurstField> = [];
  private incense: ParticleField | null = null;
  private readonly puffs: BurstField;
  private readonly sparks: BurstField;

  private readonly rippleA: THREE.Texture;
  private readonly rippleB: THREE.Texture;
  private seaA: THREE.Texture | null = null;
  private seaB: THREE.Texture | null = null;
  private fallTex: THREE.Texture | null = null;
  private waterfall: THREE.Mesh | null = null;
  private readonly bannerTime = { value: 0 };
  private clouds: THREE.InstancedMesh | null = null;
  /** per cloud: angle, radius, y, width, angular speed */
  private readonly cloudData = new Float32Array(CLOUDS * 5);
  private taijiGlow: THREE.MeshBasicMaterial | null = null;
  private readonly glowTex: THREE.Texture;

  private bell: THREE.Object3D | null = null;
  private striker: THREE.Object3D | null = null;
  private fire: THREE.MeshBasicMaterial | null = null;
  private readonly fireBase = new THREE.Color(0xff8a30);
  private readonly firePos = new THREE.Vector3();
  private koi: THREE.InstancedMesh | null = null;
  private pond: { x: number; z: number; r: number } | null = null;
  private readonly koiData: Array<{ r: number; speed: number; phase: number }> = [];

  private readonly rings: Ring[] = [];
  private readonly flashes: Flash[] = [];
  private readonly pillar: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  private readonly pill: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly dragon: THREE.InstancedMesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private bellT0 = -99;
  private flareT0 = -99;
  private flareAmp = 0;
  private glowT0 = -99;
  private incenseT0 = -99;
  private taijiT0 = -99;
  private boomT0 = -99;
  private readonly jump = { t0: -99, x0: 0, z0: 0, x1: 0, z1: 0 };
  private readonly pillState = { t0: -99, from: new THREE.Vector3(), to: new THREE.Vector3(), hasTarget: false, landed: true, flash: null as Flash | null };
  private readonly dragonState = { t0: -99, x: 0, z: 0, flash: null as Flash | null };

  private readonly dummy = new THREE.Object3D();
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpDir = new THREE.Vector3();
  private readonly ray = new THREE.Ray();
  private readonly tmpColor = new THREE.Color();

  constructor(private readonly kit: SectKit, private readonly room: Room) {
    this.matStatic = kit.track(new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.matGlow = kit.track(new THREE.MeshBasicMaterial({ vertexColors: true }));
    this.glowTex = kit.track(makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]));
    this.rippleA = kit.track(makeRippleTexture());
    this.rippleB = kit.track(makeRippleTexture());
    this.rippleA.repeat.set(2.5, 2.5);
    this.rippleB.repeat.set(1.7, 1.7);
    this.dummy.rotation.order = 'YXZ';

    this.buildLights();
    this.buildBackdrop();
    this.buildCourtyard();
    this.buildWalls();
    this.buildHall();
    this.buildGate();
    this.buildProps();
    this.buildOuterTrees();
    this.buildBanners();
    this.finishBatches();

    const smokeTex = kit.track(makeRadialTexture([[0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]));
    this.puffs = this.field(new BurstField(140, smokeTex, false));
    this.sparks = this.field(new BurstField(180, this.glowTex, true));
    this.buildMist(smokeTex);
    this.buildPetals();

    this.pillar = new THREE.Mesh(
      kit.track(new THREE.CylinderGeometry(0.9, 1.3, 11, 24, 1, true).translate(0, 5.5, 0)),
      kit.track(new THREE.MeshBasicMaterial({
        map: kit.track(makeBeamTexture()), color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })));
    this.pillar.visible = false;
    this.pill = new THREE.Mesh(kit.track(new THREE.SphereGeometry(0.13, 12, 8)), kit.track(new THREE.MeshBasicMaterial({ color: 0xffe08a })));
    this.pill.visible = false;
    this.dragon = kit.track(new THREE.InstancedMesh(
      kit.track(new THREE.SphereGeometry(1, 8, 6)),
      kit.track(new THREE.MeshBasicMaterial({ color: 0xffcf5a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })),
      DRAGON_SEGS));
    this.dragon.visible = false;
    this.dragon.frustumCulled = false;
    this.root.add(this.pillar, this.pill, this.dragon);
    const ringGeo = kit.track(new THREE.RingGeometry(0.86, 1, 48).rotateX(-Math.PI / 2));
    for (let i = 0; i < RING_POOL; i++) {
      const mesh = new THREE.Mesh(ringGeo, kit.track(new THREE.MeshBasicMaterial({
        color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })));
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.root.add(mesh);
      this.rings.push({ mesh, active: false, t0: 0, dur: 1, maxR: 1, alpha: 1 });
    }
    for (let i = 0; i < FLASH_POOL; i++) {
      const sprite = new THREE.Sprite(kit.track(new THREE.SpriteMaterial({
        map: this.glowTex, color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      })));
      sprite.visible = false;
      sprite.renderOrder = 12;
      this.root.add(sprite);
      this.flashes.push({ sprite, active: false, t0: 0, dur: 1, size: 1, follow: null });
    }
  }

  // ------------------------------------------------------------------ queries

  /** The prop of `kind` nearest to (x, z), e.g. the cauldron a spot's stand point belongs to. */
  propFor(kind: ObstacleKind, x: number, z: number): SectProp | null {
    let best: SectProp | null = null;
    let bestD = Infinity;
    for (const p of this.props) {
      if (p.kind !== kind) continue;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  propOf(obj: THREE.Object3D): SectProp | null {
    return this.hitProp.get(obj) ?? null;
  }

  /** Call on resize: pixels per world unit at distance 1, for every point-sprite field. */
  setScale(drawingBufferHeight: number, fovDeg: number): void {
    for (const f of this.fields) f.setScale(drawingBufferHeight, fovDeg);
  }

  /** Camera shake offset (metres) from a furnace explosion. */
  shakeAt(time: number): number {
    const t = time - this.boomT0;
    return t >= 0 && t < 1.2 ? 0.32 * Math.exp(-t * 5) : 0;
  }

  // ------------------------------------------------------------------ spot effects

  /**
   * Plays a spot outcome on its prop. `stand` is the spot's stand point; `actor` the acting player's head
   * (pill flies to it) or null when that player is not rendered.
   */
  playFx(prop: SectProp, fx: string, stand: { x: number; z: number }, actor: THREE.Vector3 | null): void {
    const t = performance.now() / 1000;
    const { x, z, top } = prop;
    switch (fx) {
      case 'smoke':
        if (prop.kind === 'furnace') {
          this.flare(t, 0.8);
          this.puffs.emit('puff', x, top, z, 14, 0x55504a, 0.9, t);
          this.sparks.emit('spark', this.firePos.x, this.firePos.y, this.firePos.z, 8, 0xff8a3a, 0.5, t);
        } else {
          this.incenseT0 = t;
          this.puffs.emit('puff', x, top, z, 10, 0xe6e8f2, 0.5, t);
          this.sparks.emit('glint', x, top, z, 12, 0xffd98a, 1.2, t);
          this.taijiT0 = t;
        }
        break;
      case 'glow':
        this.glowT0 = t;
        this.pillar.position.set(x, 0, z);
        this.flash(x, top - 0.4, z, 3.4, 3.6, 0xffd98a, null, t);
        this.sparks.emit('glint', x, top * 0.6, z, 28, 0xffe3a0, 2.2, t);
        this.taijiT0 = t;
        break;
      case 'ring':
        this.bellT0 = t;
        for (let i = 0; i < 3; i++) this.ring(x, 0.08, z, 10 + i * 2, 1.8, 0xffd98a, 0.9, t + 0.4 + i * 0.35);
        this.ring(x, 1.9, z, 4, 1.2, 0xfff0c0, 0.7, t + 0.4);
        this.sparks.emit('glint', x, 2, z, 10, 0xffe3a0, 1.5, t + 0.4);
        this.taijiT0 = t + 0.4;
        break;
      case 'boom':
        this.boomT0 = t;
        this.flare(t, 2.5);
        this.flash(x, 1.5, z, 7, 0.8, 0xffc890, null, t);
        this.puffs.emit('puff', x, 1.6, z, 30, 0x2e2a28, 2.4, t);
        this.sparks.emit('spark', x, 1.6, z, 44, 0xff8a3a, 1.6, t);
        this.ring(x, 0.1, z, 6, 0.7, 0xffa060, 1, t);
        break;
      case 'pill': {
        this.flare(t, 1.2);
        this.sparks.emit('glint', this.firePos.x, this.firePos.y + 0.2, this.firePos.z, 16, 0xffe08a, 1, t);
        const s = this.pillState;
        s.t0 = t;
        s.from.set(x, top, z);
        s.hasTarget = actor !== null;
        if (actor) s.to.copy(actor);
        s.landed = false;
        s.flash = this.flash(x, top, z, 1.1, 1.6, 0xffe08a, this.pill.position, t);
        break;
      }
      case 'ripple':
        this.koiJump(prop, stand, t);
        break;
      case 'dragon': {
        this.koiJump(prop, stand, t);
        const d = this.dragonState;
        d.t0 = t + 0.6;
        d.x = x;
        d.z = z;
        d.flash = this.flash(x, 0.3, z, 2.2, 3.8, 0xffd36a, this.tmpDragonHead, t + 0.6);
        for (let i = 0; i < 3; i++) this.ring(x, 0.14, z, prop.r + 1 + i, 1.6, 0xffd36a, 0.9, t + 0.6 + i * 0.3);
        this.sparks.emit('glint', x, 0.4, z, 40, 0xffe3a0, 2.6, t + 0.8);
        this.taijiT0 = t + 0.8;
        break;
      }
    }
  }

  private readonly tmpDragonHead = new THREE.Vector3();

  private flare(t: number, amp: number): void {
    this.flareT0 = t;
    this.flareAmp = amp;
  }

  private ring(x: number, y: number, z: number, maxR: number, dur: number, color: number, alpha: number, t0: number): void {
    const r = this.rings.find(q => !q.active) ?? this.rings[0];
    if (!r) return;
    r.active = true;
    r.t0 = t0;
    r.dur = dur;
    r.maxR = maxR;
    r.alpha = alpha;
    r.mesh.position.set(x, y, z);
    r.mesh.material.color.setHex(color);
    r.mesh.visible = false;
  }

  private flash(x: number, y: number, z: number, size: number, dur: number, color: number, follow: THREE.Vector3 | null, t0: number): Flash | null {
    const f = this.flashes.find(q => !q.active) ?? this.flashes[0];
    if (!f) return null;
    f.active = true;
    f.t0 = t0;
    f.dur = dur;
    f.size = size;
    f.follow = follow;
    f.sprite.position.set(x, y, z);
    f.sprite.material.color.setHex(color);
    f.sprite.visible = false;
    return f;
  }

  /** A koi leaps out of the water on the side of the pond facing the stand point. */
  private koiJump(prop: SectProp, stand: { x: number; z: number }, t: number): void {
    const a = Math.atan2(stand.z - prop.z, stand.x - prop.x);
    const rr = prop.r * 0.55;
    const j = this.jump;
    j.t0 = t;
    j.x0 = prop.x + Math.cos(a - 0.35) * rr;
    j.z0 = prop.z + Math.sin(a - 0.35) * rr;
    j.x1 = prop.x + Math.cos(a + 0.35) * rr;
    j.z1 = prop.z + Math.sin(a + 0.35) * rr;
    this.ring(j.x0, 0.13, j.z0, 1.4, 1.2, 0xbff4ff, 0.7, t);
    this.ring(j.x1, 0.13, j.z1, 1.6, 1.3, 0xbff4ff, 0.8, t + 1.05);
    this.sparks.emit('glint', j.x1, 0.3, j.z1, 8, 0xd8f6ff, 0.8, t + 1.05);
  }

  // ------------------------------------------------------------------ frame

  /** `focus` is the local player's head (for fading the hall/gate when they hide it), or null. */
  update(time: number, dt: number, camera: THREE.Camera, focus: THREE.Vector3 | null): void {
    this.rippleA.offset.set(time * 0.012, time * 0.007);
    this.rippleB.offset.set(-time * 0.009, time * 0.011);
    this.seaA?.offset.set(time * 0.0016, time * 0.0009);
    this.seaB?.offset.set(-time * 0.0026, time * 0.0012);
    if (this.fallTex) this.fallTex.offset.y = time * 0.8;
    this.bannerTime.value = time;

    if (this.incense) {
      const since = time - this.incenseT0;
      const boost = since >= 0 && since < 10 ? 1.8 * Math.exp(-since * 0.35) : 0;
      this.incense.intensity.fill(1 + boost);
    }
    for (const f of this.fields) f.update(time);

    for (const f of this.floaters) f.group.position.y = f.baseY + Math.sin(time * 0.4 + f.phase) * 0.6;
    if (this.waterfall) {
      const wp = this.waterfall.getWorldPosition(this.tmpV);
      this.waterfall.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z);
    }
    this.updateClouds(dt, camera);

    const pulse = 0.5 + 0.5 * Math.sin(time * 1.3);
    if (this.taijiGlow) {
      const since = time - this.taijiT0;
      this.taijiGlow.opacity = 0.16 + 0.1 * pulse + (since >= 0 && since < 4 ? 0.6 * Math.exp(-since * 1.2) : 0);
    }

    const sinceFlare = time - this.flareT0;
    const flare = sinceFlare >= 0 && sinceFlare < 4 ? this.flareAmp * Math.exp(-sinceFlare * 2.2) : 0;
    const flicker = 1 + Math.sin(time * 13.1) * 0.1 + Math.sin(time * 7.7) * 0.07;
    if (this.fire) this.fire.color.copy(this.fireBase).multiplyScalar(flicker * (1 + flare));
    for (const l of this.lamps) {
      const f = 1 + Math.sin(time * 7.3 + l.phase) * 0.06 + Math.sin(time * 3.1 + l.phase) * 0.04;
      l.light.intensity = l.base * f * (l.furnace ? flicker * (1 + flare) : 1);
    }

    this.updateBell(time);
    this.updateKoi(time);
    this.updateFx(time);
    this.updateFaders(dt, camera, focus);
  }

  private updateClouds(dt: number, camera: THREE.Camera): void {
    const clouds = this.clouds;
    if (!clouds) return;
    const { w, d } = this.room;
    const cd = this.cloudData;
    for (let i = 0; i < CLOUDS; i++) {
      const o = i * 5;
      cd[o] = (cd[o] ?? 0) + (cd[o + 4] ?? 0) * dt;
      const a = cd[o] ?? 0;
      const r = cd[o + 1] ?? 40;
      const s = cd[o + 3] ?? 16;
      this.dummy.position.set(w / 2 + Math.cos(a) * r * 1.15, cd[o + 2] ?? 0, d / 2 + Math.sin(a) * r);
      this.dummy.quaternion.copy(camera.quaternion);
      this.dummy.scale.set(s, s, 1);
      this.dummy.updateMatrix();
      clouds.setMatrixAt(i, this.dummy.matrix);
    }
    this.dummy.rotation.set(0, 0, 0);
    clouds.instanceMatrix.needsUpdate = true;
  }

  private updateBell(time: number): void {
    const t = time - this.bellT0;
    const { bell, striker } = this;
    if (!bell || !striker) return;
    if (t < 0 || t > 6) {
      bell.rotation.x = 0;
      striker.rotation.x = 0;
      return;
    }
    // Pull the log back, swing it into the bell, then both settle.
    if (t < 0.3) striker.rotation.x = -0.55 * Math.sin((t / 0.3) * (Math.PI / 2));
    else if (t < 0.4) striker.rotation.x = -0.55 + 0.63 * ((t - 0.3) / 0.1);
    else striker.rotation.x = 0.08 * Math.cos((t - 0.4) * 6) * Math.exp(-(t - 0.4) * 2.5);
    bell.rotation.x = t < 0.4 ? 0 : 0.13 * Math.sin((t - 0.4) * 6.5) * Math.exp(-(t - 0.4) * 0.8);
  }

  private updateKoi(time: number): void {
    const koi = this.koi;
    const pond = this.pond;
    if (!koi || !pond) return;
    const dm = this.dummy;
    dm.scale.set(1, 1, 1);
    const j = this.jump;
    const jt = (time - j.t0) / 1.1;
    for (let i = 0; i < this.koiData.length; i++) {
      const k = this.koiData[i];
      if (!k) continue;
      if (i === 0 && jt >= 0 && jt <= 1) {
        dm.position.set(j.x0 + (j.x1 - j.x0) * jt, 0.07 + Math.sin(Math.PI * jt) * 0.95, j.z0 + (j.z1 - j.z0) * jt);
        dm.rotation.set(-Math.cos(Math.PI * jt) * 0.9, Math.atan2(j.x1 - j.x0, j.z1 - j.z0), Math.sin(time * 20) * 0.2);
      } else {
        const a = k.phase + time * k.speed;
        const rr = k.r + Math.sin(time * 0.5 + i) * 0.22;
        const dir = k.speed > 0 ? 1 : -1;
        dm.position.set(pond.x + Math.cos(a) * rr, 0.075, pond.z + Math.sin(a) * rr);
        dm.rotation.set(0, Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir) + Math.sin(time * 6 + i * 1.7) * 0.18, 0);
      }
      dm.updateMatrix();
      koi.setMatrixAt(i, dm.matrix);
    }
    dm.rotation.set(0, 0, 0);
    koi.instanceMatrix.needsUpdate = true;
  }

  private updateFx(time: number): void {
    for (const r of this.rings) {
      if (!r.active) continue;
      const u = (time - r.t0) / r.dur;
      if (u < 0) continue;
      if (u > 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      r.mesh.visible = true;
      const s = 0.3 + u * r.maxR;
      r.mesh.scale.set(s, 1, s);
      r.mesh.material.opacity = (1 - u) ** 1.5 * r.alpha;
    }
    for (const f of this.flashes) {
      if (!f.active) continue;
      const u = (time - f.t0) / f.dur;
      if (u < 0) continue;
      if (u > 1) {
        f.active = false;
        f.follow = null;
        f.sprite.visible = false;
        continue;
      }
      f.sprite.visible = true;
      if (f.follow) f.sprite.position.copy(f.follow);
      const s = f.size * (0.7 + 0.3 * Math.sin(Math.PI * u));
      f.sprite.scale.set(s, s, 1);
      f.sprite.material.opacity = Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.05)) * 0.9;
    }

    const g = (time - this.glowT0) / 3.6;
    this.pillar.visible = g >= 0 && g <= 1;
    if (this.pillar.visible) {
      this.pillar.material.opacity = Math.sin(Math.PI * g) * 0.55;
      const s = 1 + 0.08 * Math.sin(time * 5);
      this.pillar.scale.set(s, 1, s);
    }

    this.updatePill(time);
    this.updateDragon(time);
  }

  private updatePill(time: number): void {
    const s = this.pillState;
    const t = time - s.t0;
    if (s.landed) return;
    const pos = this.pill.position;
    if (t < 0.6) {
      const u = t / 0.6;
      pos.copy(s.from);
      pos.y += (1 - (1 - u) * (1 - u)) * 1.2;
    } else if (s.hasTarget && t < 1.8) {
      const u = (t - 0.6) / 1.2;
      const ax = s.from.x;
      const ay = s.from.y + 1.2;
      const az = s.from.z;
      pos.set(ax + (s.to.x - ax) * u, ay + (s.to.y - ay) * u + Math.sin(Math.PI * u) * 1.2, az + (s.to.z - az) * u);
    } else {
      s.landed = true;
      this.pill.visible = false;
      if (s.flash) {
        s.flash.follow = null;
        s.flash.active = false;
        s.flash.sprite.visible = false;
        s.flash = null;
      }
      this.sparks.emit('glint', pos.x, pos.y, pos.z, 16, 0xffe08a, 1, time);
      return;
    }
    this.pill.visible = true;
    const sc = 1 + 0.2 * Math.sin(time * 18);
    this.pill.scale.set(sc, sc, sc);
    if (s.flash && s.flash.active && time > s.flash.t0 + s.flash.dur * 0.4) s.flash.t0 = time - s.flash.dur * 0.4; // hold while flying
  }

  private updateDragon(time: number): void {
    const d = this.dragonState;
    const u = (time - d.t0) / 3.4;
    if (u < 0 || u > 1) {
      this.dragon.visible = false;
      return;
    }
    this.dragon.visible = true;
    this.dragon.material.opacity = 0.9 * clamp01((1 - u) * 4);
    const head = u * 1.9;
    const dm = this.dummy;
    for (let i = 0; i < DRAGON_SEGS; i++) {
      const s = head - i * 0.022;
      const k = clamp01(s);
      const a = k * Math.PI * 4 + time * 0.6;
      const rad = 0.8 + 1.6 * k;
      dm.position.set(d.x + Math.cos(a) * rad, 0.15 + k * 10, d.z + Math.sin(a) * rad);
      const size = s < 0 || s > 1.2 ? 0 : (0.3 * (1 - i / DRAGON_SEGS) ** 0.7 + 0.05) * (i === 0 ? 1.5 : 1);
      dm.scale.set(size, size, size);
      dm.updateMatrix();
      this.dragon.setMatrixAt(i, dm.matrix);
      if (i === 0) this.tmpDragonHead.copy(dm.position);
    }
    dm.scale.set(1, 1, 1);
    this.dragon.instanceMatrix.needsUpdate = true;
  }

  private updateFaders(dt: number, camera: THREE.Camera, focus: THREE.Vector3 | null): void {
    const cam = camera.position;
    let dist = 0;
    if (focus) {
      this.tmpDir.subVectors(focus, cam);
      dist = this.tmpDir.length();
      this.ray.set(cam, this.tmpDir.normalize());
    }
    const k = clamp01(dt * 6);
    for (const f of this.faders) {
      let target = 1;
      if (focus) {
        const hit = this.ray.intersectBox(f.box, this.tmpV);
        if (hit && hit.distanceTo(cam) < dist - 0.2) target = 0.28;
      }
      if (Math.abs(target - f.level) < 0.002) continue;
      f.level += (target - f.level) * k;
      for (const m of f.mats) m.opacity = f.level;
    }
  }

  // ------------------------------------------------------------------ construction

  private field<T extends ParticleField | BurstField>(f: T): T {
    this.kit.track(f);
    this.fields.push(f);
    this.root.add(f.points);
    return f;
  }

  private add<T extends THREE.Object3D>(o: T, x = 0, y = 0, z = 0): T {
    o.position.set(x, y, z);
    o.updateMatrix();
    o.matrixAutoUpdate = false;
    this.root.add(o);
    return o;
  }

  private lambert(params: THREE.MeshLambertMaterialParameters): THREE.MeshLambertMaterial {
    return this.kit.track(new THREE.MeshLambertMaterial(params));
  }

  private basic(params: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
    return this.kit.track(new THREE.MeshBasicMaterial(params));
  }

  private pointLight(color: number, intensity: number, distance: number, x: number, y: number, z: number, furnace = false): void {
    if (this.lamps.length >= MAX_POINT_LIGHTS) return;
    const light = new THREE.PointLight(color, intensity, distance, 1.6);
    light.position.set(x, y, z);
    this.root.add(light);
    this.lamps.push({ light, base: intensity, phase: this.lamps.length * 2.1, furnace });
  }

  private buildLights(): void {
    this.root.add(new THREE.HemisphereLight(0xb4c0f0, 0x4e4438, 1.05));
    const moon = new THREE.DirectionalLight(0xe2e8ff, 1.05);
    moon.position.set(-14, 26, 10);
    this.root.add(moon);
  }

  /** Mountain-top terrace, stairs into the clouds, the sea of clouds, distant peaks, floating isles, drifting clouds. */
  private buildBackdrop(): void {
    const { w, d } = this.room;
    const cx = w / 2;
    const k = this.kit;
    plateau(this.stat, cx, (d - 8) / 2, w / 2 + 9, (d + 22) / 2, 30, PEAK_FOOT);
    stairs(this.stat, cx, d + 6.4, 24);

    const seaA = k.track(makeCloudSeaTexture('#525b83', 'rgba(206,210,238,A)', 11));
    seaA.repeat.set(12, 12);
    this.seaA = seaA;
    this.add(new THREE.Mesh(k.track(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2)), this.basic({ map: seaA })), cx, -10, d / 2);
    const seaB = k.track(makeCloudSeaTexture(null, 'rgba(238,240,255,A)', 23));
    seaB.repeat.set(7, 7);
    this.seaB = seaB;
    const upper = this.add(new THREE.Mesh(k.track(new THREE.PlaneGeometry(800, 800).rotateX(-Math.PI / 2)),
      this.basic({ map: seaB, transparent: true, opacity: 0.75, depthWrite: false })), cx, -6.5, d / 2);
    upper.renderOrder = 1;

    // Peaks: a near ring (lower, darker, some crowned with pines) and a far ring fading into the mist.
    const peaks = new Batch();
    const rnd = mulberry32(1357);
    const czw = d / 2 - 2;
    for (let i = 0; i < 27; i++) {
      const far = i >= 12;
      const a = ((far ? i - 12 : i) / (far ? 15 : 12)) * Math.PI * 2 + rnd() * 0.3;
      if (!far && Math.abs(a - Math.PI / 2) < 0.35) continue; // keep the stairs' landing clear
      const dist = far ? 64 + rnd() * 26 : 40 + rnd() * 9;
      const x = cx + Math.cos(a) * dist * 1.15;
      const z = czw + Math.sin(a) * dist;
      const r = far ? 9 + rnd() * 8 : 5 + rnd() * 4;
      const top = far ? 2 + rnd() * 16 : -7 + rnd() * 9;
      peak(peaks, rnd, x, z, -36, top, r, far ? 0x4c5873 : 0x33463f, far ? 0x6b7496 : PEAK_FOOT);
      if (!far && rnd() < 0.65) peaks.within(placeAt(x, top - 0.5, z, rnd() * 6, 1.1), () => pine(peaks, rnd, 1));
    }
    const peakGeo = peaks.build();
    if (peakGeo) this.add(new THREE.Mesh(k.track(peakGeo), this.lambert({ vertexColors: true, fog: false })));

    // Floating isles with a pavilion; the first pours a waterfall into the clouds.
    const isles: ReadonlyArray<readonly [number, number, number, number]> = [[-18, 3.5, 2, 0.4], [w + 19, 6, d - 6, 2.2]];
    isles.forEach(([x, y, z, yaw], i) => {
      const glow = new Batch();
      const lit = new Batch(glow);
      island(lit, glow, rnd);
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.rotation.y = yaw;
      const litGeo = lit.build();
      const glowGeo = glow.build();
      if (litGeo) group.add(new THREE.Mesh(k.track(litGeo), this.matStatic));
      if (glowGeo) group.add(new THREE.Mesh(k.track(glowGeo), this.matGlow));
      if (i === 0) {
        const tex = k.track(makeWaterfallTexture());
        tex.repeat.set(1, 3);
        this.fallTex = tex;
        const fall = new THREE.Mesh(k.track(new THREE.PlaneGeometry(1.3, 12)),
          this.basic({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, color: 0xdcecff }));
        fall.position.set(2.2, -6.1, 0);
        group.add(fall);
        this.waterfall = fall;
      }
      this.root.add(group);
      this.floaters.push({ group, baseY: y, phase: i * 2.4 });
    });

    const cloudTex = k.track(makeCloudTexture());
    const clouds = k.track(new THREE.InstancedMesh(k.track(new THREE.PlaneGeometry(1, 0.5)),
      this.basic({ map: cloudTex, color: 0xdde0f6, transparent: true, opacity: 0.6, depthWrite: false }), CLOUDS));
    clouds.frustumCulled = false;
    clouds.renderOrder = 2;
    for (let i = 0; i < CLOUDS; i++) {
      const o = i * 5;
      this.cloudData[o] = rnd() * Math.PI * 2;
      this.cloudData[o + 1] = 34 + rnd() * 24;
      this.cloudData[o + 2] = -7 + rnd() * 8;
      this.cloudData[o + 3] = 14 + rnd() * 14;
      this.cloudData[o + 4] = (0.004 + rnd() * 0.006) * (i % 3 ? 1 : -1);
    }
    this.root.add(clouds);
    this.clouds = clouds;
  }

  /** Flagstones, the thần đạo path along the axis and the bát quái circle under the seats. */
  private buildCourtyard(): void {
    const { w, d, seats } = this.room;
    const k = this.kit;
    const cx = w / 2;
    const tex = k.track(makeGroundTexture(k.maxAnisotropy));
    tex.repeat.set(w / 4, d / 4);
    this.add(new THREE.Mesh(k.track(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2)), this.lambert({ map: tex })), w / 2, 0, d / 2);

    let tx = cx;
    let tz = d / 2;
    let R = 6;
    if (seats.length > 0) {
      tx = seats.reduce((s, q) => s + q.x, 0) / seats.length;
      tz = seats.reduce((s, q) => s + q.z, 0) / seats.length;
      R = Math.max(...seats.map(q => Math.hypot(q.x - tx, q.z - tz))) + 1.5;
    }
    const pathTex = k.track(makePathTexture(k.maxAnisotropy));
    const pathMat = this.lambert({ map: pathTex, transparent: true, depthWrite: false });
    const segments: ReadonlyArray<readonly [number, number]> = Math.abs(tx - cx) < R
      ? [[0, tz - R - 0.1], [tz + R + 0.1, d + 6.6]]
      : [[0, d + 6.6]];
    for (const [z0, z1] of segments) {
      const len = z1 - z0;
      if (len <= 0.2) continue;
      const g = k.track(new THREE.PlaneGeometry(3, len).rotateX(-Math.PI / 2));
      const uv = g.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (len / 3));
      const path = this.add(new THREE.Mesh(g, pathMat), cx, 0.004, (z0 + z1) / 2);
      path.renderOrder = 1;
    }

    const disc = k.track(new THREE.CircleGeometry(R, 64).rotateX(-Math.PI / 2));
    const carve = this.add(new THREE.Mesh(disc, this.lambert({ map: k.track(makeTaijiTexture(false)), transparent: true, depthWrite: false })), tx, 0.008, tz);
    carve.renderOrder = 1;
    this.taijiGlow = this.basic({
      map: k.track(makeTaijiTexture(true)), color: 0x7ff0c8, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const glow = this.add(new THREE.Mesh(disc, this.taijiGlow), tx, 0.012, tz);
    glow.renderOrder = 2;
  }

  /** White walls with dark tile caps, gaps for the hall steps and the gate; stone lanterns. */
  private buildWalls(): void {
    const { w, d } = this.room;
    const cx = w / 2;
    const b = this.stat;
    const segs: ReadonlyArray<readonly [number, number, number, number]> = [
      [-0.2, -0.2, cx - 3.8, -0.2], [cx + 3.8, -0.2, w + 0.2, -0.2],
      [-0.2, d + 0.2, cx - 4.3, d + 0.2], [cx + 4.3, d + 0.2, w + 0.2, d + 0.2],
      [-0.2, -0.2, -0.2, d + 0.2], [w + 0.2, -0.2, w + 0.2, d + 0.2],
    ];
    for (const [x0, z0, x1, z1] of segs) wall(b, x0, z0, x1, z1);
    const posts: Array<readonly [number, number]> = [
      [-0.2, -0.2], [w + 0.2, -0.2], [-0.2, d + 0.2], [w + 0.2, d + 0.2], [cx - 3.8, -0.2], [cx + 3.8, -0.2],
      [w / 4, -0.2], [(3 * w) / 4, -0.2], [w / 4, d + 0.2], [(3 * w) / 4, d + 0.2],
      [-0.2, d / 3], [-0.2, (2 * d) / 3], [w + 0.2, d / 3], [w + 0.2, (2 * d) / 3],
    ];
    for (const [x, z] of posts) wallPost(b, x, z);

    const lanterns: Array<readonly [number, number, number]> = [
      [0.9, 0, 0.9], [w - 0.9, 0, 0.9], [0.9, 0, d - 0.9], [w - 0.9, 0, d - 0.9],
      [0.9, 0, d / 2], [w - 0.9, 0, d / 2], [cx - 2.8, 0, d - 0.8], [cx + 2.8, 0, d - 0.8],
      [cx - 2.6, 0, d + 5.4], [cx + 2.6, 0, d + 5.4], [cx - 8.4, 1.08, -2.1], [cx + 8.4, 1.08, -2.1],
    ];
    for (const [x, y, z] of lanterns) {
      b.within(placeAt(x, y, z), () => {
        const p = stoneLantern(b, this.glow);
        this.halos.push(x + p.x, y + p.y, z + p.z);
      });
      this.pools.push([x, y + 0.02, z, 4.2]);
    }
  }

  private buildHall(): void {
    const { w } = this.room;
    const k = this.kit;
    const hx = w / 2;
    const hz = -6.2;
    const hb = new Batch(this.glow);
    let lamps: THREE.Vector3[] = [];
    hb.within(placeAt(hx, 0, hz), () => { lamps = hall(hb, this.glow); });
    const geo = hb.build();
    if (!geo) return;
    const mat = this.lambert({ vertexColors: true, transparent: true });
    this.add(new THREE.Mesh(k.track(geo), mat));
    const plaqueMat = this.lambert({ map: k.track(makePlaqueTexture('Trường Sinh Điện')), transparent: true });
    this.add(new THREE.Mesh(k.track(new THREE.PlaneGeometry(3.6, 1.12)), plaqueMat), hx, 5.65, hz + 1.66);
    for (const p of lamps) this.halos.push(hx + p.x, p.y, hz + p.z);
    this.pointLight(0xffb070, 16, 15, hx, 3.2, -0.8);
    geo.computeBoundingBox();
    const box = (geo.boundingBox ?? new THREE.Box3()).clone();
    this.faders.push({ mats: [mat, plaqueMat], box, level: 1 });
  }

  private buildGate(): void {
    const { w, d } = this.room;
    const k = this.kit;
    const gx = w / 2;
    const gz = d + 0.2;
    const gb = new Batch(this.glow);
    let lamps: THREE.Vector3[] = [];
    gb.within(placeAt(gx, 0, gz), () => { lamps = gate(gb, this.glow); });
    const geo = gb.build();
    if (!geo) return;
    const mat = this.lambert({ vertexColors: true, transparent: true });
    this.add(new THREE.Mesh(k.track(geo), mat));
    const front = new THREE.PlaneGeometry(2.9, 0.82).translate(0, 0, 0.17);
    const back = new THREE.PlaneGeometry(2.9, 0.82).rotateY(Math.PI).translate(0, 0, -0.17);
    const plaqueGeo = k.track(mergeGeometries([front, back], false));
    front.dispose();
    back.dispose();
    const plaqueMat = this.lambert({ map: k.track(makePlaqueTexture('Cẩu Đạo Tông')), transparent: true });
    this.add(new THREE.Mesh(plaqueGeo, plaqueMat), gx, 3.0, gz);
    for (const p of lamps) {
      this.halos.push(gx + p.x, p.y, gz + p.z);
      this.pools.push([gx + p.x, 0.02, gz + p.z, 3.4]);
    }
    this.pointLight(0xffb070, 10, 10, gx, 2.4, d - 0.6);
    geo.computeBoundingBox();
    const box = (geo.boundingBox ?? new THREE.Box3()).clone();
    this.faders.push({ mats: [mat, plaqueMat], box, level: 1 });
  }

  /** Every server obstacle becomes its prop, with a pick proxy matching the collision radius. */
  private buildProps(): void {
    const k = this.kit;
    const b = this.stat;
    const hitMat = this.basic({ visible: false });
    const rnd = mulberry32(99);
    const { d } = this.room;
    for (const o of this.room.obstacles) {
      const spot = this.room.spots.find(s => s.prop === o.kind);
      const yaw = spot ? Math.atan2(spot.x - o.x, spot.z - o.z) : 0;
      let top = 1.5;
      switch (o.kind) {
        case 'statue':
          b.within(placeAt(o.x, 0, o.z), () => { top = statue(b, this.glow); });
          this.shadows.push([o.x, o.z, o.r * 2.6]);
          break;
        case 'cauldron': {
          let tips: THREE.Vector3[] = [];
          b.within(placeAt(o.x, 0, o.z), () => { tips = cauldron(b, this.glow); });
          top = 1.95;
          const smokeTex = k.track(makeRadialTexture([[0, 'rgba(255,255,255,0.9)'], [0.45, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]));
          const field = this.field(new ParticleField('smoke', tips.length, 16, smokeTex, 0xd8dce8, false));
          tips.forEach((p, i) => {
            field.origins[i * 3] = o.x + p.x;
            field.origins[i * 3 + 1] = p.y;
            field.origins[i * 3 + 2] = o.z + p.z;
          });
          field.intensity.fill(1);
          this.incense = field;
          this.pools.push([o.x, 0.02, o.z, 5]);
          this.shadows.push([o.x, o.z, o.r * 2.4]);
          this.pointLight(0xffa860, 9, 9, o.x, 1.6, o.z);
          break;
        }
        case 'bell': {
          b.within(placeAt(o.x, 0, o.z, yaw), () => bellFrame(b, this.glow));
          top = 3.7;
          const frame = new THREE.Group();
          frame.position.set(o.x, 0, o.z);
          frame.rotation.y = yaw;
          const bellPivot = new THREE.Group();
          bellPivot.position.set(0, 2.6, 0);
          bellPivot.add(new THREE.Mesh(k.track(bellGeometry()), this.matStatic));
          const strikerPivot = new THREE.Group();
          strikerPivot.position.set(0, 2.58, 1.0);
          strikerPivot.add(new THREE.Mesh(k.track(strikerGeometry()), this.matStatic));
          frame.add(bellPivot, strikerPivot);
          this.root.add(frame);
          this.bell = bellPivot;
          this.striker = strikerPivot;
          this.shadows.push([o.x, o.z, o.r * 2.4]);
          break;
        }
        case 'furnace': {
          b.within(placeAt(o.x, 0, o.z, yaw), () => { top = furnace(b, this.glow); });
          const fireMat = this.basic({ color: this.fireBase.getHex() });
          this.fire = fireMat;
          const group = new THREE.Group();
          group.position.set(o.x, 0, o.z);
          group.rotation.y = yaw;
          const mouth = new THREE.Mesh(k.track(new THREE.CircleGeometry(0.29, 18)), fireMat);
          mouth.position.set(0, 1.15, 1.005);
          group.add(mouth);
          this.root.add(group);
          const fx = Math.sin(yaw);
          const fz = Math.cos(yaw);
          this.firePos.set(o.x + fx * 1.05, 1.15, o.z + fz * 1.05);
          this.halos.push(this.firePos.x + fx * 0.1, 1.15, this.firePos.z + fz * 0.1);
          this.pools.push([o.x + fx * 1.4, 0.02, o.z + fz * 1.4, 4.5]);
          this.shadows.push([o.x, o.z, o.r * 2.3]);
          this.pointLight(0xff7a30, 11, 8, this.firePos.x + fx * 0.6, 1.1, this.firePos.z + fz * 0.6, true);
          break;
        }
        case 'stele': {
          b.within(placeAt(o.x, 0, o.z, yaw), () => { top = stele(b); });
          const face = new THREE.Mesh(k.track(new THREE.PlaneGeometry(0.78, 1.66)), this.lambert({ map: k.track(makeSteleTexture()) }));
          face.rotation.y = yaw;
          this.add(face, o.x + Math.sin(yaw) * 0.132, 1.5, o.z + Math.cos(yaw) * 0.132);
          this.shadows.push([o.x, o.z, 2]);
          break;
        }
        case 'pond':
          this.buildPond(o.x, o.z, o.r, rnd);
          top = 0.7;
          break;
        case 'tree':
          if (o.z > d * 0.6) {
            let canopy = 2.4;
            b.within(placeAt(o.x, 0, o.z, rnd() * 6, 1.1), () => { canopy = peach(b, rnd, 1); });
            this.petalOrigins.push(o.x, canopy * 1.1, o.z);
          } else {
            b.within(placeAt(o.x, 0, o.z, rnd() * 6, 1.05), () => pine(b, rnd, 1));
          }
          this.shadows.push([o.x, o.z, 3.6]);
          break;
      }
      const prop: SectProp = { kind: o.kind, x: o.x, z: o.z, r: o.r, top, yaw };
      this.props.push(prop);
      if (o.kind === 'tree') continue;
      const h = o.kind === 'pond' ? 0.5 : top;
      const hit = new THREE.Mesh(k.track(new THREE.CylinderGeometry(o.r + 0.25, o.r + 0.25, h, 12).translate(0, h / 2, 0)), hitMat);
      this.add(hit, o.x, 0, o.z);
      this.hits.push(hit);
      this.hitProp.set(hit, prop);
    }
  }

  private buildPond(x: number, z: number, r: number, rnd: () => number): void {
    const k = this.kit;
    this.stat.within(placeAt(x, 0, z), () => pondDecor(this.stat, rnd, r));
    const water = this.add(new THREE.Mesh(k.track(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2)),
      this.basic({ map: k.track(makePondTexture()), transparent: true, opacity: 0.8, depthWrite: false })), x, 0.115, z);
    water.renderOrder = 1;
    const rippleGeo = k.track(new THREE.CircleGeometry(r * 0.97, 36).rotateX(-Math.PI / 2));
    [this.rippleA, this.rippleB].forEach((t, i) => {
      const ripple = this.add(new THREE.Mesh(rippleGeo,
        this.basic({ map: t, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending })), x, 0.12 + i * 0.004, z);
      ripple.renderOrder = 2;
    });
    const koi = k.track(new THREE.InstancedMesh(k.track(koiGeometry()), this.lambert({ color: 0xffffff }), KOI));
    const colours = [0xff7a2a, 0xf4f0e6, 0xe8452e, 0xffc24a, 0xff9a5a, 0xf4f0e6];
    for (let i = 0; i < KOI; i++) {
      koi.setColorAt(i, this.tmpColor.setHex(colours[i % colours.length] as number));
      this.koiData.push({ r: r * (0.3 + rnd() * 0.5), speed: (0.25 + rnd() * 0.25) * (i % 2 ? 1 : -1), phase: rnd() * 6.28 });
    }
    if (koi.instanceColor) koi.instanceColor.needsUpdate = true;
    koi.frustumCulled = false;
    this.root.add(koi);
    this.koi = koi;
    this.pond = { x, z, r };
  }

  /** Pines, bamboo and a few peach trees on the terrace around the walls. */
  private buildOuterTrees(): void {
    const { w, d } = this.room;
    const cx = w / 2;
    const b = this.stat;
    const rnd = mulberry32(4242);
    const a = w / 2 + 9;
    const c = (d + 22) / 2;
    const cz = (d - 8) / 2;
    const places: Array<[number, number]> = [];
    const ring = (off: number, step: number): void => {
      for (let x = -off; x <= w + off; x += step * (0.8 + rnd() * 0.5)) {
        places.push([x + (rnd() - 0.5) * 1.2, -off - rnd() * 1.2], [x + (rnd() - 0.5) * 1.2, d + off + rnd() * 1.2]);
      }
      for (let z = -off + step; z < d + off; z += step * (0.8 + rnd() * 0.5)) {
        places.push([-off - rnd() * 1.2, z + (rnd() - 0.5) * 1.2], [w + off + rnd() * 1.2, z + (rnd() - 0.5) * 1.2]);
      }
    };
    ring(2.4, 5.2);
    ring(5.8, 6.2);
    for (let x = cx - 13; x <= cx + 13; x += 3.2 + rnd() * 1.5) places.push([x, -12.6 - rnd() * 1.2]);
    for (const [x, z] of places) {
      if (Math.abs(x - cx) < 6.5 && z > d) continue; // gate, path and stairs
      if (Math.abs(x - cx) < 11 && z < 0 && z > -12) continue; // main hall
      if (((x - cx) / a) ** 6 + ((z - cz) / c) ** 6 > 0.78) continue; // off the cliff
      const kind = rnd();
      if (kind < 0.58) b.within(placeAt(x, 0, z, rnd() * 6, 0.9 + rnd() * 0.4), () => pine(b, rnd, 1));
      else if (kind < 0.88) b.within(placeAt(x, 0, z, rnd() * 6, 0.9 + rnd() * 0.3), () => bamboo(b, rnd, 1));
      else {
        const s = 0.9 + rnd() * 0.2;
        let canopy = 2.4;
        b.within(placeAt(x, 0, z, rnd() * 6, s), () => { canopy = peach(b, rnd, 1); });
        if (this.petalOrigins.length < 12) this.petalOrigins.push(x, canopy * s, z);
      }
    }
  }

  /** Sect banners on poles flanking the gate and the hall; the cloth waves in the vertex shader. */
  private buildBanners(): void {
    const { w, d } = this.room;
    const cx = w / 2;
    const k = this.kit;
    const spots: ReadonlyArray<readonly [number, number]> = [
      [cx - 5.8, d + 1.3], [cx + 6.8, d + 1.3], [cx - 10, -1.2], [cx + 11, -1.2], [-1.6, d / 2 - 4], [w + 2.4, d / 2 - 4],
    ];
    for (const [x, z] of spots) this.stat.within(placeAt(x, 0, z), () => bannerPole(this.stat));
    const cloth = k.track(new THREE.PlaneGeometry(0.9, 2.3, 4, 8).translate(0, -1.15, 0));
    const mat = this.lambert({ map: k.track(makeBannerTexture()), side: THREE.DoubleSide, alphaTest: 0.5 });
    const time = this.bannerTime;
    mat.onBeforeCompile = shader => {
      shader.uniforms.uTime = time;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>
  float hang = 1.0 - uv.y;
  float ph = uTime * 2.1 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.7;
  transformed.z += sin(ph + hang * 3.2 + uv.x * 2.4) * 0.13 * hang;
  transformed.x += sin(ph * 0.7 + hang * 2.0) * 0.04 * hang;`);
    };
    const im = k.track(new THREE.InstancedMesh(cloth, mat, spots.length));
    const m = new THREE.Matrix4();
    spots.forEach(([x, z], i) => im.setMatrixAt(i, m.makeTranslation(x, 4.15, z)));
    im.instanceMatrix.needsUpdate = true;
    im.frustumCulled = false;
    this.root.add(im);
  }

  private buildMist(tex: THREE.Texture): void {
    const { w, d } = this.room;
    const field = this.field(new ParticleField('mist', 5, 6, tex, 0xc9cde8, false, { w: 34, d: 10 }));
    const origins: ReadonlyArray<readonly [number, number, number]> = [
      [w / 2, -1.2, -15], [w / 2, -1.2, d + 8], [-10, -1.2, d / 2], [w + 10, -1.2, d / 2], [w / 2, 0.05, d / 2],
    ];
    origins.forEach(([x, y, z], i) => {
      field.origins[i * 3] = x;
      field.origins[i * 3 + 1] = y;
      field.origins[i * 3 + 2] = z;
    });
    field.intensity.fill(1);
  }

  private buildPetals(): void {
    const n = this.petalOrigins.length / 3;
    if (n === 0) return;
    const tex = this.kit.track(makeRadialTexture([[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]));
    const field = this.field(new ParticleField('petal', n, 14, tex, 0xffc2d6, false));
    field.origins.set(this.petalOrigins);
    field.intensity.fill(1);
  }

  /** Merges the static and glowing batches; adds lantern halos, warm light pools and contact shadows. */
  private finishBatches(): void {
    const k = this.kit;
    const statGeo = this.stat.build();
    if (statGeo) this.add(new THREE.Mesh(k.track(statGeo), this.matStatic));
    const glowGeo = this.glow.build();
    if (glowGeo) this.add(new THREE.Mesh(k.track(glowGeo), this.matGlow));

    if (this.halos.length > 0) {
      const g = k.track(new THREE.BufferGeometry());
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.halos, 3));
      const halos = this.add(new THREE.Points(g, k.track(new THREE.PointsMaterial({
        map: this.glowTex, color: 0xffbf78, size: 1.5, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }))));
      halos.renderOrder = 9;
      halos.frustumCulled = false;
    }
    const decal = k.track(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    const m = new THREE.Matrix4();
    if (this.pools.length > 0) {
      const poolTex = k.track(makeRadialTexture([[0, 'rgba(255,196,110,0.55)'], [0.5, 'rgba(255,170,80,0.18)'], [1, 'rgba(255,160,70,0)']]));
      const pools = k.track(new THREE.InstancedMesh(decal, this.basic({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), this.pools.length));
      this.pools.forEach(([x, y, z, s], i) => pools.setMatrixAt(i, m.makeScale(s, 1, s).setPosition(x, y, z)));
      pools.renderOrder = 3;
      pools.frustumCulled = false;
      this.root.add(pools);
    }
    if (this.shadows.length > 0) {
      const shadowTex = k.track(makeRadialTexture([[0, 'rgba(0,0,0,0.7)'], [0.6, 'rgba(0,0,0,0.3)'], [1, 'rgba(0,0,0,0)']]));
      const shadows = k.track(new THREE.InstancedMesh(decal, this.basic({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.6 }), this.shadows.length));
      this.shadows.forEach(([x, z, s], i) => shadows.setMatrixAt(i, m.makeScale(s, 1, s).setPosition(x, 0.014, z)));
      shadows.renderOrder = 2;
      shadows.frustumCulled = false;
      this.root.add(shadows);
    }
  }
}
