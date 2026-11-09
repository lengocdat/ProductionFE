import type { Fortune, Season } from './season';

/** Paper colours per lantern style: [rim, body, core]. Matches the ld-style-* rules in lantern.css. */
export const LANTERN_COLOURS: ReadonlyArray<readonly [string, string, string]> = [
  ['#9c3215', '#e8742c', '#ffd27a'], // hồng đăng
  ['#9a6a10', '#f0b43a', '#fff1b0'], // kim đăng
  ['#17664f', '#3fbf93', '#d4ffe9'], // ngọc đăng
  ['#5a2a8a', '#a86be0', '#f3e0ff'], // tử đăng
];
export const LANTERN_NAMES = ['Hồng đăng', 'Kim đăng', 'Ngọc đăng', 'Tử đăng'] as const;

const W = 1080;
const H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`image ${src}`));
    im.src = src;
  });
}

/** Greedy word wrap; returns at most maxLines lines, the last one ellipsised if cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

function drawLantern(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, style: number): void {
  const [rim, body, core] = LANTERN_COLOURS[style] ?? LANTERN_COLOURS[0]!;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(cx, cy + 20 * s, 20 * s, cx, cy, 300 * s);
  halo.addColorStop(0, 'rgba(255,190,100,0.75)');
  halo.addColorStop(0.35, 'rgba(255,160,70,0.3)');
  halo.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(cx - 320 * s, cy - 320 * s, 640 * s, 640 * s);
  ctx.restore();
  ctx.shadowColor = 'rgba(255,170,80,0.9)';
  ctx.shadowBlur = 60 * s;
  const w = 120 * s;
  const h = 160 * s;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.42, cy - h / 2);
  ctx.quadraticCurveTo(cx, cy - h * 0.62, cx + w * 0.42, cy - h / 2);
  ctx.quadraticCurveTo(cx + w * 0.62, cy, cx + w * 0.34, cy + h / 2);
  ctx.lineTo(cx - w * 0.34, cy + h / 2);
  ctx.quadraticCurveTo(cx - w * 0.62, cy, cx - w * 0.42, cy - h / 2);
  ctx.closePath();
  const paper = ctx.createRadialGradient(cx, cy + h * 0.25, 4 * s, cx, cy + h * 0.1, h * 0.75);
  paper.addColorStop(0, core);
  paper.addColorStop(0.45, body);
  paper.addColorStop(1, rim);
  ctx.fillStyle = paper;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(40,12,4,0.55)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + h / 2, w * 0.34, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff4c8';
  ctx.beginPath();
  ctx.ellipse(cx, cy + h / 2 - 4 * s, 7 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Renders the shareable "quẻ Thiên Đăng" card as a PNG blob. */
export async function renderCard(season: Season, name: string, wish: string, style: number, fortune: Fortune): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  await document.fonts?.load('700 60px "Cormorant Garamond"').catch(() => undefined);
  const sky = await loadImage(season.sky);
  // Cover-fit the 16:9 painting into the 4:5 card.
  const scale = Math.max(W / sky.width, H / sky.height);
  const sw = sky.width * scale;
  const sh = sky.height * scale;
  ctx.drawImage(sky, (W - sw) / 2, (H - sh) / 2, sw, sh);
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(6,8,18,0.35)');
  shade.addColorStop(0.45, 'rgba(6,8,18,0.25)');
  shade.addColorStop(1, 'rgba(8,6,4,0.9)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  drawLantern(ctx, W / 2, 330, 1.35, style);

  const title = '"Cormorant Garamond", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe4a8';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 12;
  ctx.font = `600 34px ${title}`;
  ctx.fillText(season.eyebrow.toUpperCase(), W / 2, 92);
  ctx.font = `700 58px ${title}`;
  ctx.fillText(`Thiên Đăng của ${name}`, W / 2, 610);

  ctx.font = `italic 600 46px ${title}`;
  ctx.fillStyle = '#fff6e0';
  const lines = wrap(ctx, `“${wish}”`, W - 180, 3);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 700 + i * 58));

  // The fortune box hugs its text and sits just above the footer.
  ctx.shadowBlur = 0;
  ctx.font = '400 32px Georgia, serif';
  const fortuneLines = wrap(ctx, fortune.text, W - 260, 4);
  const boxH = 150 + fortuneLines.length * 44;
  const boxY = H - 120 - boxH;
  ctx.fillStyle = 'rgba(20,12,8,0.72)';
  ctx.strokeStyle = 'rgba(236,201,120,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(90, boxY, W - 180, boxH, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ecc978';
  ctx.font = `700 40px ${title}`;
  ctx.fillText(`Quẻ Thiên Đăng · ${fortune.rank}`, W / 2, boxY + 66);
  ctx.fillStyle = '#f3e6cc';
  ctx.font = '400 32px Georgia, serif';
  fortuneLines.forEach((l, i) => ctx.fillText(l, W / 2, boxY + 122 + i * 44));

  // Georgia here: the title face's old-style figures would turn a port or year into "3ooo".
  ctx.fillStyle = 'rgba(255,240,210,0.85)';
  ctx.font = 'italic 400 28px Georgia, serif';
  ctx.fillText(`Thả đèn ước nguyện tại ${location.host}/tha-den`, W / 2, H - 52);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}
