import * as THREE from 'three';

export type ParticleKind = 'smoke' | 'qi' | 'mote';

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

    const baseLife = kind === 'smoke' ? 4.2 : kind === 'qi' ? 2.8 : 9;
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
        size[i] = 0.28 + u * 0.95;
        alpha[i] = fade * 0.3 * k;
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
