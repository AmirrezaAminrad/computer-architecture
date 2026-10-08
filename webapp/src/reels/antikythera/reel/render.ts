import { CHAPTERS, COL, CX, CY, Ctx, DURATION, E, F, FPS, H, HITS, TAU, W, clamp, lerp, pad, prog, rgba, rng, spaced } from "./utils";
import { sceneAbyss, sceneMechanism } from "./scenes1";
import { sceneDial, sceneEclipse, sceneTitle } from "./scenes2";

let grain: HTMLCanvasElement | null = null;
function getGrain(ctx: Ctx) {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = 256;
  grain.height = 256;
  const g = grain.getContext("2d")!;
  const img = g.createImageData(256, 256);
  const r = rng(5);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 26;
  }
  g.putImageData(img, 0, 0);
  void ctx;
  return grain;
}

function shake(t: number) {
  let x = 0;
  let y = 0;
  for (const h of HITS) {
    const d = t - h;
    if (d < 0 || d > 0.7) continue;
    const amp = 16 * Math.exp(-d * 9);
    x += Math.sin(d * 85) * amp;
    y += Math.cos(d * 71) * amp * 0.7;
  }
  return [x, y];
}

export function render(ctx: Ctx, tIn: number) {
  const t = clamp(tIn, 0, DURATION - 0.0001);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = COL.bg;
  ctx.fillRect(0, 0, W, H);

  // ---- scenes (with camera shake) ----
  ctx.save();
  const [sx, sy] = shake(t);
  ctx.translate(sx, sy);
  // slight overscan so shake never reveals edges
  ctx.translate(CX, CY);
  ctx.scale(1.02, 1.02);
  ctx.translate(-CX, -CY);

  sceneAbyss(ctx, t);
  sceneMechanism(ctx, t);

  // iris reveal into the dial
  if (t >= 7.8 && t < 8.4) {
    const p = E.inOut3(prog(t, 7.8, 8.4));
    const rad = p * 1300;
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, rad, 0, TAU);
    ctx.clip();
    sceneDial(ctx, t);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = rgba(COL.hot, 0.9 * (1 - p));
    ctx.lineWidth = 6 + 30 * (1 - p);
    ctx.beginPath();
    ctx.arc(CX, CY, rad, 0, TAU);
    ctx.stroke();
    ctx.restore();
  } else if (t >= 8.4) {
    sceneDial(ctx, t);
  }
  sceneEclipse(ctx, t);
  sceneTitle(ctx, t);
  ctx.restore();

  // ---- shockwaves ----
  for (const h of [2.7, 8.0, 13.45]) {
    const p = prog(t, h, h + 0.9);
    if (p > 0 && p < 1) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = rgba(COL.hot, 0.6 * (1 - p));
      ctx.lineWidth = 3 + 40 * (1 - p);
      ctx.beginPath();
      ctx.arc(CX, CY, E.outExpo(p) * 1300, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---- bronze wipe (eclipse → title) ----
  wipe(ctx, t);

  // ---- flashes ----
  flash(ctx, t);

  // ---- glitch slices on hits ----
  glitch(ctx, t);

  // ---- vignette ----
  const vg = ctx.createRadialGradient(CX, CY, 420, CX, CY, 1160);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // ---- film grain ----
  const gr = getGrain(ctx);
  const rand = rng(Math.floor(t * 24) + 77);
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.translate(-rand() * 256, -rand() * 256);
  ctx.fillStyle = ctx.createPattern(gr, "repeat")!;
  ctx.fillRect(0, 0, W + 256, H + 256);
  ctx.restore();

  // ---- HUD ----
  hud(ctx, t);

  // ---- fade out for a clean loop ----
  const fo = prog(t, 14.75, 15);
  if (fo > 0) {
    ctx.fillStyle = `rgba(2,4,7,${fo})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function wipe(ctx: Ctx, t: number) {
  if (t < 13.0 || t > 13.95) return;
  const cols = [COL.deepBronze, COL.bronze, COL.gold];
  const skew = 320;
  cols.forEach((c, i) => {
    const d = i * 0.07;
    const e1 = E.inOut3(prog(t, 13.05 + d, 13.5 + d));
    const e2 = E.inOut3(prog(t, 13.3 + d, 13.78 + d));
    const xr = lerp(-300, W + 1600, e1);
    const xl = lerp(-1700, W + 300, e2);
    if (xr <= xl) return;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(xl + skew, 0);
    ctx.lineTo(xr + skew, 0);
    ctx.lineTo(xr, H);
    ctx.lineTo(xl, H);
    ctx.closePath();
    ctx.fill();
  });
}

function flash(ctx: Ctx, t: number) {
  let a = 0;
  // chapter 1→2 : big gold flash
  if (t > 2.5 && t < 2.7) a = Math.max(a, E.in2(prog(t, 2.5, 2.7)));
  if (t >= 2.7) a = Math.max(a, Math.exp(-(t - 2.7) * 6));
  // eclipse totality pulse
  if (t >= 12.28 && t < 12.34) a = Math.max(a, 0.35 * prog(t, 12.28, 12.34));
  if (t >= 12.34) a = Math.max(a, 0.35 * Math.exp(-(t - 12.34) * 6));
  // dial iris
  if (t >= 8.0) a = Math.max(a, 0.28 * Math.exp(-(t - 8.0) * 8));
  if (a > 0.005) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = rgba("#ffe2a3", Math.min(1, a));
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

function glitch(ctx: Ctx, t: number) {
  for (const h of HITS) {
    const d = t - h;
    if (d < 0 || d > 0.22) continue;
    const r = rng(Math.floor(t * 60) * 13 + 5);
    const n = 6;
    const k = 1 - d / 0.22;
    for (let i = 0; i < n; i++) {
      const y = Math.floor(r() * (H - 120));
      const hh = 12 + Math.floor(r() * 90);
      const dx = (r() - 0.5) * 140 * k;
      ctx.drawImage(ctx.canvas, 0, y, W, hh, dx, y, W, hh);
      // chromatic tint stripe
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = i % 2 ? `rgba(0,255,220,${0.08 * k})` : `rgba(255,60,60,${0.08 * k})`;
      ctx.fillRect(0, y, W, hh);
      ctx.restore();
    }
  }
}

function hud(ctx: Ctx, t: number) {
  const a = E.out2(prog(t, 0.15, 0.8)) * (1 - prog(t, 14.6, 14.85));
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;

  // corner brackets
  const m = 44;
  const L = 30;
  ctx.strokeStyle = rgba(COL.cream, 0.55);
  ctx.lineWidth = 2;
  const corners: [number, number, number, number][] = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath();
    ctx.moveTo(x + dx * L, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * L);
    ctx.stroke();
  }

  // top left
  ctx.font = `600 16px ${F.mono}`;
  ctx.fillStyle = rgba(COL.cream, 0.9);
  spaced(ctx, "ANTIKYTHERA MECHANISM", 96, 72, 6);
  ctx.fillStyle = COL.gold;
  spaced(ctx, "// MOTION REEL 2026", 96, 96, 6);

  // top right: timecode
  const sec = Math.floor(t);
  const fr = Math.floor((t - sec) * FPS);
  ctx.textAlign = "right";
  ctx.font = `600 18px ${F.mono}`;
  ctx.fillStyle = COL.cream;
  spaced(ctx, `00:${pad(sec)}:${pad(fr)}`, W - 96, 72, 4, "right");
  const blink = Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = blink ? "#ff4d3d" : "rgba(255,77,61,0.25)";
  ctx.beginPath();
  ctx.arc(W - 96 - 142, 66, 6, 0, TAU);
  ctx.fill();
  ctx.font = `600 14px ${F.mono}`;
  ctx.fillStyle = rgba(COL.cream, 0.6);
  spaced(ctx, "30 FPS · 1920×1080", W - 96, 96, 4, "right");
  ctx.textAlign = "left";

  // bottom: chapter progress
  const x0 = 96;
  const x1 = W - 96;
  const y = 1040;
  const total = x1 - x0;
  CHAPTERS.forEach((c, i) => {
    const s = c.t;
    const e = i + 1 < CHAPTERS.length ? CHAPTERS[i + 1].t : DURATION;
    const xa = x0 + (s / DURATION) * total + (i ? 4 : 0);
    const xb = x0 + (e / DURATION) * total - 4;
    const active = t >= s && t < e;
    ctx.fillStyle = "rgba(244,234,210,0.2)";
    ctx.fillRect(xa, y, xb - xa, 3);
    const p = clamp((t - s) / (e - s));
    ctx.fillStyle = active ? COL.hot : COL.gold;
    ctx.fillRect(xa, y, (xb - xa) * p, 3);
    ctx.font = `600 13px ${F.mono}`;
    ctx.fillStyle = active ? COL.hot : rgba(COL.cream, 0.4);
    spaced(ctx, c.label, xa, y - 12, 4);
  });
  // playhead
  const px = x0 + (t / DURATION) * total;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(px, y - 4);
  ctx.lineTo(px + 6, y - 11);
  ctx.lineTo(px - 6, y - 11);
  ctx.closePath();
  ctx.globalAlpha = 0;
  ctx.fill();
  ctx.restore();
}
