// Reusable drawing primitives: kinetic type, glow strokes, draw-on boxes, callouts

import { COL, MONO, SANS, ease, hexA, prog, lerp } from './util';

type Paint = string | CanvasGradient;

export function setFont(
  ctx: CanvasRenderingContext2D,
  size: number,
  weight = 700,
  family = SANS,
  spacing = 0,
) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = `${spacing}px`;
}

export interface KOpts {
  align?: 'left' | 'center' | 'right';
  weight?: number;
  family?: string;
  color?: Paint;
  spacing?: number;
  stagger?: number;
  dur?: number;
  stroke?: boolean;
  lw?: number;
  alpha?: number;
}

/** Per-character masked slide-up reveal. Returns total text width. */
export function kinetic(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  t: number,
  delay: number,
  o: KOpts = {},
) {
  const {
    align = 'left',
    weight = 700,
    family = SANS,
    color = COL.ink,
    spacing = 0,
    stagger = 0.03,
    dur = 0.55,
    stroke = false,
    lw = 2,
    alpha = 1,
  } = o;
  setFont(ctx, size, weight, family, spacing);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const total = ctx.measureText(str).width;
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0 - 30, y - size * 1.0, total + 60, size * 1.4);
  ctx.clip();
  ctx.globalAlpha = alpha;
  if (stroke) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
  } else {
    ctx.fillStyle = color;
  }
  for (let i = 0; i < str.length; i++) {
    const p = ease.outExpo(prog(t, delay + i * stagger, delay + i * stagger + dur));
    if (p <= 0) continue;
    const cx = x0 + (i === 0 ? 0 : ctx.measureText(str.slice(0, i)).width);
    const yy = y + (1 - p) * size * 1.3;
    if (stroke) ctx.strokeText(str[i], cx, yy);
    else ctx.fillText(str[i], cx, yy);
  }
  ctx.restore();
  ctx.letterSpacing = '0px';
  return total;
}

/** Simple (non-masked) text with alpha. */
export function label(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  size: number,
  color: Paint,
  alpha = 1,
  align: CanvasTextAlign = 'left',
  weight = 500,
  family = MONO,
  spacing = 0,
) {
  if (alpha <= 0.001) return;
  ctx.save();
  setFont(ctx, size, weight, family, spacing);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
  ctx.letterSpacing = '0px';
}

/** Strokes the current path with a cheap layered glow. */
export function glowStroke(ctx: CanvasRenderingContext2D, color: string, lw: number, alpha = 1) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.14 * alpha;
  ctx.lineWidth = lw * 5;
  ctx.stroke();
  ctx.globalAlpha = 0.3 * alpha;
  ctx.lineWidth = lw * 2.4;
  ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lw;
  ctx.stroke();
  ctx.restore();
}

/** Rounded rect that draws itself on, then fills. */
export function drawOnRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  p: number,
  color: string,
  fillA: number,
  lw = 2,
) {
  if (p <= 0) return;
  const per = 2 * (w + h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fillA > 0) {
    ctx.globalAlpha = prog(p, 0.5, 1);
    ctx.fillStyle = hexA(color, fillA);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.setLineDash([per * p, per]);
  ctx.stroke();
  ctx.restore();
}

/** Dot + leader line + label, p = 0..1 */
export function callout(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  text: string,
  color: string,
  p: number,
  align: 'left' | 'right' = 'left',
) {
  if (p <= 0) return;
  const d = ease.outBack(prog(p, 0, 0.3));
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x1, y1, 6 * d, 0, Math.PI * 2);
  ctx.fill();
  const lp = ease.inOutCubic(prog(p, 0.15, 0.7));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(lerp(x1, x2, lp), lerp(y1, y2, lp));
  ctx.stroke();
  ctx.restore();
  label(
    ctx,
    text,
    x2 + (align === 'left' ? 14 : -14),
    y2 + 7,
    20,
    COL.ink,
    prog(p, 0.6, 1),
    align,
    600,
    MONO,
    2,
  );
}

export function drawPacket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  s = 1,
) {
  ctx.save();
  ctx.fillStyle = hexA(color, 0.18);
  ctx.fillRect(x - 14 * s, y - 9 * s, 28 * s, 18 * s);
  ctx.fillStyle = color;
  ctx.fillRect(x - 7 * s, y - 4.5 * s, 14 * s, 9 * s);
  ctx.restore();
}

// ---------- gears -------------
export function gearPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  teeth: number,
  r: number,
  angle: number,
  depth = 9,
) {
  const p = (Math.PI * 2) / teeth;
  const ro = r + depth;
  const ri = r - depth;
  const k = [
    [ri, -0.3],
    [ro, -0.15],
    [ro, 0.15],
    [ri, 0.3],
  ];
  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a = angle + i * p;
    for (let j = 0; j < 4; j++) {
      const x = cx + Math.cos(a + k[j][1] * p) * k[j][0];
      const y = cy + Math.sin(a + k[j][1] * p) * k[j][0];
      if (i === 0 && j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

/** Angle for gear B so its teeth mesh with gear A (contact along direction phi from A to B). */
export function meshAngle(thA: number, tA: number, tB: number, phi: number) {
  return phi + Math.PI - Math.PI / tB + ((phi - thA) * tA) / tB;
}
