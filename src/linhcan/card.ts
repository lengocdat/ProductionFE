import { ROOTS, type Root } from './quiz';

const W = 1080;
const H = 1350;
const TITLE = '"Cormorant Garamond", Georgia, serif';
const BODY = 'Georgia, serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`image ${src}`));
    image.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width || !line) line = next;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function row(ctx: CanvasRenderingContext2D, label: string, value: string, y: number, tint: string): number {
  ctx.textAlign = 'left';
  ctx.fillStyle = tint;
  ctx.font = `700 40px ${TITLE}`;
  ctx.fillText(label, 110, y);
  ctx.fillStyle = '#fbf1dc';
  ctx.font = `400 38px ${BODY}`;
  const lines = wrap(ctx, value, W - 220);
  lines.forEach((line, i) => ctx.fillText(line, 110, y + 52 + i * 48));
  return y + 52 + lines.length * 48 + 30;
}

/** Draws the shareable result as a 4:5 PNG. Nothing here leaves the device unless the visitor shares it. */
export async function renderLinhCanCard(root: Root, name: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  await document.fonts?.load(`700 60px "Cormorant Garamond"`, 'Linh Căn đạo hữu').catch(() => undefined);
  const sky = await loadImage('/ui/bg-join.jpg');
  const scale = Math.max(W / sky.width, H / sky.height);
  ctx.drawImage(sky, (W - sky.width * scale) / 2, (H - sky.height * scale) / 2, sky.width * scale, sky.height * scale);
  const shade = ctx.createLinearGradient(0, 0, 0, H);
  shade.addColorStop(0, 'rgba(6,8,18,0.62)');
  shade.addColorStop(0.5, 'rgba(6,8,18,0.8)');
  shade.addColorStop(1, 'rgba(6,5,6,0.96)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = root.tint;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, W - 96, H - 96);
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ecc978';
  ctx.font = `600 36px ${TITLE}`;
  ctx.fillText(`Linh căn của ${name}`, W / 2, 138);

  ctx.fillStyle = root.tint;
  ctx.shadowColor = root.tint;
  ctx.shadowBlur = 34;
  ctx.font = `700 104px ${TITLE}`;
  ctx.fillText(root.name, W / 2, 262);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff6e0';
  ctx.font = `600 58px ${TITLE}`;
  ctx.fillText(root.school, W / 2, 340);

  ctx.fillStyle = '#fbf1dc';
  ctx.font = `italic 400 41px ${BODY}`;
  const verdict = wrap(ctx, root.verdict, W - 200);
  verdict.forEach((line, i) => ctx.fillText(line, W / 2, 428 + i * 54));

  let y = 428 + verdict.length * 54 + 44;
  y = row(ctx, 'Thần thông', root.skill, y, root.tint);
  y = row(ctx, 'Tử huyệt', root.weakness, y, root.tint);
  const mate = ROOTS[root.mate];
  const nemesis = ROOTS[root.nemesis];
  y = row(ctx, 'Hợp tu với', `${mate.name} ${mate.school}`, y, root.tint);
  row(ctx, 'Khắc tinh', `${nemesis.name} ${nemesis.school}`, y, root.tint);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ecc978';
  ctx.font = `600 36px ${BODY}`;
  ctx.fillText(`Linh căn của bạn là gì? ${location.host}/linh-can`, W / 2, H - 112);
  ctx.fillStyle = 'rgba(255,240,210,0.7)';
  ctx.font = `italic 400 25px ${BODY}`;
  ctx.fillText('Trò đùa cho vui, không phải bói toán', W / 2, H - 70);

  return new Promise((resolve, reject) => canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob'))), 'image/png'));
}
