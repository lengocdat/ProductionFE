import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ROBE_LOOKS } from './looks';
import type { TwistAnim } from './protocol';

/** Seconds each Thiên Cơ animation lasts. */
const TWIST_SECONDS: Record<TwistAnim, number> = { jump: 1.2, spin: 1.4, flip: 1.1, faint: 2.6, bow: 2.4 };

function easeInOut(p: number): number {
  return p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
}

/** Height of the cushion top; seated characters are raised by this much. */
export const CUSHION_H = 0.13;

const SKIN = 0xf0cfae;
const HAIR = 0x1f1a1c;
const BOOT = 0x2a2523;
const EYE = 0x1a1410;
const GOLD = 0xe9c46a;
const JADE = 0x5fb89a;
const CLOTH = 0x8a7a64;
const BEARD = 0xeeebe4;
const HEAD_Y = 0.63;

/** Rank tiers (indices match the server's rank list) that unlock each ornament. */
export const RANK_HEADBAND_MAX = 0; // tạp dịch: plain cloth headband
export const RANK_JADE_GUAN = 2; // nội môn: jade hair crown
export const RANK_GOLD_GUAN = 3; // chân truyền+: gold hair crown
export const RANK_BEARD = 4; // trưởng lão+: long white beard
export const RANK_HALO = 5; // thái thượng trưởng lão: halo behind the head
export const CLOUD_FROM_TIER = 2; // patron tier that rides a cloud (bát phở and up)

/** Seated aura [colour, opacity] per rank; matches the badge colours in room.css. */
const RANK_AURA: ReadonlyArray<readonly [number, number]> = [
  [0xb8ad98, 0.08], // tạp dịch: faint ash
  [0x7fe6c0, 0.12], // ngoại môn: jade
  [0x6fa8ff, 0.15], // nội môn: azure
  [0xb98cff, 0.17], // chân truyền: violet
  [0xffd36e, 0.2], // trưởng lão: gold
  [0xff8a5c, 0.24], // thái thượng trưởng lão: crimson-gold
];

const STAND_WAIST = 0.9;
const SIT_WAIST = 0.345;
const STAND_HEM = 0.2;
const SIT_HEM = 0.03;
const SIT_SKIRT_Y = 0.45;
const SIT_SKIRT_XZ = 1.4;

/** Bakes one flat colour into a vertex colour attribute so many parts can share one material. */
function paint(g: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged;
}

function lathe(points: ReadonlyArray<readonly [number, number]>, segments: number): THREE.LatheGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

function buildSkirt(robe: number, trim: number): THREE.BufferGeometry {
  const body = lathe([[0, 0], [0.36, 0], [0.355, 0.06], [0.31, 0.3], [0.245, 0.55], [0.2, 0.7], [0, 0.7]], 14);
  const hem = new THREE.TorusGeometry(0.352, 0.022, 5, 18);
  hem.rotateX(Math.PI / 2);
  hem.translate(0, 0.035, 0);
  return merge([paint(body, robe), paint(hem, trim)]);
}

/** Torso + sash + collar + head + hair + bun + eyes, expressed relative to the waist. */
function buildUpper(robe: number, trim: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(paint(lathe([[0, 0], [0.2, 0], [0.225, 0.12], [0.255, 0.3], [0.215, 0.42], [0.1, 0.47], [0, 0.47]], 14), robe));
  const sash = new THREE.TorusGeometry(0.212, 0.04, 5, 16);
  sash.rotateX(Math.PI / 2);
  sash.translate(0, 0.03, 0);
  parts.push(paint(sash, trim));
  const collar = new THREE.TorusGeometry(0.118, 0.032, 5, 14);
  collar.rotateX(Math.PI / 2);
  collar.translate(0, 0.43, 0);
  parts.push(paint(collar, trim));
  const headY = HEAD_Y;
  const head = new THREE.SphereGeometry(0.19, 14, 10);
  head.translate(0, headY, 0);
  parts.push(paint(head, SKIN));
  const hair = new THREE.SphereGeometry(0.202, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58);
  hair.rotateX(-0.5);
  hair.translate(0, headY + 0.012, -0.012);
  parts.push(paint(hair, HAIR));
  const bun = new THREE.SphereGeometry(0.085, 8, 6);
  bun.translate(0, headY + 0.215, -0.02);
  parts.push(paint(bun, HAIR));
  const pin = new THREE.CylinderGeometry(0.012, 0.012, 0.26, 5);
  pin.rotateZ(Math.PI / 2);
  pin.translate(0, headY + 0.215, -0.02);
  parts.push(paint(pin, GOLD));
  for (const sx of [-0.066, 0.066]) {
    const eye = new THREE.SphereGeometry(0.022, 6, 4);
    eye.translate(sx, headY - 0.005, 0.172);
    parts.push(paint(eye, EYE));
  }
  return merge(parts);
}

/** Sleeve + cuff + hand; pivot at the shoulder, hanging down -Y. */
function buildArm(robe: number, trim: number): THREE.BufferGeometry {
  const sleeve = new THREE.CylinderGeometry(0.062, 0.088, 0.5, 8);
  sleeve.translate(0, -0.25, 0);
  const cuff = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8);
  cuff.translate(0, -0.49, 0);
  const hand = new THREE.SphereGeometry(0.056, 7, 5);
  hand.translate(0, -0.56, 0);
  return merge([paint(sleeve, robe), paint(cuff, trim), paint(hand, SKIN)]);
}

/** Geometries/materials shared by every character in a scene (one set per look where colour matters). */
export class CharacterAssets {
  readonly bodyMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  readonly bootMat = new THREE.MeshLambertMaterial({ color: BOOT });
  readonly shadowMat: THREE.MeshBasicMaterial;
  /** Seated qi column, one per rank so the sect hierarchy reads from across the courtyard. */
  readonly auraMats = RANK_AURA.map(([color, opacity]) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  }));
  readonly auraBase: readonly number[] = RANK_AURA.map(([, opacity]) => opacity);
  readonly youMat = new THREE.MeshBasicMaterial({
    color: GOLD, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  readonly upper: THREE.BufferGeometry[] = [];
  readonly arm: THREE.BufferGeometry[] = [];
  readonly skirt: THREE.BufferGeometry[] = [];
  readonly leg: THREE.BufferGeometry;
  readonly shadowGeo = new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2);
  readonly auraGeo = new THREE.CylinderGeometry(0.62, 0.42, 1.5, 16, 1, true).translate(0, 0.75, 0);
  readonly youGeo = new THREE.RingGeometry(0.5, 0.58, 32).rotateX(-Math.PI / 2);
  // Rank ornaments, positioned relative to the waist like the upper body.
  readonly headbandGeo = paint(new THREE.TorusGeometry(0.196, 0.024, 5, 18).rotateX(Math.PI / 2).translate(0, HEAD_Y + 0.07, 0), CLOTH);
  readonly jadeGuanGeo = merge([
    paint(new THREE.CylinderGeometry(0.075, 0.1, 0.16, 10).translate(0, HEAD_Y + 0.3, -0.02), JADE),
    paint(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 5).rotateZ(Math.PI / 2).translate(0, HEAD_Y + 0.31, -0.02), GOLD),
  ]);
  readonly goldGuanGeo = merge([
    paint(new THREE.CylinderGeometry(0.085, 0.11, 0.2, 10).translate(0, HEAD_Y + 0.32, -0.02), GOLD),
    paint(new THREE.BoxGeometry(0.3, 0.035, 0.12).translate(0, HEAD_Y + 0.43, -0.02), GOLD),
    paint(new THREE.SphereGeometry(0.04, 6, 4).translate(0, HEAD_Y + 0.32, 0.09), 0xc0392b),
  ]);
  readonly beardGeo = paint(new THREE.ConeGeometry(0.13, 0.48, 8).rotateX(Math.PI).translate(0, HEAD_Y - 0.3, 0.13), BEARD);
  readonly haloGeo = new THREE.TorusGeometry(0.42, 0.035, 6, 36).translate(0, HEAD_Y + 0.08, -0.26);
  readonly haloMat = new THREE.MeshBasicMaterial({ color: 0xffd77a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  /** Imperial purple-gold column of the weekly Chưởng môn. */
  readonly masterAuraMat = new THREE.MeshBasicMaterial({
    color: 0xd58cff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
  });
  /** Puffy cloud a tier-2+ patron rides (cưỡi mây). Puffs reach past the 0.58 "you" ring so it reads as a cloud, not a disc. */
  readonly cloudGeo = merge([
    paint(new THREE.SphereGeometry(0.4, 12, 8).scale(1.3, 0.45, 1.2), 0xffffff),
    ...([[0.62, 0, 0.27], [0.5, 1.3, 0.24], [0.6, 2.4, 0.26], [0.55, 3.5, 0.23], [0.62, 4.6, 0.25], [0.5, 5.6, 0.22]] as const)
      .map(([r, a, s], i) => paint(
        new THREE.SphereGeometry(s, 9, 6).scale(1.2, 0.62, 1.2).translate(Math.cos(a) * r, 0.02 + (i % 2) * 0.04, Math.sin(a) * r),
        i % 2 ? 0xf2f5ff : 0xffffff,
      )),
  ]);
  readonly cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x5a6074, transparent: true, opacity: 0.96 });

  constructor(shadowTexture: THREE.Texture) {
    this.shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0.55, depthWrite: false });
    for (const look of ROBE_LOOKS) {
      this.upper.push(buildUpper(look.hex, look.trim));
      this.arm.push(buildArm(look.hex, look.trim));
      this.skirt.push(buildSkirt(look.hex, look.trim));
    }
    this.leg = new THREE.CylinderGeometry(0.075, 0.06, 0.34, 7).translate(0, -0.17, 0);
  }

  dispose(): void {
    for (const g of [...this.upper, ...this.arm, ...this.skirt, this.leg, this.shadowGeo, this.auraGeo, this.youGeo,
      this.headbandGeo, this.jadeGuanGeo, this.goldGuanGeo, this.beardGeo, this.haloGeo, this.cloudGeo]) g.dispose();
    for (const m of [this.bodyMat, this.bootMat, this.shadowMat, ...this.auraMats, this.masterAuraMat, this.youMat, this.haloMat, this.cloudMat]) m.dispose();
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** One character's scene-graph nodes and its animation state. No allocation after construction. */
export class CharacterRig {
  readonly root = new THREE.Group();
  /** World height a tag/bubble should hang above, refreshed by update(). */
  anchorY = 1.9;
  /** Extra yaw from a twist animation; the scene adds it to the walking heading. */
  twistYaw = 0;
  private rank = 0;
  private master = false;
  private readonly cloud: THREE.Mesh;
  private twistAnim: TwistAnim | null = null;
  private twistT = 0;
  private cloudOn = false;
  private readonly upper = new THREE.Group();
  private readonly skirt: THREE.Mesh;
  private readonly armL = new THREE.Group();
  private readonly armR = new THREE.Group();
  private readonly legL = new THREE.Group();
  private readonly legR = new THREE.Group();
  private readonly aura: THREE.Mesh;
  private readonly headband: THREE.Mesh;
  private readonly jadeGuan: THREE.Mesh;
  private readonly goldGuan: THREE.Mesh;
  private readonly beard: THREE.Mesh;
  private readonly halo: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private seatBlend = 0;
  private walkAmt = 0;
  private phase = 0;
  private readonly seed: number;
  private readonly assets: CharacterAssets;

  constructor(assets: CharacterAssets, look: number, rank: number, isLocal: boolean, seed: number) {
    this.seed = seed;
    this.assets = assets;
    const li = look >= 0 && look < assets.upper.length ? look : 0;
    const upperGeo = assets.upper[li] as THREE.BufferGeometry;
    const armGeo = assets.arm[li] as THREE.BufferGeometry;
    const skirtGeo = assets.skirt[li] as THREE.BufferGeometry;

    this.shadow = new THREE.Mesh(assets.shadowGeo, assets.shadowMat);
    this.shadow.position.y = 0.02;
    this.shadow.renderOrder = 1;
    this.shadow.matrixAutoUpdate = false;
    this.shadow.updateMatrix();
    this.root.add(this.shadow);

    if (isLocal) {
      const ring = new THREE.Mesh(assets.youGeo, assets.youMat);
      ring.position.y = 0.035;
      ring.renderOrder = 2;
      ring.matrixAutoUpdate = false;
      ring.updateMatrix();
      this.root.add(ring);
    }

    this.aura = new THREE.Mesh(assets.auraGeo, assets.auraMats[0]);
    this.aura.visible = false;
    this.root.add(this.aura);

    for (const [leg, sx] of [[this.legL, 0.1], [this.legR, -0.1]] as const) {
      leg.position.set(sx, 0.31, 0);
      leg.add(new THREE.Mesh(assets.leg, assets.bootMat));
      this.root.add(leg);
    }

    this.skirt = new THREE.Mesh(skirtGeo, assets.bodyMat);
    this.skirt.position.y = STAND_HEM;
    this.root.add(this.skirt);

    this.upper.position.y = STAND_WAIST;
    this.upper.add(new THREE.Mesh(upperGeo, assets.bodyMat));
    this.headband = new THREE.Mesh(assets.headbandGeo, assets.bodyMat);
    this.jadeGuan = new THREE.Mesh(assets.jadeGuanGeo, assets.bodyMat);
    this.goldGuan = new THREE.Mesh(assets.goldGuanGeo, assets.bodyMat);
    this.beard = new THREE.Mesh(assets.beardGeo, assets.bodyMat);
    this.halo = new THREE.Mesh(assets.haloGeo, assets.haloMat);
    this.upper.add(this.headband, this.jadeGuan, this.goldGuan, this.beard, this.halo);
    this.cloud = new THREE.Mesh(assets.cloudGeo, assets.cloudMat);
    this.cloud.position.y = -0.1;
    this.cloud.visible = false;
    this.root.add(this.cloud);
    this.setRank(rank);
    for (const [arm, sx] of [[this.armL, 0.235], [this.armR, -0.235]] as const) {
      arm.position.set(sx, 0.36, 0);
      arm.add(new THREE.Mesh(armGeo, assets.bodyMat));
      this.upper.add(arm);
    }
    this.root.add(this.upper);

    // Children that never move relative to their parent skip per-frame matrix composition.
    this.root.traverse(obj => {
      if (obj instanceof THREE.Mesh && obj.parent !== this.root) {
        obj.matrixAutoUpdate = false;
        obj.updateMatrix();
      }
    });
  }

  /** Shows the ornaments of a sect rank; ranks only rise, but any value is handled. */
  setRank(rank: number): void {
    this.rank = rank;
    this.applyLook();
  }

  private applyLook(): void {
    const rank = this.rank;
    const auras = this.assets.auraMats;
    this.aura.material = this.master ? this.assets.masterAuraMat : auras[Math.min(Math.max(rank, 0), auras.length - 1)] as THREE.MeshBasicMaterial;
    this.headband.visible = !this.master && rank <= RANK_HEADBAND_MAX;
    this.jadeGuan.visible = !this.master && rank >= RANK_JADE_GUAN && rank < RANK_GOLD_GUAN;
    this.goldGuan.visible = this.master || rank >= RANK_GOLD_GUAN;
    this.beard.visible = rank >= RANK_BEARD;
    this.halo.visible = this.master || rank >= RANK_HALO;
  }

  /**
   * @param moving   true while the rendered position is actually travelling
   * @param speed    rendered speed in m/s (drives stride rate)
   * @param sitting  server says seated (s === 2)
   */
  update(dt: number, time: number, moving: boolean, speed: number, sitting: boolean): void {
    const k = clamp01(dt * 5);
    this.seatBlend += ((sitting ? 1 : 0) - this.seatBlend) * k;
    this.walkAmt += ((moving ? 1 : 0) - this.walkAmt) * clamp01(dt * 8);
    if (this.walkAmt > 0.02) this.phase += dt * (2.2 + speed * 2.4);

    const b = this.seatBlend;
    const nb = 1 - b;
    const walk = this.walkAmt;
    const sw = Math.sin(this.phase) * walk;
    const t = time + this.seed;
    const breathe = Math.sin(t * 1.7);

    this.root.position.y = b * CUSHION_H;

    const legSwing = sw * 0.75 * nb;
    this.legL.rotation.x = legSwing;
    this.legR.rotation.x = -legSwing;
    const legsVisible = b < 0.5;
    this.legL.visible = legsVisible;
    this.legR.visible = legsVisible;

    this.skirt.position.y = STAND_HEM + (SIT_HEM - STAND_HEM) * b;
    const sy = 1 + (SIT_SKIRT_Y - 1) * b;
    const sxz = 1 + (SIT_SKIRT_XZ - 1) * b;
    this.skirt.scale.set(sxz, sy, sxz);

    const bob = Math.abs(Math.sin(this.phase)) * 0.045 * walk * nb;
    this.upper.position.y = STAND_WAIST + (SIT_WAIST - STAND_WAIST) * b + bob + breathe * 0.004 * nb;
    this.upper.scale.y = 1 + breathe * 0.02 * (0.35 + b);
    this.upper.rotation.z = Math.sin(t * 1.1) * 0.03 * nb * (1 - walk);
    this.upper.rotation.x = 0.08 * walk * nb + 0.04 * b;

    const armSwing = sw * 0.6 * nb;
    this.armL.rotation.x = -armSwing + (-1.1 + armSwing) * b;
    this.armR.rotation.x = armSwing + (-1.1 - armSwing) * b;
    const armZ = 0.12 + (-0.37 - 0.12) * b;
    this.armL.rotation.z = armZ;
    this.armR.rotation.z = -armZ;

    const auraOn = b > 0.03;
    this.aura.visible = auraOn;
    if (auraOn) {
      const s = 0.4 + 0.6 * b;
      this.aura.scale.set(s, s, s);
      this.aura.position.y = 0;
    }
    this.shadow.scale.x = 1 + 0.35 * b;
    this.shadow.scale.z = 1 + 0.35 * b;
    this.shadow.updateMatrix();

    this.root.rotation.x = 0;
    this.root.rotation.z = 0;
    this.twistYaw = 0;
    if (this.twistAnim) this.applyTwist(dt, this.twistAnim);

    // Cưỡi mây: standing patrons float on their cloud; it tucks away while they sit.
    const riding = this.cloudOn && b < 0.5;
    this.cloud.visible = riding;
    if (riding) {
      this.root.position.y += 0.22 * nb + Math.sin(t * 2.2) * 0.03;
      this.cloud.rotation.y = Math.sin(t * 0.7) * 0.15;
    }

    this.anchorY = this.root.position.y + this.upper.position.y + 0.98;
  }

  /** Starts a Thiên Cơ animation; a new one replaces any still running. */
  playTwist(anim: TwistAnim): void {
    this.twistAnim = anim;
    this.twistT = 0;
  }

  private applyTwist(dt: number, anim: TwistAnim): void {
    this.twistT += dt;
    const p = Math.min(1, this.twistT / TWIST_SECONDS[anim]);
    switch (anim) {
      case 'jump': // two startled hops
        this.root.position.y += Math.abs(Math.sin(2 * Math.PI * p)) * 0.7 * (1 - 0.4 * p);
        break;
      case 'bow': { // tam bái: three deep bows with hands clasped in front
        const s = Math.sin(Math.PI * ((p * 3) % 1));
        const k = s * s * (1 - this.seatBlend * 0.4);
        this.upper.rotation.x += 0.85 * k;
        this.armL.rotation.x += -1.0 * k;
        this.armR.rotation.x += -1.0 * k;
        this.armL.rotation.z -= 0.25 * k;
        this.armR.rotation.z += 0.25 * k;
        break;
      }
      case 'spin':
        this.twistYaw = easeInOut(p) * 4 * Math.PI;
        break;
      case 'flip': // forward somersault
        this.root.position.y += Math.sin(Math.PI * p) * 1.1;
        this.root.rotation.x = easeInOut(p) * 2 * Math.PI;
        break;
      case 'faint': { // topple over, lie there a moment, get back up
        const down = p < 0.12 ? p / 0.12 : p < 0.8 ? 1 : 1 - (p - 0.8) / 0.2;
        this.root.rotation.z = (Math.PI / 2) * easeInOut(down);
        break;
      }
    }
    if (p >= 1) this.twistAnim = null;
  }

  /** The weekly Chưởng môn wears the gold crown and halo with an imperial aura. */
  setMaster(on: boolean): void {
    this.master = on;
    this.applyLook();
  }

  /** Cúng dường patron tier: from cloudFromTier the character rides a cloud. */
  setPatron(tier: number): void {
    this.cloudOn = tier >= CLOUD_FROM_TIER;
  }

  get sitBlend(): number {
    return this.seatBlend;
  }
}
