// The six eras + intro + outro. Every scene is drawn procedurally on canvas.

import {
  COL, H, MONO, SANS, W, ease, hash2, hexA, lerp, mulberry32, prog, clamp,
} from './util';
import {
  callout, drawOnRect, drawPacket, gearPath, glowStroke, kinetic, label, meshAngle, setFont,
} from './draw';

type Ctx = CanvasRenderingContext2D;

export interface Hud {
  idx: number;
  year: number;
  prev: number;
  title: string[];
  sub: string[];
}

export interface Scene {
  start: number;
  end: number;
  accent: string;
  hud?: Hud;
  art: (ctx: Ctx, t: number) => void;
  name: string;
}

// ---------------------------------------------------------------- shared HUD text
function drawHud(ctx: Ctx, t: number, h: Hud, accent: string) {
  // chapter marker
  kinetic(ctx, `0${h.idx} / 06`, 110, 200, 22, t, 0.05, {
    family: MONO, weight: 600, color: accent, spacing: 4, stagger: 0.02, dur: 0.4,
  });
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(262, 192);
  ctx.lineTo(262 + 380 * ease.outExpo(prog(t, 0.1, 0.8)), 192);
  ctx.stroke();

  // year odometer + ghost outline
  const yp = ease.outExpo(prog(t, 0.05, 0.8));
  const yr = Math.round(lerp(h.prev, h.year, yp));
  kinetic(ctx, String(h.year), 118, 494, 270, t, 0.12, {
    stroke: true, lw: 2, color: hexA(COL.ink, 0.22), stagger: 0.05, dur: 0.6, spacing: -6,
  });
  kinetic(ctx, String(yr), 104, 480, 270, t, 0.0, {
    color: accent, stagger: 0.05, dur: 0.55, spacing: -6,
  });

  // title lines
  h.title.forEach((line, i) => {
    kinetic(ctx, line, 110, 596 + i * 84, 74, t, 0.35 + i * 0.1, {
      color: COL.ink, stagger: 0.025, dur: 0.5, spacing: -1,
    });
  });

  // accent block + subtitle
  const bp = ease.outBack(prog(t, 0.7, 1.0));
  ctx.fillStyle = accent;
  ctx.fillRect(110, 770 - 14 * bp, 14 * bp, 14 * bp);
  h.sub.forEach((line, i) => {
    kinetic(ctx, line, 140, 768 + i * 36, 22, t, 0.8 + i * 0.15, {
      family: MONO, weight: 500, color: hexA(COL.ink, 0.7), stagger: 0.012, dur: 0.35,
    });
  });
}

// ---------------------------------------------------------------- binary rain
const rainRnd = mulberry32(7);
const RAIN = Array.from({ length: 48 }, () => ({
  speed: 140 + rainRnd() * 260,
  off: rainRnd() * 1400,
}));
function rain(ctx: Ctx, t: number, color: string, alpha: number) {
  setFont(ctx, 22, 500, MONO, 0);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  for (let c = 0; c < RAIN.length; c++) {
    const head = ((t * RAIN[c].speed + RAIN[c].off) % (H + 500)) - 100;
    for (let k = 0; k < 14; k++) {
      const y = head - k * 30;
      if (y < -20 || y > H + 20) continue;
      ctx.globalAlpha = alpha * (1 - k / 14) * (k === 0 ? 2.2 : 1);
      ctx.fillText((c * 7 + k * 13 + Math.floor(t * 6 + c)) % 2 ? '1' : '0', c * 40 + 20, y);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- INTRO
function artIntro(ctx: Ctx, t: number) {
  rain(ctx, t, COL.cyan, 0.22);
  const push = 1 + 0.05 * prog(t, 0, 1.5);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -H / 2);

  kinetic(ctx, 'A BRIEF HISTORY OF', W / 2, 372, 30, t, 0.05, {
    align: 'center', family: MONO, weight: 600, color: COL.cyan, spacing: 14, stagger: 0.02, dur: 0.45,
  });
  kinetic(ctx, 'COMPUTER', W / 2, 570, 190, t, 0.12, {
    align: 'center', color: COL.ink, spacing: -4, stagger: 0.035, dur: 0.5,
  });
  const g = ctx.createLinearGradient(W / 2 - 760, 0, W / 2 + 760, 0);
  g.addColorStop(0, COL.amber);
  g.addColorStop(0.3, COL.cyan);
  g.addColorStop(0.62, COL.magenta);
  g.addColorStop(1, COL.lime);
  kinetic(ctx, 'ARCHITECTURE', W / 2, 770, 190, t, 0.28, {
    align: 'center', color: g, spacing: -4, stagger: 0.035, dur: 0.5,
  });

  // underline ruler
  const lp = ease.outExpo(prog(t, 0.55, 1.2));
  const x0 = W / 2 - 760;
  ctx.strokeStyle = hexA(COL.ink, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, 828);
  ctx.lineTo(x0 + 1520 * lp, 828);
  ctx.stroke();
  for (let i = 0; i <= 38; i++) {
    const x = x0 + i * 40;
    if (x > x0 + 1520 * lp) break;
    ctx.beginPath();
    ctx.moveTo(x, 828);
    ctx.lineTo(x, 828 + (i % 5 === 0 ? 18 : 9));
    ctx.stroke();
  }
  label(ctx, '1837', x0, 880, 22, COL.amber, prog(t, 0.8, 1.0), 'left', 600, MONO, 3);
  label(ctx, '2024', x0 + 1520, 880, 22, COL.lime, prog(t, 0.85, 1.05), 'right', 600, MONO, 3);
  label(ctx, 'SIX BREAKTHROUGHS · FIFTEEN SECONDS', W / 2, 880, 22, hexA(COL.ink, 0.7), prog(t, 0.9, 1.1), 'center', 500, MONO, 3);
  ctx.restore();
}

// ---------------------------------------------------------------- 1837 GEARS
interface G { x: number; y: number; n: number; r: number }
const mk = (x: number, y: number, n: number): G => ({ x, y, n, r: n * 10.5 });
const place = (p: G, n: number, phi: number): G => {
  const r = n * 10.5;
  return mk(p.x + Math.cos(phi) * (p.r + r), p.y + Math.sin(phi) * (p.r + r), n);
};
const gA = mk(1130, 430, 20);
const PHI_AB = 0.5, PHI_AD = 1.5, PHI_BC = -0.5, PHI_CF = 0.9;
const gB = place(gA, 14, PHI_AB);
const gD = place(gA, 10, PHI_AD);
const gC = place(gB, 10, PHI_BC);
const gF = place(gC, 24, PHI_CF);

function drawGear(ctx: Ctx, g: G, th: number, color: string, p: number, fillA = 0.1) {
  if (p <= 0.001) return;
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.scale(p, p);
  gearPath(ctx, 0, 0, g.n, g.r, th);
  ctx.fillStyle = hexA(color, fillA);
  ctx.fill();
  glowStroke(ctx, color, 3);
  // hub + spokes
  ctx.strokeStyle = hexA(color, 0.9);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, g.r * 0.24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, g.r * 0.78, 0, Math.PI * 2);
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 0.7;
  const spokes = g.n > 12 ? 6 : 4;
  ctx.beginPath();
  for (let i = 0; i < spokes; i++) {
    const a = th + (i * Math.PI * 2) / spokes;
    ctx.moveTo(Math.cos(a) * g.r * 0.24, Math.sin(a) * g.r * 0.24);
    ctx.lineTo(Math.cos(a) * g.r * 0.78, Math.sin(a) * g.r * 0.78);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, g.r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function artGears(ctx: Ctx, t: number) {
  const c = COL.amber;
  const thA = 0.2 + t * 0.9 + 0.35 * ease.outExpo(prog(t, 0, 1.2));
  const thB = meshAngle(thA, gA.n, gB.n, PHI_AB);
  const thD = meshAngle(thA, gA.n, gD.n, PHI_AD);
  const thC = meshAngle(thB, gB.n, gC.n, PHI_BC);
  const thF = meshAngle(thC, gC.n, gF.n, PHI_CF);
  const pp = (d: number) => ease.outBack(prog(t, d, d + 0.55));
  drawGear(ctx, gF, thF, c, pp(0.45), 0.05);
  drawGear(ctx, gA, thA, c, pp(0.1), 0.12);
  drawGear(ctx, gB, thB, c, pp(0.22), 0.1);
  drawGear(ctx, gD, thD, c, pp(0.34), 0.1);
  drawGear(ctx, gC, thC, c, pp(0.28), 0.1);

  callout(ctx, gA.x - 155, gA.y - 142, 905, 215, 'THE MILL', c, prog(t, 0.9, 1.5), 'right');
  callout(ctx, gC.x + 10, gC.y - 100, 1690, 285, 'THE STORE', c, prog(t, 1.05, 1.65), 'right');
  label(ctx, 'CPU ≈ MILL · RAM ≈ STORE', gD.x - 90, 905, 18, hexA(COL.ink, 0.65), prog(t, 1.3, 1.7), 'left', 500, MONO, 3);
}

// ---------------------------------------------------------------- 1945 VON NEUMANN
function inner(
  ctx: Ctx, t: number, x: number, y: number, w: number, h: number,
  main: string, sub: string, delay: number, on: boolean,
) {
  const p = ease.outBack(prog(t, delay, delay + 0.45));
  if (p <= 0.001) return;
  const cx = x + w / 2, cy = y + h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(p, p);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 8);
  ctx.fillStyle = on ? hexA(COL.cyan, 0.9) : hexA(COL.cyan, 0.13);
  ctx.fill();
  ctx.strokeStyle = COL.cyan;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  label(ctx, main, cx, cy + 6, 40, on ? COL.bg : COL.ink, p, 'center', 700, SANS, 0);
  label(ctx, sub, cx, cy + 34, 13, on ? COL.bg : hexA(COL.ink, 0.65), p, 'center', 600, MONO, 2);
}

function artVonNeumann(ctx: Ctx, t: number) {
  const cy = COL.cyan;
  const ox = 860, oy = 215;
  ctx.save();
  ctx.translate(ox, oy);
  const hl = t > 1.15 ? Math.floor((t - 1.15) / 0.24) % 4 : -1; // 0 mem,1 cu,2 alu,3 reg

  drawOnRect(ctx, 0, 0, 400, 380, 14, ease.inOutCubic(prog(t, 0.1, 0.8)), cy, 0.05, 3);
  drawOnRect(ctx, 560, 0, 340, 380, 14, ease.inOutCubic(prog(t, 0.22, 0.92)), cy, 0.05, 3);
  drawOnRect(ctx, 0, 470, 420, 110, 14, ease.inOutCubic(prog(t, 0.36, 1.0)), cy, 0.05, 3);
  drawOnRect(ctx, 480, 470, 420, 110, 14, ease.inOutCubic(prog(t, 0.46, 1.1)), cy, 0.05, 3);

  label(ctx, 'CENTRAL PROCESSING UNIT', 0, -18, 18, cy, prog(t, 0.5, 0.8), 'left', 600, MONO, 3);
  label(ctx, 'MEMORY', 560, -18, 18, cy, prog(t, 0.6, 0.9), 'left', 600, MONO, 3);
  label(ctx, 'INPUT', 0, 452, 18, cy, prog(t, 0.8, 1.1), 'left', 600, MONO, 3);
  label(ctx, 'OUTPUT', 480, 452, 18, cy, prog(t, 0.9, 1.2), 'left', 600, MONO, 3);

  inner(ctx, t, 24, 60, 170, 130, 'CU', 'CONTROL UNIT', 0.7, hl === 1);
  inner(ctx, t, 206, 60, 170, 130, 'ALU', 'ARITHMETIC', 0.8, hl === 2);
  // registers
  const rp = ease.outBack(prog(t, 0.9, 1.35));
  if (rp > 0.001) {
    ctx.save();
    ctx.translate(200, 277);
    ctx.scale(rp, rp);
    ctx.beginPath();
    ctx.roundRect(-176, -62, 352, 124, 8);
    ctx.fillStyle = hl === 3 ? hexA(cy, 0.85) : hexA(cy, 0.1);
    ctx.fill();
    ctx.strokeStyle = cy;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    label(ctx, 'REGISTERS', 28, 252, 13, hl === 3 ? COL.bg : hexA(COL.ink, 0.7), rp, 'left', 600, MONO, 2);
    for (let i = 0; i < 8; i++) {
      const on = Math.sin(t * 9 + i * 1.9) > 0.2;
      ctx.fillStyle = hl === 3 ? hexA(COL.bg, on ? 0.9 : 0.35) : hexA(cy, on ? 0.9 : 0.25);
      ctx.globalAlpha = rp;
      ctx.fillRect(40 + i * 42, 266, 34, 44);
      ctx.globalAlpha = 1;
    }
  }

  // memory cells
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 4; c++) {
      const a = prog(t, 0.6 + (r * 4 + c) * 0.014, 0.85 + (r * 4 + c) * 0.014);
      if (a <= 0) continue;
      const isInstr = r < 5;
      const base = isInstr ? cy : COL.ink;
      const active = hl === 0 && r === Math.floor(t * 9) % 5 ? 1 : 0;
      ctx.fillStyle = hexA(base, (0.1 + 0.08 * hash2(r, c) + active * 0.8) * a);
      ctx.fillRect(578 + c * 78, 34 + r * 40, 70, 32);
    }
  }
  label(ctx, 'INSTRUCTIONS', 578, 372, 12, hexA(cy, 0.9), prog(t, 1.0, 1.3), 'left', 600, MONO, 2);
  label(ctx, 'DATA', 886, 372, 12, hexA(COL.ink, 0.7), prog(t, 1.0, 1.3), 'right', 600, MONO, 2);

  // buses
  const names = ['ADDR', 'DATA', 'CTRL'];
  for (let k = 0; k < 3; k++) {
    const y = 110 + k * 80;
    const bp = ease.inOutCubic(prog(t, 0.85 + k * 0.06, 1.2 + k * 0.06));
    ctx.strokeStyle = hexA(cy, 0.55);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(400, y);
    ctx.lineTo(400 + 160 * bp, y);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, names[k], 480, y - 12, 12, hexA(COL.ink, 0.7), bp, 'center', 600, MONO, 2);
    if (t > 1.2) {
      const dir = k === 1 ? -1 : 1;
      const u = (t * 1.3 + k * 0.33) % 1;
      drawPacket(ctx, 400 + 160 * (dir > 0 ? u : 1 - u), y, cy);
    }
  }
  // vertical buses to I/O
  [[210, 380, 470, 0.2], [690, 380, 470, 0.6]].forEach(([x, y1, y2, off], i) => {
    const bp = ease.inOutCubic(prog(t, 1.0 + i * 0.08, 1.3 + i * 0.08));
    ctx.strokeStyle = hexA(cy, 0.55);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + (y2 - y1) * bp);
    ctx.stroke();
    ctx.setLineDash([]);
    if (t > 1.3) {
      const u = (t * 1.1 + off) % 1;
      drawPacket(ctx, x, i === 0 ? y2 - (y2 - y1) * u : y1 + (y2 - y1) * u, cy, 0.9);
    }
  });

  // cycle legend
  const steps = ['FETCH', 'DECODE', 'EXECUTE', 'STORE'];
  const order = [0, 1, 2, 3];
  const xs = [0, 150, 330, 520];
  steps.forEach((s, i) => {
    const active = hl === order[i];
    label(ctx, s, xs[i], 650, 22, active ? cy : hexA(COL.ink, 0.45), prog(t, 1.2, 1.5), 'left', 700, MONO, 3);
    if (i < 3) label(ctx, '→', xs[i + 1] - 36, 650, 22, hexA(COL.ink, 0.3), prog(t, 1.2, 1.5), 'left', 500, MONO, 0);
  });
  label(ctx, 'ONE MEMORY · ONE BUS · THE STORED-PROGRAM IDEA', 0, 700, 16, hexA(COL.ink, 0.55), prog(t, 1.4, 1.8), 'left', 500, MONO, 3);
  ctx.restore();
}

// ---------------------------------------------------------------- 1971 4004
const chipRnd = mulberry32(4004);
const GP = 18; // die grid pitch
const gpos = (i: number) => -108 + i * GP + GP / 2;
interface Trace { pts: [number, number][]; len: number }
const TRACES: Trace[] = Array.from({ length: 52 }, () => {
  const i0 = Math.floor(chipRnd() * 12), j0 = Math.floor(chipRnd() * 12);
  const i1 = Math.floor(chipRnd() * 12), j1 = Math.floor(chipRnd() * 12);
  const i2 = Math.floor(chipRnd() * 12);
  const pts: [number, number][] = [
    [gpos(i0), gpos(j0)], [gpos(i1), gpos(j0)], [gpos(i1), gpos(j1)], [gpos(i2), gpos(j1)],
  ];
  let len = 0;
  for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  return { pts, len: Math.max(len, 1) };
});

function pointOn(tr: Trace, u: number): [number, number] {
  let d = u * tr.len;
  for (let k = 1; k < tr.pts.length; k++) {
    const a = tr.pts[k - 1], b = tr.pts[k];
    const sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d <= sl || k === tr.pts.length - 1) {
      const f = sl === 0 ? 0 : Math.min(1, d / sl);
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
    }
    d -= sl;
  }
  return tr.pts[0];
}

function artChip(ctx: Ctx, t: number) {
  const m = COL.magenta;
  const cx = 1330, cy = 530;
  const zp = ease.inOutCubic(prog(t, 0.85, 1.65));
  const s = lerp(1, 2.5, zp);
  const pkgA = 1 - prog(t, 0.95, 1.4);
  const pop = ease.outBack(prog(t, 0, 0.6));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s * pop, s * pop);

  if (pkgA > 0) {
    ctx.save();
    ctx.globalAlpha = pkgA;
    // pins
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 8; i++) {
        const pp = ease.outBack(prog(t, 0.15 + i * 0.04 + side * 0.02, 0.55 + i * 0.04));
        const y = -182 + i * 52 - 9;
        const out = (1 - pp) * 60;
        const x = side === 0 ? -150 - 48 - out : 150 + out;
        ctx.fillStyle = hexA(m, 0.25);
        ctx.fillRect(x, y, 48, 18);
        ctx.strokeStyle = m;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 48, 18);
      }
    }
    // body
    ctx.beginPath();
    ctx.roundRect(-150, -220, 300, 440, 12);
    ctx.fillStyle = '#0d0f17';
    ctx.fill();
    glowStroke(ctx, m, 3, 1);
    ctx.beginPath();
    ctx.arc(0, -220, 22, 0, Math.PI);
    ctx.strokeStyle = m;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, 'INTEL', 0, 168, 18, hexA(COL.ink, 0.8), 1, 'center', 700, MONO, 6);
    label(ctx, 'C4004', 0, 198, 26, COL.ink, 1, 'center', 700, MONO, 6);
    ctx.fillStyle = m;
    ctx.beginPath();
    ctx.arc(-124, -194, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // die
  const dieP = prog(t, 0.25, 0.8);
  ctx.beginPath();
  ctx.rect(-108, -108, 216, 216);
  ctx.fillStyle = hexA(m, 0.08 * dieP);
  ctx.fill();
  ctx.strokeStyle = m;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = dieP;
  ctx.stroke();
  ctx.globalAlpha = 1;
  // transistor cells
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const a = prog(t, 0.5 + hash2(i, j) * 1.0, 0.7 + hash2(i, j) * 1.0);
      if (a <= 0) continue;
      const flick = t > 1.6 ? 0.55 + 0.45 * Math.sin(t * 10 + hash2(j, i) * 30) : 1;
      ctx.fillStyle = hexA(hash2(i + 3, j + 9) > 0.8 ? COL.ink : m, 0.5 * a * flick);
      ctx.fillRect(gpos(i) - 4.5, gpos(j) - 4.5, 9, 9);
    }
  }
  // traces
  TRACES.forEach((tr, n) => {
    const p = ease.inOutCubic(prog(t, 0.8 + n * 0.012, 1.5 + n * 0.012));
    if (p <= 0) return;
    ctx.beginPath();
    tr.pts.forEach((pt, k) => (k === 0 ? ctx.moveTo(pt[0], pt[1]) : ctx.lineTo(pt[0], pt[1])));
    ctx.strokeStyle = hexA(m, 0.8);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([tr.len * p, tr.len + 20]);
    ctx.stroke();
    ctx.setLineDash([]);
    if (t > 1.5 && n % 2 === 0) {
      const u = (t * 0.9 + n * 0.173) % 1;
      const [px, py] = pointOn(tr, u);
      ctx.fillStyle = COL.ink;
      ctx.fillRect(px - 2.5, py - 2.5, 5, 5);
    }
  });
  ctx.restore();

  // stats
  const n = Math.round(2300 * ease.outExpo(prog(t, 0.9, 1.8)));
  ctx.save();
  setFont(ctx, 84, 700, SANS, -2);
  ctx.fillStyle = m;
  ctx.globalAlpha = prog(t, 0.85, 1.05);
  ctx.textAlign = 'left';
  ctx.fillText(n.toLocaleString('en-US'), 870, 905);
  ctx.restore();
  ctx.letterSpacing = '0px';
  label(ctx, 'TRANSISTORS', 1195, 905, 22, COL.ink, prog(t, 1.0, 1.25), 'left', 700, MONO, 4);
  label(ctx, '740 kHz  ·  4-BIT  ·  10 µm', 1195, 874, 16, hexA(COL.ink, 0.6), prog(t, 1.1, 1.35), 'left', 500, MONO, 3);
  callout(ctx, cx + 108 * 2.5 - 30, cy - 108 * 2.5 + 20, 1700, 205, 'THE DIE', m, prog(t, 1.65, 2.0), 'right');
}

// ---------------------------------------------------------------- 1985 PIPELINE
const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const STAGE_COL = [COL.lime, COL.cyan, COL.amber, COL.magenta, COL.violet];
function artPipeline(ctx: Ctx, t: number) {
  const ox = 880, oy = 300, cw = 92, rh = 82;
  label(ctx, 'CLOCK CYCLE →', ox, oy - 52, 16, hexA(COL.lime, 0.9), prog(t, 0.1, 0.4), 'left', 600, MONO, 3);
  for (let k = 0; k < 10; k++) {
    label(ctx, String(k + 1), ox + k * cw + cw / 2 - 3, oy - 20, 16, hexA(COL.ink, 0.45), prog(t, 0.15 + k * 0.03, 0.4 + k * 0.03), 'center', 500, MONO, 0);
  }
  // column highlight following the clock
  const sp = clamp((t - 0.35) / 0.11, 0, 10);
  const cur = Math.min(9, Math.floor(sp));
  if (t > 0.35 && sp < 10) {
    ctx.fillStyle = hexA(COL.lime, 0.07);
    ctx.fillRect(ox + cur * cw, oy - 6, cw, 6 * rh + 6);
  }
  ctx.strokeStyle = hexA(COL.ink, 0.12);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 10; k++) {
    ctx.moveTo(ox + k * cw, oy - 6);
    ctx.lineTo(ox + k * cw, oy + 6 * rh);
  }
  ctx.stroke();

  for (let r = 0; r < 6; r++) {
    label(ctx, `I${r + 1}`, ox - 12, oy + r * rh + 42, 16, hexA(COL.ink, 0.5), prog(t, 0.2 + r * 0.04, 0.5 + r * 0.04), 'right', 600, MONO, 1);
    for (let s = 0; s < 5; s++) {
      const slot = r + s;
      const ta = 0.35 + slot * 0.11;
      const p = ease.outBack(prog(t, ta, ta + 0.32));
      if (p <= 0.001) continue;
      const col = STAGE_COL[s];
      const flash = 1 - prog(t, ta + 0.1, ta + 0.5);
      const cx = ox + slot * cw + (cw - 6) / 2 + 3, cy = oy + r * rh + 6 + 32;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(p, p);
      ctx.beginPath();
      ctx.roundRect(-(cw - 8) / 2, -32, cw - 8, 64, 8);
      ctx.fillStyle = hexA(col, 0.2 + 0.6 * flash);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      label(ctx, STAGES[s], cx, cy + 7, 20, flash > 0.5 ? COL.bg : COL.ink, p, 'center', 700, MONO, 1);
    }
  }
  // clock sweep line
  if (t > 0.3 && sp < 10) {
    const x = ox + sp * cw;
    ctx.beginPath();
    ctx.moveTo(x, oy - 22);
    ctx.lineTo(x, oy + 6 * rh + 6);
    glowStroke(ctx, COL.lime, 2, 0.9);
  }
  // stat
  const sp2 = ease.outBack(prog(t, 1.15, 1.6));
  ctx.save();
  ctx.translate(ox, 905);
  ctx.scale(sp2, sp2);
  setFont(ctx, 96, 700, SANS, -2);
  ctx.fillStyle = COL.lime;
  ctx.textAlign = 'left';
  ctx.fillText('5×', 0, 0);
  ctx.restore();
  ctx.letterSpacing = '0px';
  label(ctx, 'INSTRUCTIONS IN FLIGHT', ox + 190, 880, 22, COL.ink, prog(t, 1.3, 1.55), 'left', 700, MONO, 4);
  label(ctx, 'IF · ID · EX · MEM · WB  — ONE FINISHES EVERY CLOCK', ox + 190, 910, 16, hexA(COL.ink, 0.6), prog(t, 1.45, 1.7), 'left', 500, MONO, 2);
}

// ---------------------------------------------------------------- 2006 MULTICORE
function artCores(ctx: Ctx, t: number) {
  const v = COL.violet;
  const cols = 8, rows = 5, pitch = 118, size = 100, x0 = 870, y0 = 250;
  const cxm = (cols - 1) / 2, cym = (rows - 1) / 2;
  // NoC links
  ctx.strokeStyle = hexA(v, 0.3 * prog(t, 0.5, 1.0));
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = x0 + i * pitch + size / 2, cy = y0 + j * pitch + size / 2;
      if (i < cols - 1) { ctx.moveTo(cx, cy); ctx.lineTo(cx + pitch, cy); }
      if (j < rows - 1) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + pitch); }
    }
  }
  ctx.stroke();

  let lit = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const d = Math.hypot(i - cxm, (j - cym) * 1.25);
      const ta = 0.12 + d * 0.1;
      const p = ease.outBack(prog(t, ta, ta + 0.4));
      if (p <= 0.001) continue;
      if (p > 0.5) lit++;
      const cx = x0 + i * pitch + size / 2, cy = y0 + j * pitch + size / 2;
      const act = prog(t, ta + 0.3, ta + 0.6);
      const load = act * (0.5 + 0.5 * Math.sin(t * 7 - d * 1.7 + hash2(i, j) * 6));
      const col = load > 0.82 ? COL.amber : load > 0.45 ? COL.magenta : v;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(p, p);
      ctx.beginPath();
      ctx.roundRect(-size / 2, -size / 2, size, size, 12);
      ctx.fillStyle = hexA(col, 0.1 + 0.42 * load);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let k = 0; k < 9; k++) {
        const on = load > (k + 1) / 10;
        ctx.fillStyle = on ? COL.ink : hexA(col, 0.4);
        ctx.fillRect(-24 + (k % 3) * 20, -24 + Math.floor(k / 3) * 20, 8, 8);
      }
      ctx.restore();
    }
  }
  ctx.save();
  setFont(ctx, 100, 700, SANS, -2);
  ctx.fillStyle = v;
  ctx.textAlign = 'left';
  ctx.globalAlpha = prog(t, 0.2, 0.4);
  ctx.fillText(String(lit).padStart(2, '0'), 870, 925);
  ctx.restore();
  ctx.letterSpacing = '0px';
  label(ctx, 'CORES ON ONE DIE', 1040, 900, 22, COL.ink, prog(t, 0.4, 0.7), 'left', 700, MONO, 4);
  label(ctx, 'CLOCK HITS THE WALL ~4 GHz → PERFORMANCE GOES PARALLEL', 1040, 928, 15, hexA(COL.ink, 0.6), prog(t, 1.0, 1.3), 'left', 500, MONO, 2);
}

// ---------------------------------------------------------------- 2024 CHIPLETS
interface Chip {
  x: number; y: number; w: number; h: number; col: string; name: string;
  from: [number, number]; delay: number; kind: 'cpu' | 'gpu' | 'npu' | 'hbm' | 'io';
}
const CHIPS: Chip[] = [
  { x: 900, y: 265, w: 250, h: 250, col: COL.cyan, name: 'CPU', from: [-320, 0], delay: 0.15, kind: 'cpu' },
  { x: 1180, y: 265, w: 330, h: 250, col: COL.magenta, name: 'GPU', from: [0, -260], delay: 0.25, kind: 'gpu' },
  { x: 1540, y: 265, w: 200, h: 250, col: COL.lime, name: 'NPU', from: [320, 0], delay: 0.35, kind: 'npu' },
  ...[0, 1, 2, 3].map((i): Chip => ({
    x: 900 + i * 215, y: 545, w: 190, h: 120, col: COL.amber, name: 'HBM',
    from: [0, 330], delay: 0.45 + i * 0.07, kind: 'hbm',
  })),
  { x: 900, y: 695, w: 840, h: 110, col: COL.violet, name: 'I/O DIE', from: [0, 300], delay: 0.7, kind: 'io' },
];
// connector segments across the gaps
const LINKS: [number, number, number, number][] = [];
[330, 390, 450].forEach((y) => { LINKS.push([1150, y, 1180, y]); LINKS.push([1510, y, 1540, y]); });
[0, 1, 2, 3].forEach((i) => {
  [-50, 0, 50].forEach((dx) => {
    LINKS.push([900 + i * 215 + 95 + dx, 515, 900 + i * 215 + 95 + dx, 545]);
    LINKS.push([900 + i * 215 + 95 + dx, 665, 900 + i * 215 + 95 + dx, 695]);
  });
});
const BUMPS = (() => {
  const a: [number, number][] = [];
  for (let x = 880; x < 1780; x += 20) for (let y = 245; y < 850; y += 20) a.push([x, y]);
  return a;
})();

function chipInterior(ctx: Ctx, t: number, c: Chip, a: number) {
  ctx.save();
  ctx.globalAlpha = a;
  if (c.kind === 'cpu') {
    for (let i = 0; i < 4; i++) {
      const x = c.x + 30 + (i % 2) * 100, y = c.y + 60 + Math.floor(i / 2) * 90;
      const on = 0.3 + 0.7 * Math.max(0, Math.sin(t * 8 + i * 1.7));
      ctx.fillStyle = hexA(c.col, 0.15 + 0.5 * on);
      ctx.fillRect(x, y, 90, 80);
      ctx.strokeStyle = c.col;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, 90, 80);
    }
  } else if (c.kind === 'gpu') {
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 7; i++) {
        const on = 0.5 + 0.5 * Math.sin(t * 10 + hash2(i, j) * 20);
        ctx.fillStyle = hexA(c.col, 0.12 + 0.6 * on);
        ctx.fillRect(c.x + 22 + i * 41, c.y + 56 + j * 46, 34, 38);
      }
    }
  } else if (c.kind === 'npu') {
    const layers = [3, 4, 3];
    const nodes: [number, number, number][][] = layers.map((n, l) =>
      Array.from({ length: n }, (_, k) => [
        c.x + 36 + l * 64,
        c.y + 56 + ((k + 0.5) * (c.h - 80)) / n,
        l * 10 + k,
      ] as [number, number, number]),
    );
    ctx.lineWidth = 1.2;
    for (let l = 0; l < 2; l++) {
      nodes[l].forEach((a1) => nodes[l + 1].forEach((b) => {
        const f = 0.5 + 0.5 * Math.sin(t * 9 - a1[2] * 1.3 - b[2]);
        ctx.strokeStyle = hexA(c.col, 0.15 + 0.5 * f);
        ctx.beginPath();
        ctx.moveTo(a1[0], a1[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
      }));
    }
    nodes.flat().forEach((n) => {
      const f = 0.5 + 0.5 * Math.sin(t * 9 - n[2] * 1.5);
      ctx.fillStyle = f > 0.6 ? COL.ink : c.col;
      ctx.beginPath();
      ctx.arc(n[0], n[1], 7, 0, Math.PI * 2);
      ctx.fill();
    });
  } else if (c.kind === 'hbm') {
    for (let k = 0; k < 4; k++) {
      const on = 0.5 + 0.5 * Math.sin(t * 6 - k * 1.2 - c.x * 0.01);
      ctx.fillStyle = hexA(c.col, 0.18 + 0.5 * on);
      ctx.fillRect(c.x + 16, c.y + 40 + k * 17, c.w - 32, 11);
    }
  } else {
    ctx.strokeStyle = hexA(c.col, 0.9);
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 12]);
    ctx.lineDashOffset = -t * 90;
    ctx.beginPath();
    ctx.moveTo(c.x + 250, c.y + 55);
    ctx.lineTo(c.x + c.w - 30, c.y + 55);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'UCIe · NVLink · PCIe', c.x + 22, c.y + 92, 14, hexA(COL.ink, 0.65), 1, 'left', 500, MONO, 2);
  }
  ctx.restore();
}

function artChiplets(ctx: Ctx, t: number) {
  // interposer
  const ip = ease.inOutCubic(prog(t, 0, 0.6));
  drawOnRect(ctx, 860, 225, 920, 640, 22, ip, hexA(COL.ink, 0.5), 0.03, 2);
  ctx.fillStyle = hexA(COL.ink, 0.1 * prog(t, 0.2, 0.7));
  ctx.beginPath();
  BUMPS.forEach(([x, y]) => ctx.rect(x, y, 2.5, 2.5));
  ctx.fill();
  label(ctx, 'SILICON INTERPOSER', 1780, 888, 14, hexA(COL.ink, 0.5), prog(t, 0.5, 0.8), 'right', 600, MONO, 3);

  // links first (behind chips)
  const lp = prog(t, 0.95, 1.35);
  if (lp > 0) {
    ctx.beginPath();
    LINKS.forEach(([x1, y1, x2, y2]) => { ctx.moveTo(x1, y1); ctx.lineTo(lerp(x1, x2, lp), lerp(y1, y2, lp)); });
    glowStroke(ctx, COL.ink, 2, 0.7);
    if (t > 1.3) {
      LINKS.forEach(([x1, y1, x2, y2], k) => {
        const u = (t * 1.7 + k * 0.37) % 1;
        ctx.fillStyle = COL.ink;
        ctx.beginPath();
        ctx.arc(lerp(x1, x2, u), lerp(y1, y2, u), 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
  CHIPS.forEach((c) => {
    const p = ease.outBack(prog(t, c.delay, c.delay + 0.55));
    if (p <= 0.001) return;
    const q = clamp(p, 0, 1);
    const k = prog(t, c.delay, c.delay + 0.55);
    const ox = c.from[0] * (1 - ease.outCubic(k));
    const oy = c.from[1] * (1 - ease.outCubic(k));
    ctx.save();
    ctx.translate(ox, oy);
    ctx.globalAlpha = q;
    ctx.beginPath();
    ctx.roundRect(c.x, c.y, c.w, c.h, 10);
    ctx.fillStyle = hexA(c.col, 0.12);
    ctx.fill();
    glowStroke(ctx, c.col, 2.5, 1);
    label(ctx, c.name, c.x + 16, c.y + 30, 16, c.col, 1, 'left', 700, MONO, 3);
    ctx.restore();
    if (t > c.delay + 0.45) {
      ctx.save();
      chipInterior(ctx, t, c, prog(t, c.delay + 0.45, c.delay + 0.75));
      ctx.restore();
    }
  });
  // stat
  const n = Math.round(208 * ease.outExpo(prog(t, 0.7, 1.7)));
  ctx.save();
  setFont(ctx, 96, 700, SANS, -2);
  ctx.fillStyle = COL.coral;
  ctx.textAlign = 'left';
  ctx.globalAlpha = prog(t, 0.7, 0.9);
  ctx.fillText(`${n}B`, 860, 965);
  ctx.restore();
  ctx.letterSpacing = '0px';
  label(ctx, 'TRANSISTORS · ONE PACKAGE', 1200, 940, 22, COL.ink, prog(t, 1.0, 1.25), 'left', 700, MONO, 4);
  label(ctx, 'CPU + GPU + NPU + HBM, STITCHED AS ONE', 1200, 968, 15, hexA(COL.ink, 0.6), prog(t, 1.2, 1.5), 'left', 500, MONO, 2);
}

// ---------------------------------------------------------------- OUTRO
const ERAS = [
  { y: '1837', n: 'ENGINE', c: COL.amber },
  { y: '1945', n: 'VON NEUMANN', c: COL.cyan },
  { y: '1971', n: 'MICROPROCESSOR', c: COL.magenta },
  { y: '1985', n: 'PIPELINING', c: COL.lime },
  { y: '2006', n: 'MULTI-CORE', c: COL.violet },
  { y: '2024', n: 'CHIPLETS', c: COL.coral },
];

function icon(ctx: Ctx, k: number, cx: number, cy: number, c: string, t: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = c;
  ctx.fillStyle = hexA(c, 0.25);
  ctx.lineWidth = 3;
  if (k === 0) {
    gearPath(ctx, 0, 0, 10, 30, t * 1.5, 7);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (k === 1) {
    ctx.strokeRect(-42, -30, 38, 60);
    ctx.strokeRect(10, -30, 32, 60);
    ctx.beginPath();
    ctx.moveTo(-4, -8); ctx.lineTo(10, -8);
    ctx.moveTo(-4, 8); ctx.lineTo(10, 8);
    ctx.stroke();
  } else if (k === 2) {
    ctx.fillRect(-24, -34, 48, 68);
    ctx.strokeRect(-24, -34, 48, 68);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(-24, -26 + i * 13); ctx.lineTo(-34, -26 + i * 13);
      ctx.moveTo(24, -26 + i * 13); ctx.lineTo(34, -26 + i * 13);
    }
    ctx.stroke();
  } else if (k === 3) {
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(-44 + i * 18, -34 + i * 14, 28, 14);
      ctx.strokeRect(-44 + i * 18, -34 + i * 14, 28, 14);
    }
  } else if (k === 4) {
    for (let i = 0; i < 9; i++) {
      const on = Math.sin(t * 7 + i) > 0;
      ctx.fillStyle = hexA(c, on ? 0.85 : 0.2);
      ctx.fillRect(-36 + (i % 3) * 26, -36 + Math.floor(i / 3) * 26, 20, 20);
    }
  } else {
    ctx.fillRect(-40, -32, 44, 40); ctx.strokeRect(-40, -32, 44, 40);
    ctx.fillRect(10, -32, 30, 40); ctx.strokeRect(10, -32, 30, 40);
    ctx.fillRect(-40, 16, 80, 18); ctx.strokeRect(-40, 16, 80, 18);
  }
  ctx.restore();
}

function artOutro(ctx: Ctx, t: number) {
  rain(ctx, t * 0.8, COL.violet, 0.16);
  kinetic(ctx, 'SIX BREAKTHROUGHS. ONE IDEA: DO MORE PER SECOND.', W / 2, 238, 22, t, 0.05, {
    align: 'center', family: MONO, weight: 600, color: hexA(COL.ink, 0.75), spacing: 5, stagger: 0.012, dur: 0.4,
  });
  const cw = 230, gap = 24, x0 = (W - (6 * cw + 5 * gap)) / 2, y0 = 290, ch = 240;
  // connecting line
  const lp = ease.outExpo(prog(t, 0.0, 0.7));
  ctx.strokeStyle = hexA(COL.ink, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + ch + 28);
  ctx.lineTo(x0 + (6 * cw + 5 * gap) * lp, y0 + ch + 28);
  ctx.stroke();
  ERAS.forEach((e, i) => {
    const p = ease.outBack(prog(t, 0.08 + i * 0.07, 0.5 + i * 0.07));
    if (p <= 0.001) return;
    const cx = x0 + i * (cw + gap) + cw / 2, cy = y0 + ch / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(p, p);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    ctx.roundRect(cx - cw / 2, y0, cw, ch, 16);
    ctx.fillStyle = hexA(e.c, 0.08);
    ctx.fill();
    glowStroke(ctx, e.c, 2.5, 1);
    icon(ctx, i, cx, y0 + 88, e.c, t);
    label(ctx, e.y, cx, y0 + 172, 40, COL.ink, 1, 'center', 700, SANS, -1);
    label(ctx, e.n, cx, y0 + 208, 14, e.c, 1, 'center', 600, MONO, 2);
    ctx.restore();
    // node on timeline
    ctx.fillStyle = e.c;
    ctx.beginPath();
    ctx.arc(cx, y0 + ch + 28, 7 * p, 0, Math.PI * 2);
    ctx.fill();
  });
  // traveling dot
  const dp = (t * 0.9) % 1;
  ctx.fillStyle = COL.ink;
  ctx.beginPath();
  ctx.arc(x0 + dp * (6 * cw + 5 * gap), y0 + ch + 28, 5, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createLinearGradient(W / 2 - 560, 0, W / 2 + 560, 0);
  g.addColorStop(0, COL.amber);
  g.addColorStop(0.3, COL.cyan);
  g.addColorStop(0.65, COL.magenta);
  g.addColorStop(1, COL.lime);
  kinetic(ctx, 'IN MOTION.', W / 2, 810, 220, t, 0.45, {
    align: 'center', color: g, spacing: -5, stagger: 0.04, dur: 0.55,
  });
  kinetic(ctx, 'A 15-SECOND MOTION DESIGN SHOWREEL  ·  2026', W / 2, 890, 22, t, 0.95, {
    align: 'center', family: MONO, weight: 600, color: hexA(COL.ink, 0.8), spacing: 6, stagger: 0.01, dur: 0.4,
  });
}

// ---------------------------------------------------------------- scene table
export const SCENES: Scene[] = [
  { name: 'intro', start: 0, end: 1.5, accent: COL.cyan, art: artIntro },
  {
    name: 'gears', start: 1.5, end: 3.5, accent: COL.amber, art: artGears,
    hud: { idx: 1, year: 1837, prev: 1700, title: ['ANALYTICAL', 'ENGINE'], sub: ['Babbage dreams up the first', 'general-purpose computer.'] },
  },
  {
    name: 'neumann', start: 3.5, end: 5.5, accent: COL.cyan, art: artVonNeumann,
    hud: { idx: 2, year: 1945, prev: 1837, title: ['VON NEUMANN', 'ARCHITECTURE'], sub: ['Program and data share memory.', 'The blueprint for everything.'] },
  },
  {
    name: 'chip', start: 5.5, end: 7.5, accent: COL.magenta, art: artChip,
    hud: { idx: 3, year: 1971, prev: 1945, title: ['INTEL 4004', 'MICROPROCESSOR'], sub: ['An entire CPU on a', 'single slice of silicon.'] },
  },
  {
    name: 'pipeline', start: 7.5, end: 9.5, accent: COL.lime, art: artPipeline,
    hud: { idx: 4, year: 1985, prev: 1971, title: ['RISC &', 'PIPELINING'], sub: ['Overlap every stage.', 'One instruction per clock.'] },
  },
  {
    name: 'cores', start: 9.5, end: 11.5, accent: COL.violet, art: artCores,
    hud: { idx: 5, year: 2006, prev: 1985, title: ['MULTI-CORE', 'ERA'], sub: ['Clock speeds hit the wall.', 'So we went wide.'] },
  },
  {
    name: 'chiplets', start: 11.5, end: 13.5, accent: COL.coral, art: artChiplets,
    hud: { idx: 6, year: 2024, prev: 2006, title: ['CHIPLETS &', 'AI SILICON'], sub: ['Heterogeneous dies, stacked', 'and wired as one chip.'] },
  },
  { name: 'outro', start: 13.5, end: 15, accent: COL.violet, art: artOutro },
];

export function sceneIndexAt(t: number) {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start) return i;
  return 0;
}

export function drawScene(ctx: Ctx, idx: number, t: number) {
  const s = SCENES[idx];
  const lt = Math.max(0, t - s.start);
  // slow push-in on every era scene
  if (s.hud) {
    const z = 1 + 0.015 * prog(lt, 0, 2);
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -H / 2);
  }
  s.art(ctx, lt);
  if (s.hud) drawHud(ctx, lt, s.hud, s.accent);
}
