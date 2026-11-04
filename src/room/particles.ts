import * as THREE from 'three';

/** smoke: thin incense wisps · qi: seated spirals · mote: courtyard fireflies · petal: falling peach petals · mist: low drifting fog banks */
export type ParticleKind = 'smoke' | 'qi' | 'mote' | 'petal' | 'mist';

const VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
uniform sampler2D uMap;
varying float vAlpha;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`;

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** mote: the w x d area from the origin of the world; mist: a w x d box centred on each emitter. */
export interface ParticleBounds { w: number; d: number }

/**
 * Analytic GPU-point particle field: a particle's pose is a pure function of (time, index),
 * so updating costs one pass over typed arrays and allocates nothing.
 * Particle i belongs to emitter floor(i / perEmitter); `intensity[e]` 0..1 fades an emitter in/out.
 */
export class ParticleField {
  readonly points: THREE.Points;
  /** xyz per emitter */
  readonly origins: Float32Array;
  readonly intensity: Float32Array;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly pos: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly life: Float32Array;
  private readonly phase: Float32Array;
  private readonly count: number;

  constructor(
    private readonly kind: ParticleKind,
    private readonly emitters: number,
    private readonly perEmitter: number,
    map: THREE.Texture,
    color: number,
    additive: boolean,
    private readonly bounds: ParticleBounds | null = null,
  ) {
    this.count = emitters * perEmitter;
    this.origins = new Float32Array(emitters * 3);
    this.intensity = new Float32Array(emitters);
    this.pos = new Float32Array(this.count * 3);
    this.size = new Float32Array(this.count);
    this.alpha = new Float32Array(this.count);
    this.life = new Float32Array(this.count);
    this.phase = new Float32Array(this.count);

    const baseLife = kind === 'smoke' ? 4.6 : kind === 'qi' ? 2.8 : kind === 'petal' ? 7 : kind === 'mist' ? 18 : 9;
    for (let i = 0; i < this.count; i++) {
      this.life[i] = baseLife * (0.75 + hash(i * 3.1) * 0.5);
      this.phase[i] = ((i % perEmitter) / perEmitter) + hash(i * 1.7) * 0.15;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uScale: { value: 600 },
        uColor: { value: new THREE.Color(color) },
        uMap: { value: map },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  /** Call on resize: pixels per world unit at distance 1. */
  setScale(drawingBufferHeight: number, fovDeg: number): void {
    const u = this.material.uniforms.uScale;
    if (u) u.value = drawingBufferHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  update(time: number): void {
    const { pos, size, alpha, life, phase, perEmitter, origins, intensity, kind } = this;
    for (let i = 0; i < this.count; i++) {
      const e = (i / perEmitter) | 0;
      const k = intensity[e] ?? 0;
      if (k < 0.01) {
        alpha[i] = 0;
        continue;
      }
      const l = life[i] ?? 3;
      const raw = time / l + (phase[i] ?? 0);
      const cycle = Math.floor(raw);
      const u = raw - cycle;
      const r1 = hash(i * 12.9 + cycle * 1.37);
      const r2 = hash(i * 4.7 + cycle * 3.11);
      const ox = origins[e * 3] ?? 0;
      const oy = origins[e * 3 + 1] ?? 0;
      const oz = origins[e * 3 + 2] ?? 0;
      const fade = Math.sin(Math.PI * u);
      const p = i * 3;

      if (kind === 'qi') {
        const a = r1 * 6.2832 + u * l * 1.5;
        const rad = 0.72 - 0.42 * u;
        pos[p] = ox + Math.cos(a) * rad;
        pos[p + 1] = oy + 0.1 + u * (1.2 + r2 * 0.7);
        pos[p + 2] = oz + Math.sin(a) * rad;
        size[i] = 0.17 * (1 - 0.45 * u) * (0.7 + r2 * 0.6);
        alpha[i] = fade * 0.95 * k;
      } else if (kind === 'smoke') {
        const sway = Math.sin(time * 0.7 + r1 * 6.2832) * 0.16 * u;
        pos[p] = ox + sway + u * 0.18;
        pos[p + 1] = oy + u * (2.1 + r2 * 0.6);
        pos[p + 2] = oz + Math.cos(time * 0.55 + r2 * 6.2832) * 0.14 * u;
        size[i] = 0.14 + u * 0.75;
        alpha[i] = fade * 0.3 * k;
      } else if (kind === 'petal') {
        // Shed inside the canopy, flutter down and drift downwind to the flagstones.
        const a = r1 * 6.2832;
        const rad = Math.sqrt(r2) * 1.5;
        const fall = Math.min(1, u * 1.15);
        pos[p] = ox + Math.cos(a) * rad + u * 2.2 + Math.sin(time * 2.3 + i) * 0.18;
        pos[p + 1] = Math.max(0.03, oy - 0.4 + (r2 - 0.5) * 0.6 - fall * oy);
        pos[p + 2] = oz + Math.sin(a) * rad + u * 0.8 + Math.cos(time * 1.9 + i * 1.3) * 0.15;
        size[i] = 0.08 + r2 * 0.05;
        alpha[i] = Math.min(1, fade * 3) * 0.9 * k;
      } else if (kind === 'mist') {
        const b = this.bounds;
        const w = b ? b.w : 20;
        const d = b ? b.d : 20;
        pos[p] = ox + (r1 - 0.5) * w + u * 3;
        pos[p + 1] = oy + r2 * 0.5;
        pos[p + 2] = oz + (hash(i * 9.3 + cycle * 2.9) - 0.5) * d;
        size[i] = 3.2 + r2 * 2.6;
        alpha[i] = fade * 0.13 * k;
      } else {
        const b = this.bounds;
        const w = b ? b.w : 20;
        const d = b ? b.d : 20;
        pos[p] = r1 * w + Math.sin(time * 0.3 + i) * 0.7;
        pos[p + 1] = 0.5 + r2 * 2.2 + Math.sin(time * 0.5 + i * 2.1) * 0.25 + u * 0.4;
        pos[p + 2] = hash(i * 9.3 + cycle * 2.9) * d + Math.cos(time * 0.27 + i) * 0.7;
        size[i] = 0.1 + r2 * 0.08;
        alpha[i] = fade * (0.55 + 0.45 * Math.sin(time * 2.2 + i * 1.9)) * 0.8 * k;
      }
    }
    const attrs = this.geometry.attributes;
    (attrs.position as THREE.BufferAttribute).needsUpdate = true;
    (attrs.aSize as THREE.BufferAttribute).needsUpdate = true;
    (attrs.aAlpha as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

const BURST_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const BURST_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying float vAlpha;
varying vec3 vColor;
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
}`;

/** puff: billowing smoke ball · spark: embers thrown out under gravity · glint: golden sparkles drifting up */
export type BurstKind = 'puff' | 'spark' | 'glint';
const BURST_LIFE: Record<BurstKind, number> = { puff: 2.6, spark: 1.3, glint: 1.8 };

/**
 * One-shot particle bursts for spot effects, from a fixed ring-buffer pool.
 * A particle's pose is a pure function of its spawn record and the time; nothing allocates after construction.
 */
export class BurstField {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private readonly geometry: THREE.BufferGeometry;
  private readonly pos: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly color: Float32Array;
  /** per particle: t0, life, ox, oy, oz, vx, vy, vz, kind */
  private readonly rec: Float32Array;
  private next = 0;
  private liveUntil = 0;
  private readonly tmpColor = new THREE.Color();

  constructor(private readonly count: number, map: THREE.Texture, additive: boolean) {
    this.pos = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    this.color = new Float32Array(count * 3);
    this.rec = new Float32Array(count * 9).fill(-1e9);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.color, 3).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uMap: { value: map } },
      vertexShader: BURST_VERT,
      fragmentShader: BURST_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 11;
    this.points.visible = false;
  }

  setScale(drawingBufferHeight: number, fovDeg: number): void {
    const u = this.material.uniforms.uScale;
    if (u) u.value = drawingBufferHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
  }

  /** Emits `n` particles of `kind` from (x, y, z); `spread` scales the launch speed. */
  emit(kind: BurstKind, x: number, y: number, z: number, n: number, color: number, spread: number, time: number): void {
    const code = kind === 'puff' ? 0 : kind === 'spark' ? 1 : 2;
    const c = this.tmpColor.setHex(color);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const up = Math.random();
      const life = BURST_LIFE[kind] * (0.7 + Math.random() * 0.6);
      const r = this.rec;
      const o = i * 9;
      r[o] = time + Math.random() * 0.12;
      r[o + 1] = life;
      r[o + 2] = x;
      r[o + 3] = y;
      r[o + 4] = z;
      const h = spread * (kind === 'spark' ? 2.6 : kind === 'puff' ? 0.9 : 0.5) * (0.4 + Math.random() * 0.6);
      r[o + 5] = Math.cos(a) * h;
      r[o + 6] = kind === 'spark' ? 2.5 + up * 3 : kind === 'puff' ? 0.6 + up * 1.2 : 0.5 + up * 0.9;
      r[o + 7] = Math.sin(a) * h;
      r[o + 8] = code;
      const shade = kind === 'puff' ? 0.8 + Math.random() * 0.3 : 1;
      this.color[i * 3] = c.r * shade;
      this.color[i * 3 + 1] = c.g * shade;
      this.color[i * 3 + 2] = c.b * shade;
      this.liveUntil = Math.max(this.liveUntil, time + life + 0.2);
    }
    this.points.visible = true;
  }

  update(time: number): void {
    if (!this.points.visible) return;
    if (time > this.liveUntil) {
      this.points.visible = false;
      return;
    }
    const { pos, size, alpha, rec } = this;
    for (let i = 0; i < this.count; i++) {
      const o = i * 9;
      const t = time - (rec[o] ?? 0);
      const life = rec[o + 1] ?? 1;
      if (t < 0 || t > life) {
        alpha[i] = 0;
        continue;
      }
      const u = t / life;
      const code = rec[o + 8] ?? 0;
      const p = i * 3;
      // Puffs and glints decelerate (ease-out); sparks fly ballistically.
      const ease = code === 1 ? t : life * (1 - (1 - u) * (1 - u)) * 0.5;
      pos[p] = (rec[o + 2] ?? 0) + (rec[o + 5] ?? 0) * ease;
      pos[p + 1] = Math.max(0.05, (rec[o + 3] ?? 0) + (rec[o + 6] ?? 0) * ease - (code === 1 ? 4.9 * t * t : 0));
      pos[p + 2] = (rec[o + 4] ?? 0) + (rec[o + 7] ?? 0) * ease;
      if (code === 0) {
        size[i] = 0.5 + u * 1.6;
        alpha[i] = Math.sin(Math.PI * Math.min(1, u * 1.4 + 0.08)) * 0.55;
      } else if (code === 1) {
        size[i] = 0.12 * (1 - u * 0.6);
        alpha[i] = 1 - u;
      } else {
        size[i] = 0.16 * (0.6 + Math.sin(t * 14 + i) * 0.4);
        alpha[i] = Math.sin(Math.PI * u);
      }
    }
    const attrs = this.geometry.attributes;
    (attrs.position as THREE.BufferAttribute).needsUpdate = true;
    (attrs.aSize as THREE.BufferAttribute).needsUpdate = true;
    (attrs.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (attrs.aColor as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
