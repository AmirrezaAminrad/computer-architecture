import { COL, E, H, W, clamp, hash, lerp, prog, rgba } from './util';

export const DISPLAY = '"Space Grotesk","Helvetica Neue",Arial,sans-serif';
export const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,monospace';

type Ctx = CanvasRenderingContext2D;

export function setFont(ctx: Ctx, size: number, weight: number | string = 700, family = DISPLAY) {
  ctx.font = `${weight} ${size}px ${family}`;
}

interface TextOpts {
  size?: number;
  weight?: number | string;
  family?: string;
  color?: string;
  align?: CanvasTextAlign;
  alpha?: number;
  track?: number;
}

export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts = {}) {
  ctx.save();
  setFont(ctx, o.size ?? 24, o.weight ?? 500, o.family ?? MONO);
  ctx.fillStyle = o.color ?? COL.white;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha *= o.alpha ?? 1;
  if (o.track && 'letterSpacing' in ctx) (ctx as any).letterSpacing = `${o.track}px`;
  ctx.fillText(s, x, y);
  ctx.restore();
}

export function fitSize(ctx: Ctx, s: string, maxW: number, maxSize: number, weight = 700, family = DISPLAY) {
  ctx.save();
  setFont(ctx, 100, weight, family);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return Math.min(maxSize, (100 * maxW) / w);
}

interface RevealOpts {
  start: number;
  stagger: number;
  dur: number;
  fill?: string;
  stroke?: string;
  lw?: number;
  align?: 'left' | 'center';
  weight?: number | string;
  family?: string;
  dir?: 1 | -1;
  dx?: number;
}

/** Per-character masked slide-up reveal. Returns text width. */
export function revealChars(ctx: Ctx, s: string, x: number, baseY: number, size: number, t: number, o: RevealOpts) {
  ctx.save();
  setFont(ctx, size, o.weight ?? 700, o.family ?? DISPLAY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const total = ctx.measureText(s).width;
  const x0 = (o.align === 'center' ? x - total / 2 : x) + (o.dx ?? 0);
  ctx.beginPath();
  ctx.rect(x0 - 30, baseY - size * 0.95, total + 60, size * 1.22);
  ctx.clip();
  ctx.lineJoin = 'round';
  for (let i = 0; i < s.length; i++) {
    const p = E.outExpo(prog(t, o.start + i * o.stagger, o.dur));
    if (p <= 0.001) continue;
    const px = x0 + ctx.measureText(s.slice(0, i)).width;
    const dy = (1 - p) * size * 1.15 * (o.dir ?? 1);
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fillText(s[i], px, baseY + dy);
    }
    if (o.stroke) {
      ctx.strokeStyle = o.stroke;
      ctx.lineWidth = o.lw ?? 3;
      ctx.strokeText(s[i], px, baseY + dy);
    }
  }
  ctx.restore();
  return total;
}

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if ((ctx as any).roundRect) (ctx as any).roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Multi-pass neon stroke. `path` must build the path (beginPath + segments). */
export function glow(ctx: Ctx, color: string, width: number, alpha: number, path: () => void) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const passes: Array<[number, number]> = [
    [width * 7, 0.07],
    [width * 3.2, 0.15],
    [width, 1],
  ];
  for (const [w, a] of passes) {
    ctx.lineWidth = w;
    ctx.strokeStyle = rgba(color, a * alpha);
    path();
    ctx.stroke();
  }
  ctx.restore();
}

export function glowDot(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, rgba('#ffffff', alpha));
  g.addColorStop(0.18, rgba(color, 0.9 * alpha));
  g.addColorStop(0.5, rgba(color, 0.18 * alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.restore();
}

export type Pt = [number, number];

export function polyLen(pts: Pt[]) {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

export function polyPath(ctx: Ctx, pts: Pt[], frac = 1) {
  let rem = polyLen(pts) * clamp(frac);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (rem >= seg) {
      ctx.lineTo(pts[i][0], pts[i][1]);
      rem -= seg;
    } else {
      const k = rem / seg;
      ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k));
      break;
    }
  }
}

export function pointAlong(pts: Pt[], d: number): Pt {
  let rem = d;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (rem <= seg) {
      const k = rem / seg;
      return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)];
    }
    rem -= seg;
  }
  return pts[pts.length - 1];
}

// ───────────────────────── Shared scene furniture ─────────────────────────

/** animated blueprint background */
export function bg(ctx: Ctx, g: number, accent: string, glowX = 0.7, glowY = 0.35) {
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(W * glowX, H * glowY, 0, W * glowX, H * glowY, 1100);
  rg.addColorStop(0, rgba(accent, 0.16));
  rg.addColorStop(0.5, rgba(accent, 0.04));
  rg.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);

  const off = (g * 14) % 60;
  ctx.lineWidth = 1;
  for (let x = -60; x <= W + 60; x += 60) {
    const major = Math.round((x + g * 14 - off) / 60) % 4 === 0;
    ctx.strokeStyle = `rgba(120,150,220,${major ? 0.09 : 0.035})`;
    ctx.beginPath();
    ctx.moveTo(x + off, 0);
    ctx.lineTo(x + off, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    const major = (y / 60) % 4 === 0;
    ctx.strokeStyle = `rgba(120,150,220,${major ? 0.09 : 0.035})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // registration crosses
  ctx.strokeStyle = 'rgba(160,190,255,0.22)';
  for (let x = 0; x <= W; x += 240) {
    for (let y = 0; y <= H; y += 240) {
      const cx = x + off - 0;
      ctx.beginPath();
      ctx.moveTo(cx - 6, y);
      ctx.lineTo(cx + 6, y);
      ctx.moveTo(cx, y - 6);
      ctx.lineTo(cx, y + 6);
      ctx.stroke();
    }
  }
}

/** Big editorial scene header + ghost numeral. */
export function header(ctx: Ctx, lt: number, idx: string, title: string, sub: string, accent: string) {
  // ghost numeral
  ctx.save();
  setFont(ctx, 760, 700, DISPLAY);
  ctx.textAlign = 'right';
  ctx.strokeStyle = rgba(accent, 0.09 * E.outCubic(prog(lt, 0, 0.7)));
  ctx.lineWidth = 2;
  ctx.strokeText(idx, 1860 + (1 - E.outExpo(prog(lt, 0, 0.9))) * 160, 930);
  ctx.restore();

  // label
  const p = E.outExpo(prog(lt, 0, 0.5));
  ctx.save();
  ctx.beginPath();
  ctx.rect(120, 150, 900, 50);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(140, 168 + (1 - p) * 40, 14, 14);
  text(ctx, `STAGE ${idx} / 04`, 172, 182 + (1 - p) * 40, { size: 22, color: accent, track: 6, weight: 600 });
  ctx.restore();

  revealChars(ctx, title, 140, 300, 120, lt, { start: 0.06, stagger: 0.035, dur: 0.6, fill: COL.white });
  text(ctx, sub, 144, 352, { size: 24, color: COL.mid, alpha: E.outCubic(prog(lt, 0.35, 0.4)), track: 1 });

  // divider
  const dl = E.outExpo(prog(lt, 0.15, 0.8));
  ctx.fillStyle = rgba(accent, 0.45);
  ctx.fillRect(140, 380, 1640 * dl, 1.5);
  ctx.fillStyle = accent;
  ctx.fillRect(140, 379, 90 * dl, 3.5);
}

/** right-aligned giant stat in header zone */
export function statRight(ctx: Ctx, lt: number, label: string, value: string, color: string, start: number) {
  const p = E.outExpo(prog(lt, start, 0.6));
  ctx.save();
  ctx.beginPath();
  ctx.rect(1000, 150, 820, 225);
  ctx.clip();
  const dy = (1 - p) * 120;
  text(ctx, label, 1780, 214 + dy, { size: 20, color: COL.mid, align: 'right', track: 4, weight: 600 });
  text(ctx, value, 1780, 330 + dy, { size: 112, family: DISPLAY, weight: 700, color, align: 'right' });
  ctx.restore();
}

export function chip(ctx: Ctx, label: string, x: number, y: number, color: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  setFont(ctx, 20, 600, MONO);
  if ('letterSpacing' in ctx) (ctx as any).letterSpacing = '3px';
  const w = ctx.measureText(label).width + 44;
  rr(ctx, x, y, w, 46, 23);
  ctx.fillStyle = rgba(color, 0.1);
  ctx.fill();
  ctx.strokeStyle = rgba(color, 0.8);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = COL.white;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 22, y + 24);
  ctx.restore();
  return w;
}

export { hash, H, W };
