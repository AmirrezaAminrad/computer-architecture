import { MONO, glow, rr, text } from './draw';
import { COL, DURATION, E, FPS, H, W, clamp, hash, lerp, prog, rgba } from './util';
import { intro } from './scenes/intro';
import { logic } from './scenes/logic';
import { pipeline } from './scenes/pipeline';
import { memory } from './scenes/memory';
import { multicore } from './scenes/multicore';
import { outro } from './scenes/outro';

type SceneFn = (ctx: CanvasRenderingContext2D, lt: number, g: number) => void;

export interface SceneDef {
  name: string;
  short: string;
  start: number;
  dur: number;
  accent: string;
  fn: SceneFn;
}

export const SCENES: SceneDef[] = [
  { name: 'BOOT', short: 'Boot', start: 0, dur: 3.0, accent: COL.cyan, fn: intro },
  { name: 'LOGIC', short: 'Logic', start: 3.0, dur: 2.6, accent: COL.cyan, fn: logic },
  { name: 'PIPELINE', short: 'Pipeline', start: 5.6, dur: 2.6, accent: COL.violet, fn: pipeline },
  { name: 'MEMORY', short: 'Memory', start: 8.2, dur: 2.6, accent: COL.magenta, fn: memory },
  { name: 'MULTICORE', short: 'Multicore', start: 10.8, dur: 2.2, accent: COL.amber, fn: multicore },
  { name: 'SIGN-OFF', short: 'Sign-off', start: 13.0, dur: 2.0, accent: COL.lime, fn: outro },
];

const BOUNDS = SCENES.slice(1).map((s) => s.start);
const WIPE_COLORS = [COL.cyan, COL.violet, COL.magenta, COL.amber, COL.lime, COL.white, COL.blue];
const IMPACTS = [...BOUNDS.map((b) => b + 0.38), 0.55, 1.9, 13.75];

// ───────── offscreen buffers ─────────
let sceneCanvas: HTMLCanvasElement | null = null;
let tmpCanvas: HTMLCanvasElement | null = null;
let grain: CanvasPattern[] = [];
let scan: CanvasPattern | null = null;

function mk() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  return c;
}

function initBuffers(main: CanvasRenderingContext2D) {
  sceneCanvas = mk();
  tmpCanvas = mk();
  // grain tiles
  grain = [];
  for (let k = 0; k < 4; k++) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    const p = main.createPattern(c, 'repeat');
    if (p) grain.push(p);
  }
  const s = document.createElement('canvas');
  s.width = 4;
  s.height = 4;
  const sx = s.getContext('2d')!;
  sx.fillStyle = 'rgba(0,0,0,0.5)';
  sx.fillRect(0, 0, 4, 1);
  scan = main.createPattern(s, 'repeat');
}

function sceneAt(t: number) {
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i].start) idx = i;
  return { idx, s: SCENES[idx] };
}

// ───────── main render ─────────
export function renderFrame(main: CanvasRenderingContext2D, tIn: number) {
  const t = clamp(tIn, 0, DURATION - 0.0001);
  if (!sceneCanvas) initBuffers(main);
  const sctx = sceneCanvas!.getContext('2d')!;
  const tctx = tmpCanvas!.getContext('2d')!;

  // 1. scene → offscreen, with slow push-in
  const { idx, s } = sceneAt(t);
  const lt = t - s.start;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = 'source-over';
  sctx.clearRect(0, 0, W, H);
  sctx.save();
  const z = 1 + 0.035 * (lt / s.dur);
  sctx.translate(W / 2, H / 2);
  sctx.scale(z, z);
  sctx.translate(-W / 2, -H / 2);
  s.fn(sctx, lt, t);
  sctx.restore();

  // 2. shake
  let sx = 0;
  let sy = 0;
  for (const it of IMPACTS) {
    const d = t - it;
    if (d > 0 && d < 0.7) {
      const a = 11 * Math.exp(-d * 9);
      sx += Math.sin(d * 70 + it) * a;
      sy += Math.cos(d * 63 + it * 2) * a * 0.7;
    }
  }

  // 3. chromatic aberration near transitions (+ the title glitch)
  let ab = 0;
  for (const b of BOUNDS) ab = Math.max(ab, Math.exp(-Math.pow((t - b) / 0.2, 2)));
  const px = ab * 26;

  main.setTransform(1, 0, 0, 1, 0, 0);
  main.globalAlpha = 1;
  main.globalCompositeOperation = 'source-over';
  main.fillStyle = COL.bg;
  main.fillRect(0, 0, W, H);

  if (px > 1) {
    const chans: Array<[string, number]> = [
      ['#ff0000', -px],
      ['#00ff00', 0],
      ['#0000ff', px],
    ];
    main.globalCompositeOperation = 'lighter';
    for (const [c, off] of chans) {
      tctx.globalCompositeOperation = 'source-over';
      tctx.clearRect(0, 0, W, H);
      tctx.drawImage(sceneCanvas!, 0, 0);
      tctx.globalCompositeOperation = 'multiply';
      tctx.fillStyle = c;
      tctx.fillRect(0, 0, W, H);
      main.drawImage(tmpCanvas!, off + sx, sy);
    }
    main.globalCompositeOperation = 'source-over';
  } else {
    main.drawImage(sceneCanvas!, sx, sy);
  }

  // 4. wipes
  drawWipes(main, t);

  // 5. HUD
  drawHUD(main, t, idx);

  // 6. post
  post(main, t);
}

function drawWipes(ctx: CanvasRenderingContext2D, t: number) {
  const N = 7;
  const bh = H / N;
  const S = 140;
  for (const T of BOUNDS) {
    if (t < T - 0.45 || t > T + 0.45) continue;
    for (let i = 0; i < N; i++) {
      const cover = (delay: number) => E.inOutCubic(prog(t, T - 0.4 + i * 0.02 + delay, 0.2));
      const reveal = (delay: number) => E.inOutCubic(prog(t, T + i * 0.02 + delay, 0.2));
      const pos = (p: number) => lerp(-2 * S, W + 2 * S, p);
      const y = i * bh - 1;
      const h = bh + 2;
      const poly = (a: number, b: number, fill: string) => {
        if (b - a < 0.5) return;
        ctx.beginPath();
        ctx.moveTo(a, y);
        ctx.lineTo(b, y);
        ctx.lineTo(b - S, y + h);
        ctx.lineTo(a - S, y + h);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };
      // colour layer: leads on cover, lags on reveal
      poly(pos(reveal(0.07)), pos(cover(0)), WIPE_COLORS[(i + BOUNDS.indexOf(T)) % WIPE_COLORS.length]);
      // dark layer
      poly(pos(reveal(0)), pos(cover(0.07)), COL.bg);
    }
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, t: number, idx: number) {
  const a = E.outCubic(prog(t, 0.2, 0.6)) * (1 - prog(t, 14.75, 0.25));
  ctx.save();
  ctx.globalAlpha = a;
  // crop marks
  ctx.strokeStyle = 'rgba(200,220,255,0.45)';
  ctx.lineWidth = 2;
  const m = 46;
  const L = 30;
  ctx.beginPath();
  ctx.moveTo(m, m + L); ctx.lineTo(m, m); ctx.lineTo(m + L, m);
  ctx.moveTo(W - m - L, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + L);
  ctx.moveTo(m, H - m - L); ctx.lineTo(m, H - m); ctx.lineTo(m + L, H - m);
  ctx.moveTo(W - m - L, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - L);
  ctx.stroke();

  // top-left brand
  rr(ctx, 84, 70, 22, 22, 5);
  ctx.strokeStyle = COL.cyan;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = COL.cyan;
  ctx.fillRect(91, 77, 8, 8);
  text(ctx, 'ARCH//REEL', 120, 88, { size: 20, weight: 700, track: 4 });
  text(ctx, 'MOTION DESIGN SHOWREEL', 120, 110, { size: 12, color: COL.mid, track: 4, weight: 600 });

  // top-right timecode
  const f = Math.floor(t * FPS);
  const sec = Math.floor(f / FPS);
  const tc = `00:${String(sec).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`;
  text(ctx, tc, W - 84, 90, { size: 24, weight: 600, align: 'right', track: 2 });
  const rec = Math.floor(t * 2) % 2 === 0;
  ctx.beginPath();
  ctx.arc(W - 372, 82, 6, 0, Math.PI * 2);
  ctx.fillStyle = rec ? '#ff3b3b' : 'rgba(255,59,59,0.25)';
  ctx.fill();
  text(ctx, 'REC', W - 358, 90, { size: 14, color: COL.mid, weight: 700, track: 3, align: 'left' });
  void MONO;

  // bottom progress
  const bx = 84;
  const bw = W - 168;
  const by = 1010;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(bx, by, bw, 3);
  const sc = SCENES[idx];
  ctx.fillStyle = sc.accent;
  ctx.fillRect(bx, by, bw * (t / DURATION), 3);
  glow(ctx, sc.accent, 1.5, 0.9, () => {
    ctx.beginPath();
    ctx.moveTo(bx + bw * (t / DURATION), by - 6);
    ctx.lineTo(bx + bw * (t / DURATION), by + 9);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  BOUNDS.forEach((b) => ctx.fillRect(bx + bw * (b / DURATION) - 1, by - 5, 2, 13));
  text(ctx, `0${idx} — ${sc.name}`, bx, by - 14, { size: 15, weight: 600, track: 4, color: COL.white });
  text(ctx, `${W}×${H}  ·  ${FPS} FPS  ·  CANVAS 2D`, W - 84, by - 14, { size: 13, color: COL.mid, align: 'right', track: 3, weight: 600 });
  ctx.restore();
}

function post(ctx: CanvasRenderingContext2D, t: number) {
  // scanlines
  if (scan) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = scan;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // grain
  if (grain.length) {
    const f = Math.floor(t * FPS);
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(hash(f) * 256, hash(f + 9) * 256);
    ctx.fillStyle = grain[f % grain.length];
    ctx.fillRect(-256, -256, W + 512, H + 512);
    ctx.restore();
  }
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  // fade in / out
  const fade = Math.max(1 - prog(t, 0, 0.25), prog(t, 14.7, 0.29));
  if (fade > 0) {
    ctx.fillStyle = `rgba(5,6,11,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
  void rgba;
}
