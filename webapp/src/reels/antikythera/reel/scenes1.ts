import { COL, CX, CY, Ctx, E, F, H, TAU, W, clamp, lerp, maskedText, prog, rgba, rng, spaced, spacedWidth, wob } from "./utils";
import { GEARS, POS, drawTrain, trainBase } from "./gears";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a: number) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* 01 — ABYSS                                                          */
/* ------------------------------------------------------------------ */
const rb = rng(7);
const BUBBLES = Array.from({ length: 70 }, () => ({
  x: rb() * W,
  sp: 40 + rb() * 140,
  s: 2 + rb() * 9,
  ph: rb() * 10,
  off: rb() * 1200,
}));
const DUST = Array.from({ length: 140 }, () => ({ x: rb() * W, y: rb() * H, s: 0.6 + rb() * 1.8, sp: 6 + rb() * 18, ph: rb() * 6 }));
const rc = rng(21);
const CRACKS = Array.from({ length: 9 }, (_, i) => {
  const base = (i / 9) * TAU + rc() * 0.5;
  const pts: [number, number][] = [[0, 0]];
  let a = base;
  let r = 0;
  for (let k = 0; k < 7; k++) {
    r += 22 + rc() * 14;
    a += (rc() - 0.5) * 0.7;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
});
const SPECKS = Array.from({ length: 70 }, () => {
  const a = rc() * TAU;
  const d = Math.sqrt(rc()) * 135;
  return { x: Math.cos(a) * d, y: Math.sin(a) * d, s: 1 + rc() * 5, c: rc() };
});

export function sceneAbyss(ctx: Ctx, t: number) {
  if (t > 3.1) return;
  const lineP = E.outExpo(prog(t, 0, 0.4));
  const open = E.inOutExpo(prog(t, 0.2, 1.05));

  if (open < 1) {
    ctx.save();
    ctx.strokeStyle = COL.hot;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - open * 0.8;
    ctx.beginPath();
    ctx.moveTo(CX - (lineP * W) / 2, CY);
    ctx.lineTo(CX + (lineP * W) / 2, CY);
    ctx.stroke();
    glow(ctx, CX, CY, 260 * lineP, COL.gold, 0.35 * (1 - open));
    ctx.restore();
  }
  if (open <= 0) return;

  ctx.save();
  const h = open * H;
  ctx.beginPath();
  ctx.rect(0, CY - h / 2, W, h);
  ctx.clip();

  // water
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0e5666");
  bg.addColorStop(0.4, "#07303c");
  bg.addColorStop(1, "#020a0e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // god-rays
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) {
    const x0 = 80 + i * 260 + Math.sin(t * 0.5 + i * 1.7) * 80;
    const dir = i % 2 ? -1 : 1;
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.95);
    g.addColorStop(0, "rgba(130,240,225,0.17)");
    g.addColorStop(1, "rgba(130,240,225,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    ctx.lineTo(x0 + 80 + (i % 3) * 20, 0);
    ctx.lineTo(x0 + 80 + dir * 300 + 160, H * 0.95);
    ctx.lineTo(x0 + dir * 300 - 60, H * 0.95);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // dust
  ctx.fillStyle = "rgba(190,255,245,0.35)";
  for (const d of DUST) {
    const y = (d.y - t * d.sp + H * 4) % H;
    ctx.globalAlpha = 0.25 + 0.35 * Math.sin(t * 1.5 + d.ph) ** 2;
    ctx.beginPath();
    ctx.arc(d.x + Math.sin(t * 0.7 + d.ph) * 14, y, d.s, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // sea bed silhouettes
  const rise = E.out3(prog(t, 0.3, 2.2));
  for (let l = 0; l < 2; l++) {
    ctx.fillStyle = l ? "#020b0f" : "#04161c";
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) {
      const y = H - (70 + l * -30) * rise - (110 + l * 60) * (0.5 + 0.5 * wob(x * 0.0035 + l * 3, l)) * rise;
      ctx.lineTo(x, y + 60 * (1 - rise));
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  }

  // bubbles
  ctx.lineWidth = 1.5;
  for (const b of BUBBLES) {
    const y = H + 40 - ((t * b.sp + b.off) % (H + 80));
    const x = b.x + Math.sin(t * 1.6 + b.ph) * 18;
    ctx.strokeStyle = "rgba(200,255,250,0.45)";
    ctx.beginPath();
    ctx.arc(x, y, b.s, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(x - b.s * 0.35, y - b.s * 0.35, b.s * 0.22, 0, TAU);
    ctx.fill();
  }

  // depth ruler (left)
  const rulerA = prog(t, 0.6, 1.1);
  ctx.save();
  ctx.globalAlpha = rulerA;
  ctx.strokeStyle = rgba(COL.cream, 0.55);
  ctx.fillStyle = rgba(COL.cream, 0.7);
  ctx.font = `500 15px ${F.mono}`;
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 60; k++) {
    const y = 40 * k - 120 * t + 1100 - 100;
    if (y < 240 || y > 820) continue;
    const major = k % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(96, y);
    ctx.lineTo(96 + (major ? 44 : 20), y);
    ctx.stroke();
    if (major) ctx.fillText(`${k * 2}M`, 150, y + 5);
  }
  // readout
  const depth = Math.round(42 * E.out2(prog(t, 0.5, 2.3)));
  ctx.fillStyle = rgba(COL.gold, 0.9);
  ctx.font = `500 18px ${F.mono}`;
  spaced(ctx, "DEPTH", 96, 880, 8);
  ctx.fillStyle = COL.cream;
  ctx.font = `400 74px ${F.mono}`;
  const dw = ctx.measureText(`${depth}`).width;
  ctx.fillText(`${depth}`, 96, 950);
  ctx.font = `500 26px ${F.mono}`;
  ctx.fillText("M", 96 + dw + 8, 950);
  // coordinates
  ctx.textAlign = "right";
  ctx.font = `500 20px ${F.mono}`;
  ctx.fillStyle = rgba(COL.cream, 0.75);
  spaced(ctx, "35°52′N  23°18′E", W - 96, 200, 6, "right");
  ctx.restore();

  // 1901 counter
  const ex = prog(t, 1.95, 2.65);
  const size = 400;
  ctx.save();
  ctx.translate(CX, CY - 10 - ex * 70);
  ctx.scale(1 + ex * 0.35, 1 + ex * 0.35);
  ctx.translate(-CX, -(CY - 10));
  ctx.globalAlpha = 1 - E.in2(ex);
  ctx.font = `400 ${size}px ${F.disp}`;
  const cell = ctx.measureText("0").width;
  const gap = 18;
  const total = cell * 4 + gap * 3;
  const x0 = CX - total / 2;
  const baseY = CY + 140;
  const target = [1, 9, 0, 1];
  ctx.beginPath();
  ctx.rect(x0 - 20, baseY - size * 0.92, total + 40, size * 1.0);
  ctx.save();
  ctx.clip();
  ctx.textAlign = "center";
  for (let i = 0; i < 4; i++) {
    const p = E.outExpo(prog(t, 0.55 + i * 0.12, 1.75 + i * 0.12));
    const v = p * (target[i] + 20);
    const lh = size * 1.0;
    for (const ghost of [0, 1, 2]) {
      const gv = v - (ghost === 1 ? 0.35 : ghost === 2 ? -0.35 : 0);
      if (ghost && p > 0.97) continue;
      ctx.globalAlpha = (1 - E.in2(ex)) * (ghost ? 0.28 : 1);
      for (let k = Math.floor(gv) - 1; k <= Math.floor(gv) + 2; k++) {
        const dg = ((k % 10) + 10) % 10;
        const y = baseY + (k - gv) * lh;
        ctx.fillStyle = i === 3 && p > 0.99 ? COL.gold : COL.cream;
        ctx.fillText(String(dg), x0 + cell / 2 + i * (cell + gap), y);
      }
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1 - E.in2(ex);
  // kicker + sub
  const kp = prog(t, 0.75, 1.7);
  ctx.font = `600 26px ${F.mono}`;
  ctx.fillStyle = rgba(COL.gold, E.out2(prog(t, 0.75, 1.2)));
  spaced(ctx, "FIELD LOG  —  OCTOBER", CX, baseY - size * 0.92 - 36, lerp(44, 12, E.outExpo(kp)), "center");
  ctx.font = `500 24px ${F.mono}`;
  ctx.fillStyle = rgba(COL.cream, E.out2(prog(t, 1.2, 1.8)));
  spaced(ctx, "SPONGE DIVERS · ANTIKYTHERA SHIPWRECK · GREECE", CX, baseY + 58, lerp(30, 8, E.outExpo(prog(t, 1.2, 2.1))), "center");
  // underline
  ctx.strokeStyle = rgba(COL.gold, 0.8);
  ctx.lineWidth = 2;
  const lp = E.outExpo(prog(t, 1.4, 2.0));
  ctx.beginPath();
  ctx.moveTo(CX - (total / 2) * lp, baseY + 20);
  ctx.lineTo(CX + (total / 2) * lp, baseY + 20);
  ctx.stroke();
  ctx.restore();

  // the lump
  const lp2 = E.out3(prog(t, 1.9, 2.7));
  if (lp2 > 0) {
    const crack = E.in2(prog(t, 2.15, 2.7));
    const ly = lerp(H + 260, CY, lp2);
    ctx.save();
    ctx.translate(CX + Math.sin(t * 90) * 4 * crack, ly + Math.cos(t * 77) * 4 * crack);
    glow(ctx, 0, 0, 120 + 520 * crack, COL.gold, 0.75 * crack);
    ctx.beginPath();
    for (let k = 0; k <= 96; k++) {
      const a = (k / 96) * TAU;
      const r = 150 * (1 + 0.16 * wob(a, 3) + 0.06 * wob(a * 2.7, 9));
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r * 0.92;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const lg = ctx.createRadialGradient(-40, -50, 10, 0, 0, 170);
    lg.addColorStop(0, "#5c7d69");
    lg.addColorStop(0.6, "#243a33");
    lg.addColorStop(1, "#0a1513");
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (const s of SPECKS) {
      ctx.fillStyle = s.c > 0.6 ? "rgba(214,120,60,0.55)" : s.c > 0.3 ? "rgba(120,200,170,0.4)" : "rgba(0,0,0,0.5)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.s, 0, TAU);
      ctx.fill();
    }
    // cracks
    ctx.globalCompositeOperation = "lighter";
    for (const c of CRACKS) {
      ctx.beginPath();
      const n = Math.floor(c.length * clamp(crack * 1.2));
      for (let k = 0; k < n; k++) (k ? ctx.lineTo(c[k][0], c[k][1]) : ctx.moveTo(c[k][0], c[k][1]));
      ctx.strokeStyle = rgba(COL.hot, 0.95);
      ctx.lineWidth = 3 + crack * 6;
      ctx.stroke();
      ctx.strokeStyle = rgba(COL.gold, 0.5);
      ctx.lineWidth = 12 * crack;
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* 02/03 — MECHANISM (gear train, camera dive, callouts)               */
/* ------------------------------------------------------------------ */
export interface Cam {
  s: number;
  x: number;
  y: number;
  rot: number;
}

export function camAt(t: number): Cam {
  if (t < 5.0) {
    const p = prog(t, 2.7, 5.0);
    return { s: 0.66 + 0.16 * E.out2(p), x: 80, y: 20, rot: 0.1 * (1 - E.out2(p)) };
  }
  const q = E.inOut3(prog(t, 5.0, 7.9));
  const dive = E.inExpo(prog(t, 7.8, 8.35));
  return {
    s: lerp(0.82, 2.0, q) * (1 + 2.6 * dive),
    x: lerp(80, 40, q),
    y: lerp(20, -30, q),
    rot: lerp(0, -0.22, q) - dive * 0.35,
  };
}

export function applyCam(ctx: Ctx, c: Cam) {
  ctx.translate(CX, CY);
  ctx.rotate(c.rot);
  ctx.scale(c.s, c.s);
  ctx.translate(-c.x, -c.y);
}

export function worldToScreen(c: Cam, wx: number, wy: number): [number, number] {
  const dx = (wx - c.x) * c.s;
  const dy = (wy - c.y) * c.s;
  const cs = Math.cos(c.rot);
  const sn = Math.sin(c.rot);
  return [CX + dx * cs - dy * sn, CY + dx * sn + dy * cs];
}

const rr = rng(99);
const STREAKS = Array.from({ length: 90 }, () => ({ a: rr() * TAU, l: 0.4 + rr() * 0.6, o: rr() }));

export function sceneMechanism(ctx: Ctx, t: number) {
  if (t < 2.7 || t > 8.5) return;
  const a = prog(t, 2.7, 3.0);
  const cam = camAt(t);

  ctx.save();
  ctx.globalAlpha = a;
  const bg = ctx.createRadialGradient(CX, CY, 50, CX, CY, 1200);
  bg.addColorStop(0, "#12242d");
  bg.addColorStop(1, "#04070b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  applyCam(ctx, cam);
  // blueprint grid
  ctx.strokeStyle = rgba(COL.verdigris, 0.07);
  ctx.lineWidth = 1 / cam.s + 0.5;
  ctx.beginPath();
  for (let g = -3000; g <= 3000; g += 100) {
    ctx.moveTo(g, -3000);
    ctx.lineTo(g, 3000);
    ctx.moveTo(-3000, g);
    ctx.lineTo(3000, g);
  }
  ctx.stroke();
  // construction rings
  ctx.strokeStyle = rgba(COL.gold, 0.1);
  ctx.setLineDash([6, 10]);
  for (let r = 300; r <= 1500; r += 300) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  glow(ctx, 160, 0, 900, COL.bronze, 0.22 * E.out2(prog(t, 2.8, 4)));
  drawTrain(ctx, t, trainBase(t), 2.8, 1, 0);
  ctx.restore();

  // headline
  headline(ctx, t);
  // callouts + marquee
  callouts(ctx, t, cam);
  marquee(ctx, t);

  // warp streaks into the dial
  const sp = prog(t, 7.6, 8.3);
  if (sp > 0) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(CX, CY);
    for (const s of STREAKS) {
      const r0 = lerp(120, 700, E.in2(clamp(sp * 1.4 - s.o * 0.4)));
      const r1 = r0 + 260 * s.l * sp;
      ctx.strokeStyle = rgba(COL.hot, 0.5 * sp);
      ctx.lineWidth = 1 + s.l * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(s.a) * r0, Math.sin(s.a) * r0);
      ctx.lineTo(Math.cos(s.a) * r1, Math.sin(s.a) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function headline(ctx: Ctx, t: number) {
  const inA = prog(t, 3.0, 3.4);
  const outA = prog(t, 4.85, 5.25);
  if (inA <= 0 || outA >= 1) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 1250, 0);
  g.addColorStop(0, "rgba(4,7,11,0.88)");
  g.addColorStop(1, "rgba(4,7,11,0)");
  ctx.globalAlpha = inA * (1 - outA);
  ctx.fillStyle = g;
  ctx.fillRect(0, 520, 1300, 560);
  ctx.globalAlpha = 1;

  const lines = [
    { s: "ANALOG", y: 845, t0: 3.25 },
    { s: "COMPUTER", y: 1000, t0: 3.4 },
  ];
  ctx.font = `600 28px ${F.mono}`;
  const kick = "c. 100 BCE — THE WORLD'S FIRST";
  maskedText(
    ctx,
    () => {
      ctx.font = `600 28px ${F.mono}`;
      ctx.fillStyle = COL.gold;
      spaced(ctx, kick, 112, 650, 10);
    },
    112,
    650,
    28,
    900,
    prog(t, 3.05, 3.5),
    prog(t, 4.85, 5.1)
  );
  const size = 172;
  for (const l of lines) {
    ctx.font = `400 ${size}px ${F.disp}`;
    const w = spacedWidth(ctx, l.s, 4);
    maskedText(
      ctx,
      () => {
        ctx.font = `400 ${size}px ${F.disp}`;
        const gg = ctx.createLinearGradient(0, l.y - size, 0, l.y);
        gg.addColorStop(0, COL.hot);
        gg.addColorStop(1, COL.cream);
        ctx.fillStyle = l.s === "COMPUTER" ? gg : COL.cream;
        spaced(ctx, l.s, 104, l.y, 4);
      },
      104,
      l.y,
      size,
      w,
      prog(t, l.t0, l.t0 + 0.55),
      prog(t, 4.9 + (l.t0 - 3.25) * 0.4, 5.2 + (l.t0 - 3.25) * 0.4)
    );
  }
  ctx.restore();
}

interface Callout {
  t0: number;
  anchor: [number, number];
  panel: [number, number];
  conn: [number, number];
  num: number;
  title: string;
  sub: string;
}

const CALLS: Callout[] = [
  { t0: 5.55, anchor: [0, 0], panel: [110, 170], conn: [570, 275], num: 37, title: "BRONZE GEARS", sub: "HAND-CUT · INTERLOCKING" },
  { t0: 6.15, anchor: [POS[1].x, POS[1].y + POS[1].r * 0.5], panel: [1370, 170], conn: [1370, 275], num: 223, title: "LUNAR MONTHS", sub: "THE SAROS ECLIPSE CYCLE" },
  { t0: 6.75, anchor: [225, 82], panel: [1370, 640], conn: [1370, 745], num: 19, title: "YEAR METONIC CYCLE", sub: "MOON & SUN REALIGN" },
];

function callouts(ctx: Ctx, t: number, cam: Cam) {
  const outA = 1 - prog(t, 7.55, 7.85);
  if (outA <= 0) return;
  for (const c of CALLS) {
    const p = prog(t, c.t0, c.t0 + 0.55);
    if (p <= 0) continue;
    const [ax, ay] = worldToScreen(cam, c.anchor[0], c.anchor[1]);
    const [px, py] = c.panel;
    const pw = 470;
    const ph = 215;
    ctx.save();
    ctx.globalAlpha = outA;
    // anchor dot with pulse
    const pulse = (t * 1.4) % 1;
    ctx.strokeStyle = rgba(COL.hot, 0.8 * (1 - pulse));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ax, ay, 10 + pulse * 34, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = COL.hot;
    ctx.beginPath();
    ctx.arc(ax, ay, 6 * E.outBack(p), 0, TAU);
    ctx.fill();
    // connector
    const lp = E.outExpo(prog(t, c.t0 + 0.1, c.t0 + 0.6));
    ctx.strokeStyle = rgba(COL.hot, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lerp(ax, c.conn[0], lp), lerp(ay, c.conn[1], lp));
    ctx.stroke();
    // panel
    const pp = E.outExpo(prog(t, c.t0 + 0.2, c.t0 + 0.75));
    ctx.translate(px, py);
    ctx.beginPath();
    ctx.rect(0, 0, pw, ph * pp);
    ctx.clip();
    ctx.fillStyle = "rgba(4,9,13,0.78)";
    ctx.fillRect(0, 0, pw, ph);
    ctx.fillStyle = COL.gold;
    ctx.fillRect(0, 0, 4, ph);
    ctx.strokeStyle = rgba(COL.gold, 0.25);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, pw - 1, ph - 1);
    const n = Math.round(c.num * E.outExpo(prog(t, c.t0 + 0.3, c.t0 + 1.3)));
    ctx.font = `400 128px ${F.disp}`;
    ctx.fillStyle = COL.hot;
    ctx.fillText(String(n), 32, 140);
    ctx.font = `600 24px ${F.mono}`;
    ctx.fillStyle = COL.cream;
    const title = c.title.slice(0, Math.ceil(c.title.length * prog(t, c.t0 + 0.4, c.t0 + 0.9)));
    spaced(ctx, title, 32, 178, 5);
    ctx.font = `500 16px ${F.mono}`;
    ctx.fillStyle = rgba(COL.verdigris, 0.95);
    const sub = c.sub.slice(0, Math.ceil(c.sub.length * prog(t, c.t0 + 0.55, c.t0 + 1.1)));
    spaced(ctx, sub, 32, 202, 4);
    ctx.restore();
  }
}

function marquee(ctx: Ctx, t: number) {
  const a = prog(t, 5.3, 5.65) * (1 - prog(t, 7.6, 7.9));
  if (a <= 0) return;
  const text = "37 BRONZE GEARS   ///   NO ELECTRICITY   ///   HAND-CRANKED   ///   CALCULATES THE SKY   ///   ";
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(4,9,13,0.8)";
  ctx.fillRect(0, 930, W, 64);
  ctx.fillStyle = COL.gold;
  ctx.fillRect(0, 930, W * E.outExpo(prog(t, 5.3, 5.9)), 2);
  ctx.font = `600 28px ${F.mono}`;
  ctx.fillStyle = COL.cream;
  const w = spacedWidth(ctx, text, 6);
  const off = ((t - 5.2) * 340) % w;
  for (let k = -1; k < 3; k++) spaced(ctx, text, -off + k * w, 972, 6);
  ctx.restore();
}

export { GEARS };
