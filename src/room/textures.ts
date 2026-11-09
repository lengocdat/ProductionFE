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

function makeCanvas(width: number, height = width): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
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

/** Grain, chips and hairline cracks shared by every stone surface. */
function weather(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, specks: number, cracks: number): void {
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = rnd() > 0.5 ? `rgba(255,252,240,${0.03 + rnd() * 0.06})` : `rgba(20,18,16,${0.04 + rnd() * 0.08})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  ctx.strokeStyle = 'rgba(40,36,32,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < cracks; i++) {
    let x = 8 + rnd() * (w - 16);
    let y = 8 + rnd() * (h - 16);
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x = Math.min(w - 4, Math.max(4, x + (rnd() - 0.5) * 20));
      y = Math.min(h - 4, Math.max(4, y + (rnd() - 0.5) * 20));
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** One bevelled slab: base fill, soft light-to-shadow gradient, lit top/left edge, dark bottom/right edge. */
function slab(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, 'rgba(255,250,235,0.08)');
  grad.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,250,235,0.14)';
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y, 2, h);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(x, y + h - 2, w, 2);
  ctx.fillRect(x + w - 2, y, 2, h);
}

/** Pale grey running-bond flagstones; one tile covers 4 m x 4 m of courtyard. Tiles seamlessly. */
export function makeGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const row = size / 4;
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(20240611);
  ctx.fillStyle = '#5c554e';
  ctx.fillRect(0, 0, size, size);
  for (let r = 0; r < 4; r++) {
    // Slab widths per row sum to the tile width so rows wrap; the offset staggers the joints.
    const widths: number[] = [];
    let left = size;
    while (left > 0) {
      const wdt = left < 200 ? left : 96 + Math.floor(rnd() * 4) * 32;
      widths.push(wdt);
      left -= wdt;
    }
    let x = (r % 2) * 64 + Math.floor(rnd() * 2) * 32;
    for (const wdt of widths) {
      const fill = `hsl(${30 + rnd() * 14} ${6 + rnd() * 6}% ${60 + rnd() * 9}%)`;
      for (const ox of [0, -size]) slab(ctx, x + ox + 2, r * row + 2, wdt - 4, row - 4, fill);
      x += wdt;
    }
  }
  weather(ctx, size, size, rnd, 1600, 6);
  // Moss in a few joints.
  for (let i = 0; i < 10; i++) {
    const cx = Math.floor(rnd() * 4) * row;
    const cy = rnd() * size;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14 + rnd() * 12);
    g.addColorStop(0, 'rgba(96,128,80,0.35)');
    g.addColorStop(1, 'rgba(96,128,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 30, cy - 30, 60, 60);
  }
  const tex = finish(canvas, true);
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

/** Thần đạo: large warm slabs between two kerbs; one tile = 3 m wide x 3 m long, repeat along v. */
export function makePathTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(5150);
  ctx.fillStyle = '#3c3936';
  ctx.fillRect(0, 0, size, size);
  const kerb = 22;
  for (let y = 0; y < size; y += 32) {
    for (const x of [0, size - kerb]) slab(ctx, x + 1, y + 1, kerb - 2, 30, `hsl(28 6% ${40 + rnd() * 6}%)`);
  }
  for (let y = 0; y < size; y += size / 2) {
    slab(ctx, kerb + 3, y + 3, size - kerb * 2 - 6, size / 2 - 6, `hsl(${28 + rnd() * 10} 9% ${60 + rnd() * 6}%)`);
  }
  weather(ctx, size, size, rnd, 700, 3);
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

/** Trigram lines from the centre outward (bottom to top); 1 = yang (solid), 0 = yin (broken). Tiên thiên order. */
const TRIGRAMS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 1, 1], [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1], [1, 1, 0],
];

/**
 * Bát quái disc carved into the courtyard, mapped 1:1 onto a CircleGeometry of radius R.
 * Rings sit under the seat circles (inner at 0.37 R, outer at 0.79 R when R = 7 m).
 * `glow` draws the same grooves in white only, for an additive linh mạch overlay.
 */
export function makeTaijiTexture(glow: boolean): THREE.CanvasTexture {
  const size = 1024;
  const c = size / 2;
  const R = size / 2;
  const { canvas, ctx } = makeCanvas(size);
  const groove = glow ? 'rgba(255,255,255,0.9)' : 'rgba(38,34,30,0.6)';
  const lit = glow ? '' : 'rgba(255,250,235,0.25)';
  const carve = (width: number, path: () => void): void => {
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (lit) {
      ctx.save();
      ctx.translate(1.5, 2);
      ctx.strokeStyle = lit;
      ctx.beginPath();
      path();
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = groove;
    ctx.beginPath();
    path();
    ctx.stroke();
  };
  const ring = (r: number, width: number): void => carve(width, () => ctx.arc(c, c, r * R, 0, Math.PI * 2));

  if (!glow) {
    ctx.fillStyle = 'rgba(60,56,52,0.32)';
    ctx.beginPath();
    ctx.arc(c, c, 0.985 * R, 0, Math.PI * 2);
    ctx.fill();
    for (const [r0, r1] of [[0.32, 0.42], [0.73, 0.85]] as const) {
      ctx.fillStyle = 'rgba(236,228,210,0.2)';
      ctx.beginPath();
      ctx.arc(c, c, r1 * R, 0, Math.PI * 2);
      ctx.arc(c, c, r0 * R, 0, Math.PI * 2, true);
      ctx.fill();
    }
  }
  for (const r of [0.985, 0.94, 0.85, 0.73, 0.42, 0.32]) ring(r, r > 0.9 ? 7 : 5);

  // Eight trigrams between the seat circles, tangential bars; yin bars have a gap.
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4;
    const lines = TRIGRAMS[k] as readonly [number, number, number];
    lines.forEach((yang, li) => {
      const r = (0.5 + li * 0.075) * R;
      const half = 0.16;
      if (yang) carve(16, () => ctx.arc(c, c, r, a - half, a + half));
      else {
        carve(16, () => ctx.arc(c, c, r, a - half, a - 0.035));
        carve(16, () => ctx.arc(c, c, r, a + 0.035, a + half));
      }
    });
    const b = a + Math.PI / 8;
    carve(4, () => {
      ctx.moveTo(c + Math.cos(b) * 0.46 * R, c + Math.sin(b) * 0.46 * R);
      ctx.lineTo(c + Math.cos(b) * 0.69 * R, c + Math.sin(b) * 0.69 * R);
    });
  }

  // Thái cực at the heart.
  const r = 0.2 * R;
  ctx.fillStyle = glow ? 'rgba(255,255,255,0.18)' : 'rgba(30,28,26,0.5)';
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = glow ? 'rgba(255,255,255,0.75)' : 'rgba(240,234,220,0.55)';
  ctx.beginPath();
  ctx.arc(c, c, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.arc(c, c + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(c, c - r / 2, r / 2, Math.PI / 2, (3 * Math.PI) / 2, false);
  ctx.fill();
  for (const [dy, light] of [[-r / 2, false], [r / 2, true]] as const) {
    // The upper dot sits in the light half (so it is dark), the lower one in the dark half.
    if (glow) ctx.fillStyle = light ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)';
    else ctx.fillStyle = light ? 'rgba(240,234,220,0.6)' : 'rgba(30,28,26,0.7)';
    ctx.beginPath();
    ctx.arc(c, c + dy, r / 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ring(0.2, 5);
  return finish(canvas, false);
}

const SERIF = '"Noto Serif", "Times New Roman", Georgia, serif';

/** Largest font (px) not wider than maxW for this text. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, start: number, maxW: number): number {
  let px = start;
  for (; px > 8; px -= 2) {
    ctx.font = `${weight} ${px}px ${SERIF}`;
    if (ctx.measureText(text).width <= maxW) break;
  }
  return px;
}

/** Lacquered board with a gold frame and gilded characters (hall and gate plaques). */
export function makePlaqueTexture(text: string): THREE.CanvasTexture {
  const w = 512;
  const h = 160;
  const { canvas, ctx } = makeCanvas(w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#4a1c14');
  bg.addColorStop(1, '#22100b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#d9b25a';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, w - 10, h - 10);
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.fillStyle = '#d9b25a';
  for (const [x, y] of [[18, 18], [w - 18, 18], [18, h - 18], [w - 18, h - 18]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  const px = fitFont(ctx, text, 700, 84, w - 70);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  const g = ctx.createLinearGradient(0, h / 2 - px / 2, 0, h / 2 + px / 2);
  g.addColorStop(0, '#fff3c0');
  g.addColorStop(1, '#d9a443');
  ctx.fillStyle = g;
  ctx.fillText(text, w / 2, h / 2 + px * 0.06);
  return finish(canvas, false);
}

/** Carved face of the Bia tông quy: title plus the five (very serious) sect rules. */
export function makeSteleTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(31);
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#77807f');
  bg.addColorStop(1, '#535b5c');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  weather(ctx, w, h, rnd, 900, 4);
  const carveText = (text: string, y: number, px: number, weight: number): void => {
    ctx.font = `${weight} ${fitFont(ctx, text, weight, px, w - 40)}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,245,0.28)';
    ctx.fillText(text, w / 2 + 1, y + 1.5);
    ctx.fillStyle = 'rgba(28,26,24,0.85)';
    ctx.fillText(text, w / 2, y);
  };
  ctx.strokeStyle = 'rgba(30,28,26,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  carveText('TÔNG QUY', 62, 40, 700);
  ctx.fillStyle = 'rgba(30,28,26,0.5)';
  ctx.fillRect(40, 96, w - 80, 2);
  const rules = ['Nhất: cẩu được thì cẩu', 'Nhị: ngồi lâu tự mạnh', 'Tam: không tranh không cướp', 'Tứ: thấy nguy thì chạy', 'Ngũ: sống lâu là thắng'];
  rules.forEach((line, i) => carveText(line, 150 + i * 62, 22, 600));
  carveText('Cẩu Đạo Tông', h - 46, 20, 700);
  return finish(canvas, false);
}

/** Crimson sect banner with a gold thái cực emblem and swallow-tail hem; transparent outside the cloth. */
export function makeBannerTexture(): THREE.CanvasTexture {
  const w = 128;
  const h = 320;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, h - 40);
  for (let i = 0; i < 3; i++) {
    const x1 = w - (i * w) / 3;
    ctx.lineTo(x1 - w / 6, h);
    ctx.lineTo(x1 - w / 3, h - 40);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#7a1414');
  g.addColorStop(0.5, '#a82222');
  g.addColorStop(1, '#6a1010');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#e0b658';
  ctx.lineWidth = 5;
  ctx.strokeRect(9, 9, w - 18, h - 62);
  const cx = w / 2;
  const cy = 70;
  const r = 30;
  ctx.fillStyle = '#e8c46a';
  ctx.beginPath();
  ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a0e0e';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8c46a';
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.arc(cx, cy + r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true);
  ctx.arc(cx, cy - r / 2, r / 2, Math.PI / 2, (3 * Math.PI) / 2, false);
  ctx.fill();
  ctx.font = `700 ${fitFont(ctx, 'Đạo', 700, 52, w - 30)}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Đạo', cx, 168);
  ctx.fillRect(28, 214, w - 56, 3);
  ctx.font = `600 ${fitFont(ctx, 'Cẩu Đạo', 600, 22, w - 30)}px ${SERIF}`;
  ctx.fillText('Cẩu Đạo', cx, 240);
  return finish(canvas, false);
}

/** Puffy cloud sprite, white on transparent, twice as wide as tall. */
export function makeCloudTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 128;
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(808);
  for (let i = 0; i < 14; i++) {
    const x = 40 + rnd() * (w - 80);
    const r = 20 + rnd() * 30 * (1 - Math.abs(x - w / 2) / w);
    const y = h * 0.62 - rnd() * r * 0.6;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  return finish(canvas, false);
}

/** Tileable sea of clouds seen from above; `base` fills the gaps, `puff` is the cloud colour. */
export function makeCloudSeaTexture(base: string | null, puff: string, seed: number): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  const rnd = mulberry32(seed);
  if (base) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
  }
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 18 + rnd() * 80;
    const a = 0.08 + rnd() * 0.22;
    for (const oy of [-size, 0, size]) {
      for (const ox of [-size, 0, size]) {
        const cx = x + ox;
        const cy = y + oy;
        if (cx + r < 0 || cx - r > size || cy + r < 0 || cy - r > size) continue;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, puff.replace('A', String(a)));
        g.addColorStop(1, puff.replace('A', '0'));
        ctx.fillStyle = g;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
  }
  return finish(canvas, true);
}

/** Vertical white streaks, tileable along v; scrolled downward for falling water. */
export function makeWaterfallTexture(): THREE.CanvasTexture {
  const w = 64;
  const h = 256;
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(64);
  ctx.fillStyle = 'rgba(170,210,230,0.25)';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 30 + rnd() * 90;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + rnd() * 0.5})`;
    const lw = 1 + rnd() * 2.5;
    ctx.fillRect(x, y, lw, len);
    if (y + len > h) ctx.fillRect(x, y - h, lw, len);
  }
  return finish(canvas, true);
}

/** Vertical fade for light pillars: opaque at the bottom (v = 0), clear at the top. */
export function makeBeamTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(16, 128);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0.9)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 128);
  return finish(canvas, false);
}
