import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Low-poly builders for Cẩu Đạo Tông: every static part is baked into a vertex-coloured {@link Batch}
 * so a whole family of props costs one draw call. Builders work in local coordinates
 * (ground at y = 0, front of the prop toward +z); callers place them with `Batch.within`.
 */

/** Palette (sRGB hex). */
export const C = {
  stone: 0xa29d94, stoneDark: 0x6f6b65, stoneLight: 0xc6c0b4, marble: 0xdcd8cf,
  plaster: 0xe9e3d5, tile: 0x323840, tileGroove: 0x22262d, tileEdge: 0x59606a, soffit: 0x5a2a20,
  red: 0x9a2a20, redDark: 0x681a14, wood: 0x5a3a26, woodLight: 0x8a5a32, gold: 0xd4ad55, teal: 0x2f6f6a,
  bronze: 0x8c6c36, bronzeDark: 0x56422a, patina: 0x4f7f6a, ash: 0x8f8a82, incense: 0xa83a2c,
  pine: 0x2a4f3d, pineLight: 0x56866a, pineDeep: 0x1d372c, bark: 0x4f3a2a,
  peach: 0xf0a2bf, peachLight: 0xffd3e0, peachDeep: 0xdc7aa0,
  bamboo: 0x7aa152, bambooDark: 0x56793a, leaf: 0x67984c, leafDark: 0x3f6a35,
  moss: 0x4d6448, rock: 0x5f645e, lanternRed: 0xff5634, lanternWarm: 0xffcf86, fire: 0xffa040,
  statueRobe: 0x9aa197, statueDark: 0x737a72, statueSkin: 0xcbc3b1, statueBeard: 0xe6e2d6,
} as const;

export type Shade = (x: number, y: number, z: number, ny: number, out: THREE.Color) => void;

const UP = new THREE.Vector3(0, 1, 0);

function v(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** Position + yaw + uniform scale. */
export function placeAt(x: number, y: number, z: number, yaw = 0, s = 1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(v(x, y, z), new THREE.Quaternion().setFromAxisAngle(UP, yaw), v(s, s, s));
}

/** Deterministic 0..1 hash of a position, so coincident vertices of a mesh always move together. */
function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Collects vertex-coloured parts and merges them into one geometry. Every add() consumes its geometry.
 * A `link`ed batch (the unlit glow parts of the same props) shares every `within` frame.
 */
export class Batch {
  private readonly parts: THREE.BufferGeometry[] = [];
  private frame: THREE.Matrix4 | null = null;
  private readonly col = new THREE.Color();

  constructor(private readonly link: Batch | null = null) {}

  /** Runs `fn` with every add() (here and in the linked batch) transformed by `m`; nested frames multiply. */
  within(m: THREE.Matrix4, fn: () => void): void {
    const prev = this.frame;
    this.frame = prev ? prev.clone().multiply(m) : m;
    if (this.link) this.link.within(m, fn);
    else fn();
    this.frame = prev;
  }

  add(g: THREE.BufferGeometry, hex: number, flat = false): void {
    const geo = this.prep(g, flat, true);
    const c = this.col.setHex(hex);
    const n = geo.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.push(geo);
  }

  /** Colours each vertex with `shade(x, y, z, normalY)` in the geometry's own coordinates. */
  addShaded(g: THREE.BufferGeometry, flat: boolean, shade: Shade): void {
    const geo = this.prep(g, flat, true);
    const pos = geo.getAttribute('position');
    const nor = geo.getAttribute('normal');
    const n = pos.count;
    const arr = new Float32Array(n * 3);
    const c = this.col;
    for (let i = 0; i < n; i++) {
      shade(pos.getX(i), pos.getY(i), pos.getZ(i), nor.getY(i), c);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.push(geo);
  }

  /** Adds a geometry that already carries a `color` attribute. */
  addPainted(g: THREE.BufferGeometry, flat = true): void {
    this.push(this.prep(g, flat, false));
  }

  get size(): number {
    return this.parts.length;
  }

  /** Merges everything added so far; returns null when empty. */
  build(): THREE.BufferGeometry | null {
    if (this.parts.length === 0) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts.length = 0;
    merged.computeBoundingSphere();
    return merged;
  }

  private prep(g: THREE.BufferGeometry, flat: boolean, dropColor: boolean): THREE.BufferGeometry {
    const geo = g.index ? g.toNonIndexed() : g;
    if (geo !== g) g.dispose();
    for (const name of Object.keys(geo.attributes)) {
      if (name === 'position' || name === 'normal' || (name === 'color' && !dropColor)) continue;
      geo.deleteAttribute(name);
    }
    geo.morphAttributes = {};
    geo.clearGroups();
    if (flat || !geo.getAttribute('normal')) geo.computeVertexNormals();
    return geo;
  }

  private push(geo: THREE.BufferGeometry): void {
    if (this.frame) geo.applyMatrix4(this.frame);
    this.parts.push(geo);
  }
}

export function box(w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/** Tapered cylinder from a (radius rA) to b (radius rB). */
export function cylBetween(a: THREE.Vector3, b: THREE.Vector3, rA: number, rB: number, seg: number): THREE.BufferGeometry {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(rB, rA, len, seg, 1);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}

export function lathe(points: ReadonlyArray<readonly [number, number]>, segments: number): THREE.LatheGeometry {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}

/** Moves every vertex by up to `amt` in x/z (and amt/2 in y) with a position hash, keeping seams closed. */
export function jitter<T extends THREE.BufferGeometry>(g: T, amt: number, seed: number): T {
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const qx = Math.round(x * 100) / 100;
    const qy = Math.round(y * 100) / 100;
    const qz = Math.round(z * 100) / 100;
    pos.setXYZ(i,
      x + (hash3(qx + seed, qy, qz) - 0.5) * 2 * amt,
      y + (hash3(qx, qy + seed, qz) - 0.5) * amt,
      z + (hash3(qx, qy, qz + seed) - 0.5) * 2 * amt);
  }
  pos.needsUpdate = true;
  return g;
}

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Curved hip roof (Chinese style): concave slopes, a ridge along x of length w - d, eaves that lift
 * toward all four corners. Base at y = 0, centred on the origin; tiles striped down the slopes.
 */
export function roofGeometry(w: number, d: number, h: number, lift: number): THREE.BufferGeometry {
  const nx = Math.max(6, Math.round(w / 0.55));
  const nz = Math.max(4, Math.round(d / 0.55));
  const hw = w / 2;
  const hd = d / 2;
  const height = (x: number, z: number): number => {
    const s = clamp01(Math.min(hw - Math.abs(x), hd - Math.abs(z)) / hd);
    const ax = Math.abs(x) / hw;
    const az = Math.abs(z) / hd;
    return h * s ** 1.6 + lift * (1 - s) * (1 - s) * ax ** 4 * az ** 4;
  };
  const cells = nx * nz;
  const pos = new Float32Array(cells * 2 * 2 * 9);
  const col = new Float32Array(cells * 2 * 2 * 9);
  const tile = new THREE.Color(C.tile);
  const groove = new THREE.Color(C.tileGroove);
  const edge = new THREE.Color(C.tileEdge);
  const soffit = new THREE.Color(C.soffit);
  let o = 0;
  const put = (x: number, y: number, z: number, c: THREE.Color): void => {
    pos[o] = x;
    pos[o + 1] = y;
    pos[o + 2] = z;
    col[o] = c.r;
    col[o + 1] = c.g;
    col[o + 2] = c.b;
    o += 3;
  };
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      const x0 = -hw + (i * w) / nx;
      const x1 = -hw + ((i + 1) * w) / nx;
      const z0 = -hd + (j * d) / nz;
      const z1 = -hd + ((j + 1) * d) / nz;
      const xc = (x0 + x1) / 2;
      const zc = (z0 + z1) / 2;
      const side = hw - Math.abs(xc) < hd - Math.abs(zc);
      const rim = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      const c = rim ? edge : (side ? j : i) % 2 ? groove : tile;
      const y00 = height(x0, z0);
      const y01 = height(x0, z1);
      const y11 = height(x1, z1);
      const y10 = height(x1, z0);
      put(x0, y00, z0, c); put(x0, y01, z1, c); put(x1, y11, z1, c);
      put(x0, y00, z0, c); put(x1, y11, z1, c); put(x1, y10, z0, c);
      // Underside (painted rafters), facing down.
      const t = 0.1;
      put(x0, y00 - t, z0, soffit); put(x1, y11 - t, z1, soffit); put(x0, y01 - t, z1, soffit);
      put(x0, y00 - t, z0, soffit); put(x1, y10 - t, z0, soffit); put(x1, y11 - t, z1, soffit);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

/** Ridge beam with curled ends (chi wen) and a gilded pearl, for a roof of size w x d at height h. */
function ridge(b: Batch, w: number, d: number, h: number, pearl: boolean, glow: Batch): void {
  const len = Math.max(0.6, w - d);
  b.add(box(len, 0.22, 0.26, 0, h + 0.06, 0), C.tile);
  for (const sx of [-1, 1]) {
    b.add(cylBetween(v((sx * len) / 2, h, 0), v((sx * len) / 2 + sx * 0.18, h + 0.5, 0), 0.12, 0.05, 5), C.tile, true);
    b.add(new THREE.SphereGeometry(0.09, 6, 4).translate((sx * len) / 2 + sx * 0.24, h + 0.5, 0), C.gold);
  }
  if (pearl) {
    glow.add(new THREE.SphereGeometry(0.16, 8, 6).translate(0, h + 0.42, 0), C.lanternWarm);
    b.add(new THREE.ConeGeometry(0.1, 0.3, 5).translate(0, h + 0.65, 0), C.gold, true);
  }
}

/** Stone lantern (thạch đăng), 1.45 m. Returns the local glow point. */
export function stoneLantern(b: Batch, glow: Batch): THREE.Vector3 {
  b.add(box(0.52, 0.14, 0.52, 0, 0.07, 0), C.stoneDark);
  b.add(new THREE.CylinderGeometry(0.09, 0.12, 0.62, 6).translate(0, 0.45, 0), C.stone, true);
  b.add(box(0.44, 0.08, 0.44, 0, 0.8, 0), C.stone);
  for (const [x, z] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]] as const) {
    b.add(box(0.06, 0.26, 0.06, x, 0.97, z), C.stone);
  }
  glow.add(box(0.2, 0.2, 0.2, 0, 0.96, 0), C.lanternWarm);
  b.add(new THREE.ConeGeometry(0.4, 0.26, 4).rotateY(Math.PI / 4).translate(0, 1.23, 0), C.stoneLight, true);
  b.add(new THREE.SphereGeometry(0.07, 6, 4).translate(0, 1.42, 0), C.stoneLight);
  return v(0, 0.96, 0);
}

/** Red hanging lantern whose cord starts at the local origin and hangs `drop` metres. Returns the glow point. */
export function redLantern(b: Batch, glow: Batch, drop: number): THREE.Vector3 {
  const cy = -drop - 0.3;
  b.add(new THREE.CylinderGeometry(0.012, 0.012, drop, 4).translate(0, -drop / 2, 0), C.wood);
  b.add(new THREE.CylinderGeometry(0.13, 0.15, 0.07, 8).translate(0, cy + 0.3, 0), C.gold);
  glow.add(new THREE.SphereGeometry(0.27, 10, 7).scale(1, 1.15, 1).translate(0, cy, 0), C.lanternRed);
  b.add(new THREE.CylinderGeometry(0.15, 0.13, 0.07, 8).translate(0, cy - 0.3, 0), C.gold);
  b.add(new THREE.CylinderGeometry(0.03, 0.05, 0.32, 5).translate(0, cy - 0.5, 0), C.red);
  return v(0, cy, 0);
}

/** Pine (tùng): twisted trunk, cloud-like flat canopy pads. Height about 4.2 s. */
export function pine(b: Batch, rnd: () => number, s: number): void {
  const light = new THREE.Color(C.pineLight);
  const deep = new THREE.Color(C.pineDeep);
  const padShade: Shade = (_x, _y, _z, ny, out) => {
    out.setHex(C.pine);
    if (ny > 0) out.lerp(light, clamp01(ny * 0.9));
    else out.lerp(deep, clamp01(-ny));
  };
  const lean = rnd() * Math.PI * 2;
  let p = v(0, 0, 0);
  const trunk: THREE.Vector3[] = [p];
  for (let i = 0; i < 4; i++) {
    const bend = 0.2 + rnd() * 0.35;
    const a = lean + i * (1.6 + rnd());
    const dir = v(Math.cos(a) * bend, 1, Math.sin(a) * bend).normalize();
    const next = p.clone().addScaledVector(dir, (0.8 + rnd() * 0.35) * s);
    const r0 = (0.2 - i * 0.035) * s;
    b.add(cylBetween(p, next, r0, r0 - 0.035 * s, 6), C.bark, true);
    trunk.push(next);
    p = next;
  }
  for (let i = 2; i <= 4; i++) {
    const base = trunk[i] as THREE.Vector3;
    const pads = i === 4 ? 1 : 2;
    for (let k = 0; k < pads; k++) {
      const a = lean + Math.PI * (k + (i % 2) * 0.5) + (rnd() - 0.5);
      const reach = i === 4 ? 0 : (1.0 + rnd() * 0.5) * s * (1.25 - i * 0.12);
      const end = base.clone().add(v(Math.cos(a) * reach, (0.1 + rnd() * 0.25) * s, Math.sin(a) * reach));
      if (reach > 0) b.add(cylBetween(base, end, 0.07 * s, 0.04 * s, 5), C.bark, true);
      const pad = new THREE.SphereGeometry(1, 8, 4)
        .scale((1.05 + rnd() * 0.45) * s, 0.32 * s, (0.85 + rnd() * 0.3) * s)
        .rotateY(-a)
        .translate(end.x, end.y + 0.12 * s, end.z);
      b.addShaded(pad, true, padShade);
      // Smaller pad stacked above for the layered look.
      const top = new THREE.SphereGeometry(1, 6, 3)
        .scale(0.62 * s, 0.24 * s, 0.55 * s)
        .translate(end.x + Math.cos(a) * 0.15 * s, end.y + 0.36 * s, end.z + Math.sin(a) * 0.15 * s);
      b.addShaded(top, true, padShade);
    }
  }
}

/** Peach blossom tree (đào). Returns the canopy centre height (for falling petals). */
export function peach(b: Batch, rnd: () => number, s: number): number {
  const top = v(0.18 * s, 1.25 * s, 0.08 * s);
  b.add(cylBetween(v(0, 0, 0), top, 0.17 * s, 0.11 * s, 6), C.bark, true);
  const colours = [C.peach, C.peachLight, C.peachDeep, C.peach];
  const blobs: THREE.Vector3[] = [v(0, 2.45 * s, 0)];
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + rnd() * 0.8;
    const end = v(Math.cos(a) * 0.85 * s, (1.95 + rnd() * 0.4) * s, Math.sin(a) * 0.85 * s);
    b.add(cylBetween(top, end, 0.08 * s, 0.035 * s, 5), C.bark, true);
    blobs.push(end, end.clone().add(v(Math.cos(a + 1.2) * 0.4 * s, 0.35 * s, Math.sin(a + 1.2) * 0.4 * s)));
  }
  blobs.forEach((c, i) => {
    b.add(new THREE.DodecahedronGeometry((0.5 + rnd() * 0.3) * s, 0).scale(1, 0.82, 1).translate(c.x, c.y + 0.15 * s, c.z),
      colours[i % colours.length] as number, true);
  });
  return 2.4 * s;
}

/** Bamboo clump (trúc): leaning stalks with leaf tufts on the upper half. */
export function bamboo(b: Batch, rnd: () => number, s: number): void {
  const n = 7 + Math.floor(rnd() * 5);
  for (let k = 0; k < n; k++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 0.6 * s;
    const base = v(Math.cos(a) * r, 0, Math.sin(a) * r);
    const h = (3 + rnd() * 1.8) * s;
    const top = base.clone().add(v(Math.cos(a) * h * 0.14, h, Math.sin(a) * h * 0.14));
    b.add(cylBetween(base, top, 0.055 * s, 0.035 * s, 5), k % 3 ? C.bamboo : C.bambooDark, true);
    for (let t = 0; t < 4; t++) {
      const at = base.clone().lerp(top, 0.55 + t * 0.15);
      const yaw = rnd() * Math.PI * 2;
      b.add(new THREE.OctahedronGeometry(0.3 * s, 0).scale(1.7, 0.16, 0.5).rotateZ(-0.35).rotateY(yaw)
        .translate(at.x + Math.cos(yaw) * 0.32 * s, at.y, at.z - Math.sin(yaw) * 0.32 * s), t % 2 ? C.leaf : C.leafDark, true);
    }
  }
}

/** Founder statue (Tượng Tổ sư) on a lotus pedestal, facing +z. Returns its height. */
export function statue(b: Batch, glow: Batch): number {
  b.add(new THREE.CylinderGeometry(1.32, 1.42, 0.3, 8).translate(0, 0.15, 0), C.stoneDark, true);
  b.add(new THREE.CylinderGeometry(1.08, 1.18, 0.5, 8).translate(0, 0.55, 0), C.stone, true);
  b.add(new THREE.CylinderGeometry(0.98, 1.06, 0.14, 8).translate(0, 0.87, 0), C.stoneLight, true);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    b.add(new THREE.SphereGeometry(0.3, 6, 4).scale(1, 0.45, 0.6).rotateY(-a).translate(Math.cos(a) * 0.84, 0.98, Math.sin(a) * 0.84), C.stoneLight, true);
  }
  // Robe, torso, sash, collar.
  b.add(lathe([[0, 0], [0.8, 0], [0.76, 0.2], [0.62, 0.7], [0.5, 1.15], [0.44, 1.4], [0, 1.4]], 12).translate(0, 1.04, 0), C.statueRobe, true);
  b.add(lathe([[0, 0], [0.44, 0], [0.5, 0.3], [0.46, 0.58], [0.24, 0.72], [0.13, 0.76], [0, 0.76]], 12).translate(0, 2.44, 0), C.statueRobe, true);
  b.add(new THREE.TorusGeometry(0.45, 0.05, 5, 16).rotateX(Math.PI / 2).translate(0, 2.5, 0), C.gold);
  b.add(new THREE.TorusGeometry(0.17, 0.05, 5, 12).rotateX(Math.PI / 2).translate(0, 3.14, 0.02), C.statueDark);
  // Wide sleeves meeting at clasped hands, with long hanging sleeve ends.
  for (const sx of [-1, 1]) {
    b.add(cylBetween(v(sx * 0.45, 3.0, 0), v(sx * 0.15, 2.52, 0.44), 0.17, 0.3, 8), C.statueRobe, true);
    b.add(cylBetween(v(sx * 0.2, 2.52, 0.44), v(sx * 0.26, 1.9, 0.5), 0.27, 0.18, 8), C.statueDark, true);
  }
  b.add(new THREE.SphereGeometry(0.13, 8, 6).translate(0, 2.55, 0.52), C.statueSkin);
  // Head: face, hair cap, topknot and crown, closed eyes, brows, moustache, long beard.
  b.add(new THREE.SphereGeometry(0.26, 12, 9).translate(0, 3.44, 0.02), C.statueSkin);
  b.add(new THREE.SphereGeometry(0.272, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5).rotateX(-0.45).translate(0, 3.45, 0), C.statueDark);
  b.add(new THREE.SphereGeometry(0.11, 8, 6).translate(0, 3.74, -0.06), C.statueDark);
  b.add(new THREE.CylinderGeometry(0.08, 0.11, 0.14, 8).translate(0, 3.8, -0.05), C.gold, true);
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 4).rotateZ(Math.PI / 2).translate(0, 3.8, -0.05), C.gold);
  for (const sx of [-1, 1]) {
    b.add(box(0.1, 0.018, 0.03, sx * 0.09, 3.44, 0.255), C.statueDark);
    b.add(new THREE.BoxGeometry(0.13, 0.03, 0.04).rotateZ(-sx * 0.2).translate(sx * 0.095, 3.52, 0.24), C.statueBeard);
    b.add(cylBetween(v(sx * 0.03, 3.35, 0.27), v(sx * 0.2, 3.22, 0.22), 0.025, 0.01, 4), C.statueBeard);
  }
  b.add(jitter(cylBetween(v(0, 3.34, 0.2), v(0, 2.64, 0.38), 0.16, 0.03, 8), 0.02, 3), C.statueBeard, true);
  // Whisk (phất trần) in the crook of the right arm.
  b.add(cylBetween(v(0.12, 2.48, 0.56), v(0.34, 3.12, 0.68), 0.025, 0.025, 6), C.woodLight);
  b.add(cylBetween(v(0.33, 3.08, 0.66), v(0.66, 2.2, 0.42), 0.07, 0.025, 6), C.statueBeard, true);
  b.add(cylBetween(v(0.33, 3.08, 0.66), v(0.56, 2.15, 0.6), 0.05, 0.02, 5), C.statueBeard, true);
  // Two oil lamps on the pedestal.
  for (const sx of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 6).translate(sx * 0.62, 1.01, 0.82), C.bronze, true);
    glow.add(new THREE.SphereGeometry(0.05, 6, 4).scale(1, 1.5, 1).translate(sx * 0.62, 1.14, 0.82), C.fire);
  }
  return 3.9;
}

/** Three-legged bronze incense cauldron (đỉnh hương). Returns local tips of the three big incense sticks. */
export function cauldron(b: Batch, glow: Batch): THREE.Vector3[] {
  b.add(new THREE.CylinderGeometry(0.95, 1.0, 0.22, 8).translate(0, 0.11, 0), C.stoneDark, true);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const top = v(Math.cos(a) * 0.34, 0.78, Math.sin(a) * 0.34);
    const foot = v(Math.cos(a) * 0.5, 0.24, Math.sin(a) * 0.5);
    b.add(cylBetween(foot, top, 0.06, 0.09, 6), C.bronzeDark, true);
    b.add(new THREE.SphereGeometry(0.09, 6, 4).scale(1.2, 0.6, 1.2).translate(foot.x, foot.y, foot.z), C.bronze);
  }
  const bronzeBand = new THREE.Color(C.patina);
  b.addShaded(lathe([[0, 0], [0.42, 0.02], [0.6, 0.16], [0.66, 0.36], [0.61, 0.55], [0.57, 0.6], [0.66, 0.66], [0.62, 0.71], [0.52, 0.66], [0.5, 0.46], [0, 0.44]], 14)
    .translate(0, 0.66, 0), true, (_x, y, _z, _ny, out) => {
    out.setHex(C.bronze);
    if (y > 0.98 && y < 1.1) out.lerp(bronzeBand, 0.7);
  });
  b.add(new THREE.CircleGeometry(0.5, 12).rotateX(-Math.PI / 2).translate(0, 1.11, 0), C.ash);
  for (const sx of [-1, 1]) {
    b.add(new THREE.TorusGeometry(0.15, 0.04, 5, 8, Math.PI).rotateY(Math.PI / 2).translate(sx * 0.6, 1.36, 0), C.bronze, true);
  }
  const tips: THREE.Vector3[] = [];
  for (const [x, z] of [[-0.13, -0.02], [0, 0.06], [0.13, -0.02]] as const) {
    b.add(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 5).translate(x, 1.47, z), C.incense);
    glow.add(new THREE.SphereGeometry(0.035, 6, 4).translate(x, 1.84, z), C.fire);
    tips.push(v(x, 1.85, z));
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.22 + (i % 2) * 0.12;
    const h = 0.3 + (i % 3) * 0.06;
    b.add(new THREE.CylinderGeometry(0.008, 0.008, h, 3).translate(Math.cos(a) * r, 1.11 + h / 2, Math.sin(a) * r), C.incense);
    glow.add(new THREE.SphereGeometry(0.018, 4, 3).translate(Math.cos(a) * r, 1.11 + h, Math.sin(a) * r), C.fire);
  }
  return tips;
}

/** Wooden bell tower frame with a little roof; the bell hangs from (0, 2.6, 0), the striker beam reaches +z. */
export function bellFrame(b: Batch, glow: Batch): void {
  for (const sx of [-1, 1]) {
    b.add(box(0.42, 0.24, 0.42, sx * 1.25, 0.12, 0), C.stoneDark);
    b.add(new THREE.CylinderGeometry(0.11, 0.13, 2.95, 8).translate(sx * 1.25, 1.6, 0), C.redDark, true);
    b.add(cylBetween(v(sx * 1.25, 2.1, 0), v(sx * 0.8, 2.72, 0), 0.05, 0.05, 4), C.wood);
  }
  b.add(box(2.85, 0.22, 0.24, 0, 2.84, 0), C.red);
  b.add(box(2.5, 0.14, 0.16, 0, 2.64, 0), C.wood);
  b.add(box(0.12, 0.12, 1.5, 0, 2.64, 0.78), C.wood);
  b.add(box(2.5, 0.06, 0.26, 0, 2.97, 0), C.gold);
  b.addPainted(roofGeometry(3.2, 1.5, 0.55, 0.3).translate(0, 3.0, 0));
  ridge(b, 3.2, 1.5, 3.55, false, glow);
}

/** Bronze bell in pivot coordinates (hangs down from y = 0). */
export function bellGeometry(): THREE.BufferGeometry {
  const b = new Batch();
  const band = new THREE.Color(C.patina);
  b.addShaded(lathe([[0, -0.08], [0.2, -0.1], [0.36, -0.2], [0.42, -0.38], [0.44, -1.0], [0.52, -1.3], [0.47, -1.32], [0.4, -1.12], [0.38, -0.4], [0, -0.3]], 16), false, (_x, y, _z, _ny, out) => {
    out.setHex(C.bronze);
    if ((y < -0.5 && y > -0.62) || (y < -0.96 && y > -1.06)) out.lerp(band, 0.75);
  });
  b.add(new THREE.TorusGeometry(0.1, 0.035, 5, 10).translate(0, 0, 0), C.bronzeDark);
  return b.build() as THREE.BufferGeometry;
}

/** Striker log on two ropes, in pivot coordinates (ropes hang from y = 0). */
export function strikerGeometry(): THREE.BufferGeometry {
  const b = new Batch();
  for (const z of [-0.3, 0.3]) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.86, 3).translate(0, -0.43, z), C.wood);
  b.add(new THREE.CylinderGeometry(0.09, 0.09, 1.0, 8).rotateX(Math.PI / 2).translate(0, -0.88, 0), C.woodLight, true);
  return b.build() as THREE.BufferGeometry;
}

/** Alchemy furnace (lò luyện đan); the fire mouth faces +z at (0, 1.15, 1.0). Returns its height. */
export function furnace(b: Batch, glow: Batch): number {
  b.add(new THREE.CylinderGeometry(1.22, 1.3, 0.2, 8).translate(0, 0.1, 0), C.stoneDark, true);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const foot = v(Math.cos(a) * 0.78, 0.2, Math.sin(a) * 0.78);
    b.add(cylBetween(foot, v(Math.cos(a) * 0.55, 0.72, Math.sin(a) * 0.55), 0.1, 0.13, 6), C.bronzeDark, true);
    b.add(new THREE.SphereGeometry(0.14, 6, 4).scale(1.2, 0.6, 1.2).translate(foot.x, foot.y, foot.z), C.bronzeDark);
  }
  const gold = new THREE.Color(C.gold);
  b.addShaded(lathe([[0, 0], [0.6, 0.04], [0.92, 0.32], [1.02, 0.66], [0.92, 1.02], [0.62, 1.24], [0.5, 1.3], [0, 1.3]], 14).translate(0, 0.55, 0), true,
    (_x, y, _z, _ny, out) => {
      out.setHex(C.bronzeDark);
      if ((y > 1.1 && y < 1.3) || (y > 1.68 && y < 1.82)) out.lerp(gold, 0.6);
    });
  // Fire mouth frame and grille (the glowing disc itself is a separate animated mesh).
  b.add(new THREE.TorusGeometry(0.3, 0.06, 6, 16).translate(0, 1.15, 0.98), C.gold);
  for (const x of [-0.12, 0, 0.12]) b.add(box(0.03, 0.52, 0.03, x, 1.15, 1.02), C.bronzeDark);
  for (const sx of [-1, 1]) {
    b.add(new THREE.TorusGeometry(0.2, 0.05, 5, 8, Math.PI).rotateY(Math.PI / 2).translate(sx * 0.9, 1.66, 0), C.bronze, true);
  }
  b.add(lathe([[0, 0], [0.64, 0], [0.6, 0.12], [0.42, 0.32], [0.2, 0.42], [0, 0.45]], 12).translate(0, 1.84, 0), C.bronze, true);
  b.add(new THREE.CylinderGeometry(0.1, 0.14, 0.18, 6).translate(0, 2.36, 0), C.gold, true);
  b.add(new THREE.ConeGeometry(0.28, 0.2, 6).translate(0, 2.54, 0), C.bronzeDark, true);
  b.add(new THREE.SphereGeometry(0.08, 6, 4).translate(0, 2.7, 0), C.gold);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    glow.add(box(0.1, 0.06, 0.1, Math.cos(a) * 0.42, 2.02, Math.sin(a) * 0.42), C.fire);
  }
  return 2.8;
}

/** Stele on a stone turtle (bia rùa), face toward +z; the carved text is a separate textured quad at z = 0.131. */
export function stele(b: Batch): number {
  b.add(new THREE.SphereGeometry(1, 10, 6).scale(0.55, 0.3, 0.68).translate(0, 0.22, 0), C.stoneDark, true);
  b.add(new THREE.SphereGeometry(0.15, 8, 6).scale(1, 0.85, 1.3).translate(0, 0.28, 0.72), C.stoneDark, true);
  for (const [x, z] of [[-0.45, 0.42], [0.45, 0.42], [-0.45, -0.42], [0.45, -0.42]] as const) {
    b.add(new THREE.SphereGeometry(0.13, 6, 4).scale(1.2, 0.6, 1.2).translate(x, 0.08, z), C.stoneDark, true);
  }
  b.add(box(0.92, 0.1, 0.38, 0, 0.5, 0), C.stone);
  b.add(box(0.9, 1.9, 0.26, 0, 1.5, 0), C.stone);
  b.add(new THREE.CylinderGeometry(0.47, 0.47, 0.3, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(0, 2.45, 0), C.stoneLight, true);
  return 2.95;
}

/** Ring of irregular rim stones, a dark pond bed, lily pads and lotus flowers for a pond of radius r. */
export function pondDecor(b: Batch, rnd: () => number, r: number): void {
  const stones = Math.round(r * 7);
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2 + rnd() * 0.1;
    const rr = r + 0.12 + rnd() * 0.12;
    const s = 0.28 + rnd() * 0.16;
    b.add(jitter(new THREE.DodecahedronGeometry(s, 0), s * 0.15, i).scale(1.2, 0.5, 1).rotateY(-a).translate(Math.cos(a) * rr, 0.08, Math.sin(a) * rr),
      i % 3 ? C.stone : C.stoneDark, true);
  }
  b.add(new THREE.CircleGeometry(r + 0.1, 28).rotateX(-Math.PI / 2).translate(0, 0.03, 0), 0x1c3a3c);
  const pads = 4 + Math.floor(r * 1.5);
  for (let i = 0; i < pads; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = (0.35 + rnd() * 0.55) * r * 0.8;
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    const s = 0.22 + rnd() * 0.14;
    b.add(new THREE.CircleGeometry(s, 10, 0.35, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2).rotateY(rnd() * 6).translate(x, 0.125, z), i % 2 ? 0x3f8b5e : 0x4f9a64);
    if (i % 2 === 0) {
      for (let k = 0; k < 6; k++) {
        const pa = (k / 6) * Math.PI * 2;
        b.add(new THREE.SphereGeometry(0.07, 5, 3).scale(0.6, 0.35, 1.3).rotateX(-0.6).rotateY(-pa + Math.PI / 2).translate(x + Math.cos(pa) * 0.06, 0.17, z + Math.sin(pa) * 0.06), k % 2 ? 0xf4bfcc : 0xe993ac, true);
      }
      b.add(new THREE.SphereGeometry(0.035, 5, 3).translate(x, 0.19, z), 0xffd75a);
    }
  }
}

/** Koi body + tail in local coordinates (nose toward +z), white so instance colours tint it. */
export function koiGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(1, 8, 5).scale(0.075, 0.045, 0.22);
  const tail = new THREE.OctahedronGeometry(1, 0).scale(0.1, 0.015, 0.09).translate(0, 0, -0.27);
  const fins = new THREE.OctahedronGeometry(1, 0).scale(0.16, 0.01, 0.05).translate(0, -0.01, 0.04);
  const bodyFlat = body.toNonIndexed();
  body.dispose();
  const merged = mergeGeometries([bodyFlat, tail, fins], false);
  for (const g of [bodyFlat, tail, fins]) g.dispose();
  merged.deleteAttribute('uv');
  merged.computeVertexNormals();
  return merged;
}

/**
 * Đại điện "Trường Sinh Điện": platform with steps toward +z, red colonnade, lattice doors, double-eave roof.
 * Origin at the hall centre on the ground; the front step edge reaches z = 6.3. Returns local lantern glow points.
 */
export function hall(b: Batch, glow: Batch): THREE.Vector3[] {
  // Platform (đài) with balustrade and steps.
  b.add(box(19, 0.25, 9.6, 0, 0.125, 0), C.stoneDark);
  b.add(box(18.6, 0.8, 9.2, 0, 0.62, 0), C.marble);
  b.add(box(18.9, 0.08, 9.5, 0, 1.03, 0), C.stoneLight);
  for (let k = 0; k < 5; k++) {
    const hgt = (5 - k) * 0.2;
    b.add(box(7, hgt, 0.32, 0, hgt / 2, 4.8 + 0.16 + k * 0.3), k % 2 ? C.stoneLight : C.marble);
  }
  for (const sx of [-1, 1]) {
    b.add(box(0.3, 1.25, 1.7, sx * 3.65, 0.62, 5.6), C.marble);
    b.add(box(5.6, 0.1, 0.12, sx * 6.55, 1.42, 4.7), C.marble);
    for (let i = 0; i < 6; i++) b.add(box(0.16, 0.42, 0.16, sx * (3.8 + i * 1.1), 1.25, 4.7), C.marble);
  }
  // Body walls, lattice doors and windows.
  b.add(box(15, 3.2, 5.2, 0, 2.65, -0.6), C.redDark);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 2.5;
    b.add(box(2.1, 2.6, 0.06, x, 2.35, 2.03), C.woodLight);
    for (let k = 0; k < 4; k++) b.add(box(2.1, 0.05, 0.04, x, 1.4 + k * 0.6, 2.07), C.wood);
    for (let k = 0; k < 3; k++) b.add(box(0.05, 2.6, 0.04, x - 0.7 + k * 0.7, 2.35, 2.07), C.wood);
  }
  // Colonnade with stone drums, architrave and painted band.
  for (const x of [-7.2, -4.3, -1.45, 1.45, 4.3, 7.2]) {
    b.add(new THREE.CylinderGeometry(0.3, 0.32, 0.2, 8).translate(x, 1.15, 3.6), C.stone, true);
    b.add(new THREE.CylinderGeometry(0.19, 0.2, 3.0, 10).translate(x, 2.6, 3.6), C.red);
    b.add(box(0.5, 0.18, 0.5, x, 4.15, 3.6), C.gold);
  }
  b.add(box(15.2, 0.34, 0.34, 0, 3.92, 3.6), C.red);
  b.add(box(15.2, 0.14, 0.36, 0, 3.68, 3.6), C.teal);
  // Lower eave, upper storey, upper roof.
  b.addPainted(roofGeometry(18.4, 8.6, 1.3, 0.55).translate(0, 4.25, 0));
  b.add(box(11, 2.1, 4.4, 0, 5.65, -0.6), C.redDark);
  b.add(box(11.2, 0.16, 4.6, 0, 6.62, -0.6), C.teal);
  for (let i = 0; i < 4; i++) b.add(box(1.2, 0.7, 0.05, -4.2 + i * 2.8, 5.7, 1.63), C.woodLight);
  b.addPainted(roofGeometry(14, 6.6, 1.6, 0.7).translate(0, 6.7, -0.6));
  b.within(placeAt(0, 0, -0.6), () => ridge(b, 14, 6.6, 8.3, true, glow));
  const lamps: THREE.Vector3[] = [];
  for (const x of [-5.75, -2.9, 2.9, 5.75]) {
    b.within(placeAt(x, 4.3, 4.1), () => lamps.push(redLantern(b, glow, 0.35).add(v(x, 4.3, 4.1))));
  }
  return lamps;
}

/**
 * Sơn môn paifang: three bays, red pillars on stone drums, small curved roofs; the plaque is a separate quad
 * at (0, 3.0, ±0.16). Origin at the gate centre on the ground. Returns local lantern glow points.
 */
export function gate(b: Batch, glow: Batch): THREE.Vector3[] {
  for (const [x, h] of [[-1.95, 3.9], [1.95, 3.9], [-4.1, 2.8], [4.1, 2.8]] as const) {
    b.add(box(0.75, 0.55, 0.75, x, 0.27, 0), C.stone);
    b.add(box(0.36, h, 0.36, x, h / 2, 0), C.red);
    for (const sz of [-1, 1]) b.add(cylBetween(v(x, 0.2, sz * 0.9), v(x, 1.3, sz * 0.12), 0.06, 0.05, 4), C.stoneDark);
  }
  b.add(box(4.3, 0.3, 0.32, 0, 2.45, 0), C.red);
  b.add(box(4.3, 0.12, 0.34, 0, 2.25, 0), C.teal);
  b.add(box(4.5, 0.3, 0.32, 0, 3.55, 0), C.red);
  for (const sx of [-1, 1]) {
    b.add(box(2.1, 0.26, 0.28, sx * 3.02, 2.15, 0), C.red);
    b.addPainted(roofGeometry(2.8, 1.25, 0.38, 0.22).translate(sx * 3.05, 2.32, 0));
    b.within(placeAt(sx * 3.05, 0, 0), () => ridge(b, 2.8, 1.25, 2.72, false, glow));
  }
  b.addPainted(roofGeometry(5.4, 1.6, 0.5, 0.32).translate(0, 3.74, 0));
  ridge(b, 5.4, 1.6, 4.24, true, glow);
  const lamps: THREE.Vector3[] = [];
  for (const x of [-1.05, 1.05]) {
    b.within(placeAt(x, 2.3, 0), () => lamps.push(redLantern(b, glow, 0.08).add(v(x, 2.3, 0))));
  }
  return lamps;
}

/** White courtyard wall segment from (x0, z0) to (x1, z1): stone footing, plaster, dark curved tile cap. */
export function wall(b: Batch, x0: number, z0: number, x1: number, z1: number): void {
  const len = Math.hypot(x1 - x0, z1 - z0);
  if (len < 0.05) return;
  const yaw = Math.atan2(-(z1 - z0), x1 - x0);
  b.within(placeAt((x0 + x1) / 2, 0, (z0 + z1) / 2, yaw), () => {
    b.add(box(len, 0.32, 0.52, 0, 0.16, 0), C.stoneDark);
    b.add(box(len, 1.0, 0.4, 0, 0.8, 0), C.plaster);
    b.add(box(len + 0.1, 0.08, 0.46, 0, 1.32, 0), C.stoneLight);
    for (const sz of [-1, 1]) b.add(new THREE.BoxGeometry(len + 0.3, 0.06, 0.42).rotateX(sz * 0.42).translate(0, 1.43, sz * 0.2), C.tile);
    b.add(box(len + 0.3, 0.1, 0.12, 0, 1.53, 0), C.tileGroove);
  });
}

/** Square wall post with a little cap, used at corners and gaps. */
export function wallPost(b: Batch, x: number, z: number): void {
  b.add(box(0.62, 1.55, 0.62, x, 0.78, z), C.plaster);
  b.add(box(0.72, 0.12, 0.72, x, 1.6, z), C.tile);
  b.add(new THREE.ConeGeometry(0.42, 0.25, 4).rotateY(Math.PI / 4).translate(x, 1.78, z), C.tile, true);
}

/**
 * The mountain-top the sect stands on: squarish superellipse terrace (moss on top) whose rock walls taper down
 * into the sea of clouds. Centre (cx, cz), half extents a x c, top at y = -0.03.
 */
export function plateau(b: Batch, cx: number, cz: number, a: number, c: number, depth: number, mist: number): void {
  const shape = new THREE.Shape();
  const n = 80;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const j = 1 + (hash3(i, 1, 2) - 0.5) * 0.06;
    const x = cx + Math.sign(ct) * Math.abs(ct) ** (2 / 6) * a * j;
    const y = cz + Math.sign(st) * Math.abs(st) ** (2 / 6) * c * j;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 5 });
  g.rotateX(Math.PI / 2);
  g.translate(0, -0.03, 0);
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > -0.5) continue;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = -y / depth;
    const taper = 1 - 0.3 * k;
    const h = hash3(Math.round(x * 10), Math.round(y * 10), Math.round(z * 10));
    const out = 1 + (h - 0.5) * 0.08;
    pos.setXYZ(i, cx + (x - cx) * taper * out, y, cz + (z - cz) * taper * out);
  }
  const moss = new THREE.Color(C.moss);
  const rock = new THREE.Color(C.rock);
  const fog = new THREE.Color(mist);
  b.addShaded(g, true, (x, y, z, ny, out) => {
    if (ny > 0.7 && y > -0.3) {
      out.copy(moss).offsetHSL(0, 0, (hash3(Math.round(x), 0, Math.round(z)) - 0.5) * 0.05);
      return;
    }
    out.copy(rock).lerp(fog, clamp01(-y / depth) * 0.85);
  });
}

/** Stone stairs descending from the plateau edge toward +z into the clouds. */
export function stairs(b: Batch, x: number, z0: number, steps: number): void {
  for (let k = 0; k < steps; k++) {
    const top = -k * 0.42;
    const z = z0 + k * 0.6 + 0.3;
    b.add(box(3.6, 1.2, 0.62, x, top - 0.6, z), k % 2 ? C.stone : C.stoneLight);
    for (const sx of [-1, 1]) b.add(box(0.3, 1.5, 0.64, x + sx * 1.95, top - 0.45, z), C.stoneDark);
  }
}

/** Mountain peak rising out of the clouds: jagged, flat-shaded, colour fading into `mist` toward its foot. */
export function peak(b: Batch, rnd: () => number, x: number, z: number, baseY: number, topY: number, r: number, top: number, mist: number): void {
  const h = topY - baseY;
  const g = jitter(new THREE.CylinderGeometry(r * 0.07, r, h, 8, 6), r * 0.16, Math.floor(rnd() * 100));
  g.translate(x, baseY + h / 2, z);
  const cTop = new THREE.Color(top);
  const cBase = new THREE.Color(mist);
  b.addShaded(g, true, (_x, y, _z, _ny, out) => {
    out.copy(cBase).lerp(cTop, clamp01((y - baseY) / h) ** 0.8);
  });
}

/** Floating island: inverted rock with a moss top, a small hexagonal pavilion and a lantern. */
export function island(b: Batch, glow: Batch, rnd: () => number): void {
  const rock = jitter(new THREE.CylinderGeometry(2.6, 0.25, 4.2, 8, 4), 0.35, 7).translate(0, -2.1, 0);
  const moss = new THREE.Color(C.moss);
  const stone = new THREE.Color(C.rock);
  b.addShaded(rock, true, (_x, y, _z, ny, out) => {
    out.copy(ny > 0.6 && y > -0.4 ? moss : stone);
  });
  b.add(new THREE.CylinderGeometry(1.2, 1.3, 0.2, 6).translate(0.4, 0.1, 0), C.stoneLight, true);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5).translate(0.4 + Math.cos(a) * 0.95, 0.8, Math.sin(a) * 0.95), C.red);
  }
  b.add(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 6).translate(0.4, 1.38, 0), C.redDark, true);
  b.add(new THREE.ConeGeometry(1.5, 0.75, 6).translate(0.4, 1.8, 0), C.tile, true);
  b.add(new THREE.SphereGeometry(0.1, 6, 4).translate(0.4, 2.22, 0), C.gold);
  glow.add(new THREE.SphereGeometry(0.16, 8, 6).translate(0.4, 0.95, 0), C.lanternWarm);
  b.within(placeAt(-1.4, 0, 0.6, rnd() * 6, 0.55), () => pine(b, rnd, 1));
}

/** Banner pole with crossbar; the cloth (separate, animated) hangs from y = 4.15 between x = ±0.45. */
export function bannerPole(b: Batch): void {
  b.add(box(0.4, 0.3, 0.4, -0.5, 0.15, 0), C.stoneDark);
  b.add(new THREE.CylinderGeometry(0.05, 0.065, 4.5, 6).translate(-0.5, 2.25, 0), C.wood, true);
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 5).rotateZ(Math.PI / 2).translate(0, 4.2, 0), C.wood);
  b.add(new THREE.SphereGeometry(0.08, 6, 4).translate(-0.5, 4.55, 0), C.gold);
}
