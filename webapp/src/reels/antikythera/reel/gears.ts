import { COL, Ctx, E, TAU, clamp, prog, rgba } from "./utils";

/** Module (tooth size). Pitch radius = M * teeth / 2 * 2 => M * teeth */
export const M = 5;

export interface GearDef {
  n: number; // teeth
  parent: number; // index of parent (-1 root)
  ang: number; // degrees from parent to this gear
  delay: number; // build delay (s)
}

export const GEARS: GearDef[] = [
  { n: 48, parent: -1, ang: 0, delay: 0.0 },
  { n: 30, parent: 0, ang: -30, delay: 0.12 },
  { n: 20, parent: 0, ang: 150, delay: 0.2 },
  { n: 36, parent: 1, ang: 20, delay: 0.32 },
  { n: 16, parent: 2, ang: 200, delay: 0.4 },
  { n: 28, parent: 0, ang: 95, delay: 0.5 },
  { n: 24, parent: 3, ang: -60, delay: 0.6 },
  { n: 40, parent: 4, ang: 130, delay: 0.7 },
  { n: 18, parent: 5, ang: 40, delay: 0.78 },
  { n: 22, parent: 1, ang: -80, delay: 0.88 },
];

export interface GearPos {
  x: number;
  y: number;
  r: number;
}

export const POS: GearPos[] = [];
GEARS.forEach((g, i) => {
  const r = M * g.n;
  if (g.parent < 0) {
    POS.push({ x: 0, y: 0, r });
  } else {
    const p = POS[g.parent];
    const a = (g.ang * Math.PI) / 180;
    const d = p.r + r;
    POS.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, r });
  }
  void i;
});

/** rotation of gear i given the root gear rotation (meshing maths) */
export function gearRot(i: number, base: number): number {
  const g = GEARS[i];
  if (g.parent < 0) return base;
  const p = GEARS[g.parent];
  const pr = gearRot(g.parent, base);
  const th = (g.ang * Math.PI) / 180;
  return Math.PI + th * (1 + p.n / g.n) - Math.PI / g.n - (pr * p.n) / g.n;
}

export function toothPath(ctx: Ctx, n: number, rot: number, R: number) {
  const tip = R + M * 1.1;
  const root = R - M * 1.1;
  const pa = TAU / n;
  ctx.beginPath();
  let len = 0;
  let lx = 0;
  let ly = 0;
  let first = true;
  const pt = (r: number, a: number) => {
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (first) {
      ctx.moveTo(x, y);
      first = false;
    } else {
      ctx.lineTo(x, y);
      len += Math.hypot(x - lx, y - ly);
    }
    lx = x;
    ly = y;
  };
  for (let k = 0; k < n; k++) {
    const a0 = rot + k * pa;
    pt(root, a0 - pa * 0.27);
    pt(tip, a0 - pa * 0.13);
    pt(tip, a0 + pa * 0.13);
    pt(root, a0 + pa * 0.27);
  }
  ctx.closePath();
  return len;
}

const perimCache = new Map<number, number>();
function perimeter(ctx: Ctx, n: number, R: number) {
  let p = perimCache.get(n);
  if (!p) {
    p = toothPath(ctx, n, 0, R) * 1.02;
    perimCache.set(n, p);
  }
  return p;
}

export interface GearStyle {
  alpha?: number;
  build?: number; // 0..1 draw-on progress
  tint?: number; // 0..1 how hot/glowing the edges are
  outlineOnly?: boolean;
}

export function drawGear(ctx: Ctx, idx: number, rot: number, st: GearStyle = {}) {
  const g = GEARS[idx];
  const { x, y, r: R } = POS[idx];
  const alpha = st.alpha ?? 1;
  const b = clamp(st.build ?? 1);
  if (b <= 0 || alpha <= 0) return;
  const sc = 0.55 + 0.45 * E.outBack(clamp(b * 1.15));
  const strokeP = E.out3(clamp(b / 0.6));
  const fillP = E.out2(clamp((b - 0.35) / 0.65));
  const tint = st.tint ?? 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.globalAlpha = alpha;

  const per = perimeter(ctx, g.n, R);
  toothPath(ctx, g.n, rot, R);

  if (!st.outlineOnly && fillP > 0) {
    // ring with hole for spokes
    ctx.save();
    ctx.globalAlpha = alpha * fillP;
    const rimIn = R * 0.74;
    ctx.beginPath();
    toothPath(ctx, g.n, rot, R);
    ctx.moveTo(rimIn, 0);
    ctx.arc(0, 0, rimIn, 0, TAU, true);
    // metallic fill
    let fill: CanvasGradient;
    if ((ctx as any).createConicGradient) {
      fill = (ctx as any).createConicGradient(rot * 0.5, 0, 0) as CanvasGradient;
      fill.addColorStop(0, "#7a4a1b");
      fill.addColorStop(0.18, "#e0a04a");
      fill.addColorStop(0.32, "#5a3513");
      fill.addColorStop(0.5, "#b87333");
      fill.addColorStop(0.68, "#4a2b10");
      fill.addColorStop(0.85, "#dca24f");
      fill.addColorStop(1, "#7a4a1b");
    } else {
      fill = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 1.1);
      fill.addColorStop(0, "#d79a46");
      fill.addColorStop(1, "#5a3513");
    }
    ctx.fillStyle = fill;
    ctx.fill("evenodd");
    // darken for depth
    ctx.fillStyle = "rgba(4,7,11,0.38)";
    ctx.fill("evenodd");

    // spokes
    const spokes = 4 + (g.n % 3);
    ctx.lineCap = "butt";
    ctx.strokeStyle = fill;
    ctx.lineWidth = R * 0.085;
    for (let k = 0; k < spokes; k++) {
      const a = rot * 0.0 + (k * TAU) / spokes + rot;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
      ctx.lineTo(Math.cos(a) * rimIn, Math.sin(a) * rimIn);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(4,7,11,0.4)";
    ctx.stroke();
    // hub
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.2, 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = "rgba(4,7,11,0.3)";
    ctx.fill();
    ctx.strokeStyle = rgba(COL.hot, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.065, 0, TAU);
    ctx.fillStyle = COL.bg;
    ctx.fill();
    ctx.strokeStyle = rgba(COL.gold, 0.8);
    ctx.stroke();

    // engraved rim ticks
    ctx.strokeStyle = rgba(COL.hot, 0.28);
    ctx.lineWidth = 1;
    const ticks = g.n * 2;
    ctx.beginPath();
    for (let k = 0; k < ticks; k++) {
      const a = rot + (k * TAU) / ticks;
      const r1 = R * 0.8;
      const r2 = R * (k % 2 ? 0.835 : 0.86);
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.8, 0, TAU);
    ctx.arc(0, 0, rimIn, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // outline
  toothPath(ctx, g.n, rot, R);
  ctx.setLineDash([per * strokeP, per * 2]);
  const hotness = clamp((1 - b) * 1.6 + tint);
  ctx.strokeStyle = hotness > 0.05 ? rgba(COL.hot, 0.55 + 0.45 * hotness) : rgba(COL.gold, 0.85);
  ctx.lineWidth = 2 + hotness * 2.5;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** Draw the whole train. base = root rotation. */
export function drawTrain(
  ctx: Ctx,
  t: number,
  base: number,
  buildStart: number,
  alpha = 1,
  tint = 0
) {
  for (let i = 0; i < GEARS.length; i++) {
    const d = buildStart + GEARS[i].delay;
    const b = prog(t, d, d + 0.65);
    drawGear(ctx, i, gearRot(i, base), { alpha, build: b, tint });
  }
}

export function trainBase(t: number) {
  const t0 = 2.7;
  if (t < t0) return 0;
  const k = Math.max(0, t - 5);
  return 0.4 * (t - t0) + 1.8 * E.out3(prog(t, t0, 4.2)) + 0.32 * Math.pow(k, 1.6);
}
