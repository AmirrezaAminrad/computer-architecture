import { COL, CX, CY, Ctx, E, F, H, TAU, W, clamp, lerp, maskedText, prog, rgba, rng, spaced, spacedWidth } from "./utils";
import { drawTrain, toothPath, trainBase } from "./gears";
import { glow } from "./scenes1";

/* ------------------------------------------------------------------ */
/* 04 — THE DIAL                                                       */
/* ------------------------------------------------------------------ */
const ZODIAC = [
  "ΚΡΙΟΣ", "ΤΑΥΡΟΣ", "ΔΙΔΥΜΟΙ", "ΚΑΡΚΙΝΟΣ", "ΛΕΩΝ", "ΠΑΡΘΕΝΟΣ",
  "ΧΗΛΑΙ", "ΣΚΟΡΠΙΟΣ", "ΤΟΞΟΤΗΣ", "ΑΙΓΟΚΕΡΩΣ", "ΥΔΡΟΧΟΟΣ", "ΙΧΘΥΕΣ",
];

interface Body {
  name: string;
  r: number;
  w: number;
  col: string;
  sz: number;
}
const BODIES: Body[] = [
  { name: "MOON", r: 72, w: 3.4, col: "#f4ead2", sz: 9 },
  { name: "MERCURY", r: 114, w: 2.5, col: "#cfd8dc", sz: 7 },
  { name: "VENUS", r: 156, w: 1.9, col: "#ffd9a0", sz: 10 },
  { name: "SUN", r: 198, w: 1.3, col: "#f0b95a", sz: 15 },
  { name: "MARS", r: 240, w: 0.95, col: "#ff6a3d", sz: 9 },
  { name: "JUPITER", r: 282, w: 0.65, col: "#e8b98a", sz: 13 },
  { name: "SATURN", r: 324, w: 0.45, col: "#d9c07a", sz: 11 },
];

function arcSweep(ctx: Ctx, r: number, p: number) {
  if (p <= 0) return;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * p);
  ctx.stroke();
}

export function sceneDial(ctx: Ctx, t: number) {
  if (t > 11.6) return;
  const u = t - 8.0;
  const exitP = prog(t, 11.0, 11.55);
  ctx.save();
  ctx.globalAlpha = 1 - E.in2(exitP);

  // background
  const bg = ctx.createRadialGradient(CX, CY, 40, CX, CY, 1100);
  bg.addColorStop(0, "#0f2029");
  bg.addColorStop(0.6, "#071016");
  bg.addColorStop(1, "#03060a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.translate(CX, CY);
  const sc = (1.14 - 0.14 * E.out3(prog(t, 8.0, 9.6))) * (1 + 0.9 * E.inCubic(exitP));
  ctx.scale(sc, sc);

  // polar grid
  ctx.strokeStyle = rgba(COL.verdigris, 0.06);
  ctx.lineWidth = 1;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 60, Math.sin(a) * 60);
    ctx.lineTo(Math.cos(a) * 1100, Math.sin(a) * 1100);
    ctx.stroke();
  }

  // outer zodiac ring (counter-rotating group)
  ctx.save();
  ctx.rotate(-0.035 * u);
  ctx.strokeStyle = rgba(COL.gold, 0.9);
  ctx.lineWidth = 2.5;
  const p1 = E.inOutExpo(prog(t, 8.0, 8.9));
  arcSweep(ctx, 452, p1);
  ctx.lineWidth = 1.5;
  arcSweep(ctx, 412, p1);
  for (let k = 0; k < 12; k++) {
    const ap = prog(t, 8.5 + k * 0.045, 8.85 + k * 0.045);
    if (ap <= 0) continue;
    const a = (k / 12) * TAU - Math.PI / 2;
    ctx.strokeStyle = rgba(COL.gold, 0.8 * ap);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 412, Math.sin(a) * 412);
    ctx.lineTo(Math.cos(a) * 452, Math.sin(a) * 452);
    ctx.stroke();
    ctx.save();
    ctx.rotate(a + TAU / 24 + Math.PI / 2);
    ctx.translate(0, -427);
    ctx.globalAlpha = ap * (1 - E.in2(exitP));
    ctx.font = `700 15px ${F.mono}`;
    ctx.fillStyle = COL.cream;
    spaced(ctx, ZODIAC[k], 0, 0, 2.5, "center");
    ctx.restore();
  }
  ctx.restore();

  // calendar ring with 365 ticks
  ctx.save();
  ctx.rotate(0.05 * u);
  ctx.strokeStyle = rgba(COL.gold, 0.75);
  ctx.lineWidth = 2;
  const p2 = E.inOutExpo(prog(t, 8.2, 9.0));
  arcSweep(ctx, 404, p2);
  ctx.lineWidth = 1.2;
  arcSweep(ctx, 364, p2);
  const sweep = E.inOutExpo(prog(t, 8.25, 9.5));
  const nT = Math.floor(365 * sweep);
  ctx.beginPath();
  for (let i = 0; i < nT; i++) {
    if (i % 5 === 0) continue;
    const a = (i / 365) * TAU - Math.PI / 2;
    ctx.moveTo(Math.cos(a) * 402, Math.sin(a) * 402);
    ctx.lineTo(Math.cos(a) * 391, Math.sin(a) * 391);
  }
  ctx.strokeStyle = rgba(COL.cream, 0.4);
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < nT; i++) {
    if (i % 5 !== 0) continue;
    const big = i % 30 === 0;
    const a = (i / 365) * TAU - Math.PI / 2;
    const l = big ? 38 : 22;
    ctx.moveTo(Math.cos(a) * 402, Math.sin(a) * 402);
    ctx.lineTo(Math.cos(a) * (402 - l), Math.sin(a) * (402 - l));
  }
  ctx.strokeStyle = rgba(COL.gold, 0.95);
  ctx.lineWidth = 1.8;
  ctx.stroke();
  // scanning head
  if (sweep > 0 && sweep < 1) {
    const a = sweep * TAU - Math.PI / 2;
    glow(ctx, Math.cos(a) * 390, Math.sin(a) * 390, 60, COL.hot, 0.9);
  }
  ctx.restore();

  // orbits
  BODIES.forEach((b, i) => {
    const op = E.out3(prog(t, 8.35 + i * 0.1, 9.1 + i * 0.1));
    if (op <= 0) return;
    ctx.save();
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = rgba(COL.cream, 0.22);
    ctx.lineWidth = 1.2;
    arcSweep(ctx, b.r, op);
    ctx.restore();
  });

  // earth
  const ep = E.outBack(prog(t, 8.5, 9.0));
  if (ep > 0) {
    const g = ctx.createRadialGradient(-6, -6, 2, 0, 0, 24);
    g.addColorStop(0, "#9ff3df");
    g.addColorStop(0.5, "#2a9d8f");
    g.addColorStop(1, "#0b3b45");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 24 * ep, 0, TAU);
    ctx.fill();
    glow(ctx, 0, 0, 110, COL.verdigris, 0.3 * ep);
  }

  // bodies
  const bodyPos: { x: number; y: number; th: number }[] = [];
  BODIES.forEach((b, i) => {
    const th = i * 1.3 + b.w * u * 1.15 - 1.2;
    const x = Math.cos(th) * b.r;
    const y = Math.sin(th) * b.r;
    bodyPos.push({ x, y, th });
    const s = E.outBack(prog(t, 8.8 + i * 0.1, 9.3 + i * 0.1));
    if (s <= 0) return;
    // trail
    for (let k = 0; k < 16; k++) {
      const a0 = th - k * 0.06;
      const a1 = th - (k + 1) * 0.06;
      ctx.strokeStyle = rgba(b.col, 0.8 * (1 - k / 16) * s);
      ctx.lineWidth = b.sz * 0.55 * (1 - k / 20);
      ctx.beginPath();
      ctx.arc(0, 0, b.r, a1, a0);
      ctx.stroke();
    }
    if (b.name === "SUN") glow(ctx, x, y, 90, COL.gold, 0.8 * s);
    ctx.fillStyle = b.col;
    ctx.beginPath();
    ctx.arc(x, y, b.sz * s, 0, TAU);
    ctx.fill();
    if (b.name === "SATURN") {
      ctx.strokeStyle = rgba(b.col, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, b.sz * 1.9 * s, b.sz * 0.6 * s, -0.4, 0, TAU);
      ctx.stroke();
    }
    if (b.name === "MOON") {
      ctx.fillStyle = "rgba(4,7,11,0.55)";
      ctx.beginPath();
      ctx.arc(x + b.sz * 0.35, y, b.sz * s * 0.95, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
    }
    // label
    ctx.globalAlpha = 0.85 * s * (1 - E.in2(exitP));
    ctx.font = `600 12px ${F.mono}`;
    ctx.fillStyle = COL.cream;
    spaced(ctx, b.name, x + b.sz + 10, y - b.sz - 4, 3);
    ctx.globalAlpha = 1 - E.in2(exitP);
  });

  // pointers
  const pp = E.outExpo(prog(t, 9.4, 10.0));
  if (pp > 0) {
    const sun = bodyPos[3];
    const moon = bodyPos[0];
    for (const [bp, col, len, lw] of [
      [sun, COL.gold, 402, 2.4],
      [moon, COL.cream, 340, 1.4],
    ] as const) {
      ctx.strokeStyle = rgba(col, 0.55);
      ctx.lineWidth = lw;
      const L = len * pp;
      ctx.beginPath();
      ctx.moveTo(Math.cos(bp.th) * 30, Math.sin(bp.th) * 30);
      ctx.lineTo(Math.cos(bp.th) * L, Math.sin(bp.th) * L);
      ctx.stroke();
      ctx.fillStyle = rgba(col, 0.95);
      ctx.beginPath();
      const tx = Math.cos(bp.th) * L;
      const ty = Math.sin(bp.th) * L;
      ctx.arc(tx, ty, 6, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  // ---------- screen-space typography ----------
  ctx.save();
  ctx.globalAlpha = 1 - E.in2(exitP);
  const words = ["SUN", "MOON", "5 PLANETS", "ECLIPSES"];
  words.forEach((wd, i) => {
    const y = 400 + i * 118;
    const size = 66;
    ctx.font = `400 ${size}px ${F.disp}`;
    const w = spacedWidth(ctx, wd, 3);
    const pin = prog(t, 8.6 + i * 0.25, 9.1 + i * 0.25);
    maskedText(
      ctx,
      () => {
        ctx.font = `400 ${size}px ${F.disp}`;
        ctx.fillStyle = i === 3 ? COL.gold : COL.cream;
        spaced(ctx, wd, 80, y, 3);
        ctx.font = `600 14px ${F.mono}`;
        ctx.fillStyle = COL.gold;
        spaced(ctx, `0${i + 1} /`, 80, y - size - 8, 4);
      },
      80,
      y,
      size + 26,
      w + 80,
      pin,
      prog(t, 10.9 + i * 0.05, 11.2 + i * 0.05)
    );
  });

  // right column
  const rx = W - 96;
  ctx.font = `600 18px ${F.mono}`;
  ctx.fillStyle = rgba(COL.gold, E.out2(prog(t, 8.9, 9.3)));
  const head = "FOUR DIALS · ONE CRANK";
  spaced(ctx, head.slice(0, Math.ceil(head.length * prog(t, 8.9, 9.6))), rx, 306, 5, "right");
  const rows = [
    ["METONIC · 19 YRS", 0.95],
    ["SAROS · 223 MONTHS", 0.72],
    ["CALLIPPIC · 76 YRS", 0.84],
    ["EXELIGMOS · 54 YRS", 0.58],
  ] as const;
  rows.forEach(([name, v], i) => {
    const y = 388 + i * 92;
    const a = prog(t, 9.1 + i * 0.18, 9.6 + i * 0.18);
    if (a <= 0) return;
    ctx.globalAlpha = a * (1 - E.in2(exitP));
    ctx.font = `600 22px ${F.mono}`;
    ctx.fillStyle = COL.cream;
    spaced(ctx, name, rx, y - (1 - E.outExpo(a)) * -20, 3, "right");
    const bw = 384;
    ctx.fillStyle = "rgba(244,234,210,0.15)";
    ctx.fillRect(rx - bw, y + 16, bw, 4);
    const bp = E.outExpo(prog(t, 9.3 + i * 0.18, 10.3 + i * 0.18));
    const gg = ctx.createLinearGradient(rx - bw, 0, rx, 0);
    gg.addColorStop(0, COL.bronze);
    gg.addColorStop(1, COL.hot);
    ctx.fillStyle = gg;
    ctx.fillRect(rx - bw, y + 16, bw * v * bp, 4);
  });
  ctx.globalAlpha = 1 - E.in2(exitP);

  // moon-phase widget
  const wa = E.outBack(prog(t, 9.6, 10.1));
  if (wa > 0) {
    ctx.save();
    ctx.translate(1632, 862);
    ctx.scale(wa, wa);
    drawMoonPhase(ctx, (u * 0.17) % 1, 64);
    ctx.restore();
    ctx.font = `600 15px ${F.mono}`;
    ctx.fillStyle = rgba(COL.gold, wa);
    spaced(ctx, "LUNAR PHASE", 1632, 862 + 64 + 36, 6, "center");
  }
  ctx.restore();
}

function drawMoonPhase(ctx: Ctx, phase: number, r: number) {
  ctx.save();
  glow(ctx, 0, 0, r * 2.2, COL.cream, 0.18);
  ctx.fillStyle = "#0c1a22";
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  const waning = phase > 0.5;
  const ph = waning ? 1 - phase : phase;
  const k = Math.cos(ph * TAU);
  if (waning) ctx.scale(-1, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
  ctx.ellipse(0, 0, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, "#fffaf0");
  g.addColorStop(1, "#d6c9a5");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = rgba(COL.gold, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r + 8, 0, TAU);
  ctx.stroke();
}

/* ------------------------------------------------------------------ */
/* 05 — ECLIPSE                                                        */
/* ------------------------------------------------------------------ */
const rs = rng(1234);
const STARS = Array.from({ length: 230 }, () => ({ x: rs() * W, y: rs() * H, s: 0.5 + rs() * 1.8, ph: rs() * 6 }));
const RAYS = Array.from({ length: 130 }, () => ({ a: rs() * TAU, l: rs(), ph: rs() * 6 }));
const STREAMERS = Array.from({ length: 40 }, (_, i) => ({ a: (i / 40) * TAU + rs() * 0.1, l: 0.4 + rs(), w: 0.04 + rs() * 0.07, ph: rs() * 6 }));

export function sceneEclipse(ctx: Ctx, t: number) {
  if (t < 10.9 || t > 13.65) return;
  const a = E.out2(prog(t, 10.95, 11.6));
  const ex = CX;
  const ey = 470;
  const R = 140;
  const dx = t < 12.35 ? lerp(-600, -4, E.inOut3(prog(t, 11.25, 12.35))) : -4 + (t - 12.35) * 46;
  const cover = clamp(1 - Math.abs(dx) / 320);
  const cov2 = cover * cover;

  ctx.save();
  ctx.globalAlpha = a;
  const bg = ctx.createRadialGradient(ex, ey, 50, ex, ey, 1100);
  bg.addColorStop(0, lerpColor("#0b1a26", "#04080d", cover));
  bg.addColorStop(1, "#010204");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // stars
  for (const s of STARS) {
    const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + s.ph);
    ctx.fillStyle = `rgba(255,248,230,${(0.15 + 0.85 * cover) * (0.35 + 0.65 * tw)})`;
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }

  // ghost mechanism
  ctx.save();
  ctx.translate(CX, CY + 40);
  ctx.rotate(t * 0.03);
  ctx.scale(0.62, 0.62);
  drawTrain(ctx, 99, trainBase(t) * 0.8, 0, 0.16, 0);
  ctx.restore();

  // radar rings
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 4; k++) {
    const p = (t * 0.55 + k * 0.25) % 1;
    ctx.strokeStyle = rgba(COL.gold, (1 - p) * 0.28 * a);
    ctx.beginPath();
    ctx.arc(ex, ey, 200 + E.out2(p) * 760, 0, TAU);
    ctx.stroke();
  }

  // sun
  glow(ctx, ex, ey, 760, COL.gold, 0.5 * (1 - 0.35 * cover));
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const r of RAYS) {
    const len = R * (1.1 + r.l * 0.9 + 0.12 * Math.sin(t * 3 + r.ph));
    ctx.strokeStyle = rgba(COL.hot, 0.2 * (1 - cover * 0.6));
    ctx.lineWidth = 1 + r.l * 2;
    ctx.beginPath();
    ctx.moveTo(ex + Math.cos(r.a) * R, ey + Math.sin(r.a) * R);
    ctx.lineTo(ex + Math.cos(r.a) * len, ey + Math.sin(r.a) * len);
    ctx.stroke();
  }
  ctx.restore();
  const sg = ctx.createRadialGradient(ex, ey, 10, ex, ey, R);
  sg.addColorStop(0, "#fffbe8");
  sg.addColorStop(0.7, "#ffd27a");
  sg.addColorStop(1, "#f29a3a");
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(ex, ey, R, 0, TAU);
  ctx.fill();

  // corona (behind the moon)
  if (cover > 0) {
    glow(ctx, ex, ey, R * 3.6, "#ffe9b8", 0.85 * cov2);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of STREAMERS) {
      const L = R * (1.7 + s.l * 2.4) * (0.9 + 0.1 * Math.sin(t * 1.5 + s.ph));
      const g = ctx.createLinearGradient(ex, ey, ex + Math.cos(s.a) * L, ey + Math.sin(s.a) * L);
      g.addColorStop(0, rgba("#ffe9b8", 0.5 * cov2));
      g.addColorStop(1, rgba("#ffe9b8", 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(s.a - s.w) * R, ey + Math.sin(s.a - s.w) * R);
      ctx.lineTo(ex + Math.cos(s.a) * L, ey + Math.sin(s.a) * L);
      ctx.lineTo(ex + Math.cos(s.a + s.w) * R, ey + Math.sin(s.a + s.w) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // moon (drawn after corona so it stays a dark silhouette)
  const mg = ctx.createRadialGradient(ex + dx - 30, ey - 30, 10, ex + dx, ey, R + 4);
  mg.addColorStop(0, "#0b1218");
  mg.addColorStop(1, "#010203");
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(ex + dx, ey, R + 3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba("#ffe9b8", 0.15 + 0.6 * cov2);
  ctx.lineWidth = 2;
  ctx.stroke();

  // diamond-ring flare
  const fl = Math.exp(-Math.pow((t - 12.32) / 0.1, 2));
  if (fl > 0.01) {
    const fx = ex + R * 0.95;
    const fy = ey - R * 0.2;
    glow(ctx, fx, fy, 320, "#ffffff", fl);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `rgba(255,255,255,${fl})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx - 520 * fl, fy);
    ctx.lineTo(fx + 520 * fl, fy);
    ctx.moveTo(fx, fy - 260 * fl);
    ctx.lineTo(fx, fy + 260 * fl);
    ctx.stroke();
    ctx.restore();
  }

  // totality callout
  const cp = prog(t, 12.4, 12.9);
  if (cp > 0) {
    const lx = ex + R * 1.6;
    const ly = ey - R * 1.5;
    const ex2 = lerp(lx, lx + 150, E.outExpo(cp));
    ctx.strokeStyle = rgba(COL.hot, 0.9);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 90);
    ctx.lineTo(lx, ly);
    ctx.lineTo(ex2, ly);
    ctx.stroke();
    ctx.fillStyle = COL.hot;
    ctx.beginPath();
    ctx.arc(lx, ly + 90, 5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = a * prog(t, 12.6, 12.9) * (1 - prog(t, 13.1, 13.35));
    ctx.font = `600 24px ${F.mono}`;
    ctx.fillStyle = COL.cream;
    spaced(ctx, "TOTALITY", lx + 12, ly - 14, 8);
    ctx.font = `500 18px ${F.mono}`;
    ctx.fillStyle = COL.gold;
    spaced(ctx, `T+${Math.max(0, t - 12.35).toFixed(2)}s`, lx + 12, ly + 28, 4);
    ctx.globalAlpha = a;
  }

  // kicker
  ctx.globalAlpha = a * prog(t, 11.6, 12.0) * (1 - prog(t, 13.1, 13.35));
  ctx.font = `600 22px ${F.mono}`;
  ctx.fillStyle = COL.gold;
  const kick = "ECLIPSE FORECAST  ·  SAROS CYCLE";
  spaced(ctx, kick.slice(0, Math.ceil(kick.length * prog(t, 11.6, 12.3))), CX, 168, 10, "center");
  ctx.globalAlpha = a;

  // headline words
  const words = ["IT", "PREDICTED", "THE", "SKY."];
  const size = 132;
  ctx.font = `400 ${size}px ${F.disp}`;
  const ws = words.map((w) => spacedWidth(ctx, w, 3));
  const gap = 32;
  const total = ws.reduce((x, y) => x + y, 0) + gap * 3;
  let wx = CX - total / 2;
  words.forEach((wd, i) => {
    const x = wx;
    const baseY = 955;
    maskedText(
      ctx,
      () => {
        ctx.font = `400 ${size}px ${F.disp}`;
        ctx.fillStyle = i === 3 ? COL.gold : COL.cream;
        spaced(ctx, wd, x, baseY, 3);
      },
      x,
      baseY,
      size,
      ws[i],
      prog(t, 12.15 + i * 0.1, 12.7 + i * 0.1),
      prog(t, 13.0 + i * 0.04, 13.35 + i * 0.04)
    );
    wx += ws[i] + gap;
  });
  ctx.restore();
}

function lerpColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

/* ------------------------------------------------------------------ */
/* 06 — TITLE                                                          */
/* ------------------------------------------------------------------ */
export function sceneTitle(ctx: Ctx, t: number) {
  if (t < 13.45) return;
  const u = t - 13.45;
  const bg = ctx.createRadialGradient(CX, CY, 50, CX, CY, 1200);
  bg.addColorStop(0, "#13262f");
  bg.addColorStop(0.55, "#071016");
  bg.addColorStop(1, "#020407");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // emblem
  const ea = E.out2(prog(u, 0, 0.6));
  const es = lerp(1.5, 1, E.out4(prog(u, 0, 1.4)));
  ctx.save();
  ctx.translate(CX, CY + 10);
  ctx.scale(es, es);
  ctx.globalAlpha = ea;
  glow(ctx, 0, 0, 760, COL.bronze, 0.22);
  ctx.save();
  ctx.rotate(u * 0.22);
  toothPath(ctx, 48, 0, 500);
  ctx.strokeStyle = rgba(COL.gold, 0.38);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.rotate(-u * 0.14);
  ctx.setLineDash([4, 14]);
  ctx.strokeStyle = rgba(COL.cream, 0.28);
  ctx.beginPath();
  ctx.arc(0, 0, 420, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = rgba(COL.gold, 0.3);
  ctx.beginPath();
  for (let i = 0; i < 365; i++) {
    const ang = (i / 365) * TAU;
    const l = i % 5 === 0 ? 20 : 9;
    ctx.moveTo(Math.cos(ang) * 380, Math.sin(ang) * 380);
    ctx.lineTo(Math.cos(ang) * (380 - l), Math.sin(ang) * (380 - l));
  }
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // top timeline
  const ty = CY - 250;
  const lp = E.outExpo(prog(u, 0.35, 1.1));
  ctx.font = `600 26px ${F.mono}`;
  ctx.fillStyle = rgba(COL.cream, prog(u, 0.3, 0.7));
  spaced(ctx, "100 BCE", CX - 330, ty + 9, 6, "right");
  spaced(ctx, "2026", CX + 330, ty + 9, 6, "left");
  ctx.strokeStyle = rgba(COL.gold, 0.8);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CX - 300, ty);
  ctx.lineTo(CX - 300 + 600 * lp, ty);
  ctx.stroke();
  ctx.fillStyle = COL.hot;
  ctx.beginPath();
  ctx.arc(CX - 300 + 600 * lp, ty, 6, 0, TAU);
  ctx.fill();

  // title
  const title = "ANTIKYTHERA";
  ctx.font = `400 300px ${F.disp}`;
  const fitW = spacedWidth(ctx, title, 8);
  const size = Math.min(300, Math.floor(300 * (1640 / fitW)));
  ctx.font = `400 ${size}px ${F.disp}`;
  const sp = lerp(70, 8, E.outExpo(prog(u, 0.05, 1.3)));
  const tw = spacedWidth(ctx, title, sp);
  const baseY = CY + 112;
  const x0 = CX - tw / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, baseY - size * 1.0, W, size * 1.2);
  ctx.clip();
  const f = (lerp(x0 - 300, x0 + tw + 300, E.inOut3(prog(u, 0.95, 1.6))) - (x0 - 200)) / (tw + 400);
  const sh = ctx.createLinearGradient(x0 - 200, 0, x0 + tw + 200, 0);
  sh.addColorStop(0, COL.cream);
  sh.addColorStop(clamp(f - 0.07), COL.cream);
  sh.addColorStop(clamp(f), "#ffffff");
  sh.addColorStop(clamp(f + 0.07), COL.gold);
  sh.addColorStop(1, COL.cream);
  ctx.fillStyle = sh;
  let cx = x0;
  [...title].forEach((ch, i) => {
    const w = ctx.measureText(ch).width;
    const p = prog(u, 0.1 + i * 0.05, 0.85 + i * 0.05);
    const dy = (1 - E.outExpo(p)) * size * 1.15;
    ctx.fillText(ch, cx, baseY + dy);
    cx += w + sp;
  });
  ctx.restore();

  // underline
  ctx.strokeStyle = COL.gold;
  ctx.lineWidth = 3;
  const up = E.outExpo(prog(u, 0.9, 1.5));
  ctx.beginPath();
  ctx.moveTo(CX - (tw / 2) * up, baseY + 34);
  ctx.lineTo(CX + (tw / 2) * up, baseY + 34);
  ctx.stroke();

  // subtitle
  ctx.font = `600 28px ${F.mono}`;
  ctx.fillStyle = rgba(COL.gold, E.out2(prog(u, 0.8, 1.3)));
  spaced(ctx, "THE MECHANISM  ·  A MOTION DESIGN SHOWREEL", CX, baseY + 88, lerp(40, 12, E.outExpo(prog(u, 0.8, 1.6))), "center");

  // tagline
  const ta = E.out2(prog(u, 1.1, 1.6));
  ctx.save();
  ctx.globalAlpha = ta;
  ctx.font = `italic 400 46px ${F.serif}`;
  ctx.fillStyle = COL.cream;
  ctx.textAlign = "center";
  ctx.fillText("Every gear. Every frame. Built in code.", CX, baseY + 190 + (1 - ta) * 16);
  ctx.restore();
}
