import * as THREE from 'three';

/** Deterministic PRNG so the courtyard looks identical for every visitor. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available');
  return { canvas, ctx };
}

function finish(canvas: HTMLCanvasElement, repeat: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

/** 4x4 stone slabs per tile; one tile covers 4 m x 4 m of courtyard. */
export function makeGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const cell = size / 4;
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(20240611);

  ctx.fillStyle = '#0d1918';
  ctx.fillRect(0, 0, size, size);

  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const x = gx * cell + 3;
      const y = gy * cell + 3;
      const w = cell - 6;
      const light = 24 + rnd() * 7;
      const hue = 168 + rnd() * 14;
      const sat = 10 + rnd() * 8;
      ctx.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;
      ctx.fillRect(x, y, w, w);
      const grad = ctx.createLinearGradient(x, y, x + w, y + w);
      grad.addColorStop(0, 'rgba(255,248,220,0.07)');
      grad.addColorStop(1, 'rgba(0,0,0,0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, w);
      ctx.fillStyle = 'rgba(235,225,190,0.10)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillRect(x, y, 2, w);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + w - 2, w, 2);
      ctx.fillRect(x + w - 2, y, 2, w);
    }
  }

  for (let i = 0; i < 1400; i++) {
    const light = rnd() > 0.5;
    ctx.fillStyle = light ? `rgba(220,235,225,${0.03 + rnd() * 0.07})` : `rgba(0,0,0,${0.05 + rnd() * 0.1})`;
    ctx.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
  }

  for (let i = 0; i < 9; i++) {
    const cx = 24 + rnd() * (size - 48);
    const cy = 24 + rnd() * (size - 48);
    const r = 10 + rnd() * 18;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(92,150,96,0.28)');
    g.addColorStop(1, 'rgba(92,150,96,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  ctx.strokeStyle = 'rgba(8,16,15,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 7; i++) {
    let x = 12 + rnd() * (size - 24);
    let y = 12 + rnd() * (size - 24);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x = Math.min(size - 6, Math.max(6, x + (rnd() - 0.5) * 22));
      y = Math.min(size - 6, Math.max(6, y + (rnd() - 0.5) * 22));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = finish(canvas, true);
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

/** Soft round sprite. Stops are [offset 0..1, css colour]. */
export function makeRadialTexture(stops: ReadonlyArray<readonly [number, string]>): THREE.CanvasTexture {
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return finish(canvas, false);
}

/** Deep-teal water surface; mapped 1:1 onto a CircleGeometry. */
export function makePondTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const g = ctx.createRadialGradient(size * 0.45, size * 0.42, 4, size / 2, size / 2, size / 2);
  g.addColorStop(0, '#3a8a86');
  g.addColorStop(0.6, '#1f5b5f');
  g.addColorStop(1, '#10353a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return finish(canvas, false);
}

/** Tileable ripple/sparkle overlay; the scene scrolls its offset for the shimmer. */
export function makeRippleTexture(): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(777);
  ctx.lineCap = 'round';
  const wrapped = (draw: (ox: number, oy: number) => void): void => {
    for (const oy of [-size, 0, size]) for (const ox of [-size, 0, size]) draw(ox, oy);
  };
  for (let i = 0; i < 16; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const rx = 10 + rnd() * 26;
    const ry = rx * (0.3 + rnd() * 0.25);
    const a = 0.12 + rnd() * 0.25;
    wrapped((ox, oy) => {
      ctx.strokeStyle = `rgba(190,240,230,${a})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, rx, ry, 0, 0.2, Math.PI * 0.9);
      ctx.stroke();
    });
  }
  for (let i = 0; i < 46; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 0.8 + rnd() * 1.8;
    const a = 0.25 + rnd() * 0.5;
    wrapped((ox, oy) => {
      ctx.fillStyle = `rgba(255,244,214,${a})`;
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return finish(canvas, true);
}
