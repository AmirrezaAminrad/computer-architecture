// Master compositor: background, camera, scenes, transitions, HUD and film grain.

import { COL, DURATION, H, MONO, W, BEAT, ease, hexA, mulberry32, prog, clamp, lerp } from './util';
import { label, setFont } from './draw';
import { SCENES, drawScene, sceneIndexAt } from './scenes';

const BOUNDS = SCENES.slice(1).map((s) => s.start);

function makeNoise(frames = 4) {
  const rnd = mulberry32(99);
  return Array.from({ length: frames }, () => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    const img = x.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = rnd() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  });
}

function makeVignette() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.7)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return c;
}

function drawWipe(ctx: CanvasRenderingContext2D, t: number) {
  const N = 8;
  const bw = W / N;
  for (let b = 0; b < BOUNDS.length; b++) {
    const bt = BOUNDS[b];
    if (Math.abs(t - bt) > 0.22) continue;
    const accent = SCENES[b + 1].accent;
    const layers: [string, number][] = [[COL.ink, 0], [accent, 0.1]];
    const cover = t < bt;
    const p = cover ? prog(t, bt - 0.2, bt) : prog(t, bt, bt + 0.2);
    for (const [col, shift] of layers) {
      ctx.fillStyle = col;
      for (let k = 0; k < N; k++) {
        const raw = clamp(p * 1.8 - k * 0.075 - shift);
        const local = ease.inOutCubic(raw);
        const x = k * bw - 2;
        const slant = 90;
        if (cover) {
          const hh = local * (H + slant);
          if (hh <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + bw + 4, 0);
          ctx.lineTo(x + bw + 4, Math.max(0, hh - slant));
          ctx.lineTo(x, hh);
          ctx.closePath();
          ctx.fill();
        } else {
          const hh = local * (H + slant);
          if (hh >= H + slant) continue;
          ctx.beginPath();
          ctx.moveTo(x, hh);
          ctx.lineTo(x + bw + 4, Math.max(0, hh - slant));
          ctx.lineTo(x + bw + 4, H);
          ctx.lineTo(x, H);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }
}

function glitch(ctx: CanvasRenderingContext2D, t: number) {
  for (const bt of BOUNDS) {
    const d = Math.abs(t - bt);
    if (d > 0.3) continue;
    const k = 1 - d / 0.3;
    const rnd = mulberry32(Math.floor(t * 30) * 977 + 13);
    const n = 3 + Math.floor(k * 6);
    for (let i = 0; i < n; i++) {
      const sy = Math.floor(rnd() * (H - 80));
      const sh = 12 + Math.floor(rnd() * 70 * k);
      const off = (rnd() - 0.5) * 160 * k;
      ctx.drawImage(ctx.canvas, 0, sy, W, sh, off, sy, W, sh);
    }
  }
}

function hud(ctx: CanvasRenderingContext2D, t: number, idx: number) {
  const accent = SCENES[idx].accent;
  const a = prog(t, 0.2, 0.6);
  ctx.save();
  ctx.globalAlpha = a;

  // crop marks
  ctx.strokeStyle = hexA(COL.ink, 0.35);
  ctx.lineWidth = 2;
  const m = 56, l = 30;
  ctx.beginPath();
  ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
  ctx.moveTo(W - m - l, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + l);
  ctx.moveTo(m, H - m - l); ctx.lineTo(m, H - m); ctx.lineTo(m + l, H - m);
  ctx.moveTo(W - m - l, H - m); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m, H - m - l);
  ctx.stroke();

  // REC + title
  const blink = Math.floor(t * 2) % 2 === 0;
  ctx.fillStyle = '#ff3b3b';
  ctx.globalAlpha = a * (blink ? 1 : 0.25);
  ctx.beginPath();
  ctx.arc(112, 94, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a;
  label(ctx, 'HISTORY OF COMPUTER ARCHITECTURE  /  REEL', 134, 100, 16, hexA(COL.ink, 0.6), a, 'left', 500, MONO, 3);

  // timecode
  const f = Math.floor(t * 30);
  const tc = `00:${String(Math.floor(f / 30)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
  label(ctx, `${tc}  /  00:15:00`, W - 112, 100, 16, hexA(COL.ink, 0.75), a, 'right', 500, MONO, 3);

  // timeline
  const x0 = 112, x1 = W - 112, y = 1004;
  ctx.strokeStyle = hexA(COL.ink, 0.18);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1, y);
  ctx.stroke();
  const px = lerp(x0, x1, t / DURATION);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(px, y);
  ctx.stroke();
  SCENES.forEach((s, i) => {
    if (!s.hud) return;
    const x = lerp(x0, x1, s.start / DURATION);
    const on = i === idx;
    ctx.fillStyle = on ? s.accent : hexA(COL.ink, 0.35);
    ctx.fillRect(x - 1.5, y - (on ? 12 : 7), 3, on ? 24 : 14);
    label(ctx, String(s.hud.year), x, y + 36, 15, on ? s.accent : hexA(COL.ink, 0.45), 1, 'center', 600, MONO, 2);
  });
  ctx.fillStyle = COL.ink;
  ctx.beginPath();
  ctx.moveTo(px, y - 9); ctx.lineTo(px + 7, y); ctx.lineTo(px, y + 9); ctx.lineTo(px - 7, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas: HTMLCanvasElement) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  const noise = makeNoise();
  const vig = makeVignette();

  return (tRaw: number) => {
    const t = clamp(tRaw, 0, DURATION - 0.0001);
    const idx = sceneIndexAt(t);
    const sc = SCENES[idx];
    const beatPh = (t % BEAT) / BEAT;
    const pulse = Math.exp(-beatPh * 7);

    // ---- background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(1320, 540, 0, 1320, 540, 820);
    glow.addColorStop(0, hexA(sc.accent, 0.13 + 0.07 * pulse));
    glow.addColorStop(1, hexA(sc.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = hexA(COL.ink, 0.045);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const off = (t * 22) % 96;
    for (let x = -96 + off; x < W; x += 96) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += 96) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();

    // ---- scene w/ beat shake
    const bnear = BOUNDS.reduce((m, b) => Math.min(m, Math.abs(t - b)), 9);
    const amp = 3 * pulse + (bnear < 0.25 ? 14 * (1 - bnear / 0.25) : 0);
    ctx.save();
    ctx.translate(Math.sin(t * 97) * amp, Math.cos(t * 113) * amp);
    drawScene(ctx, idx, t);
    ctx.restore();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);

    glitch(ctx, t);
    hud(ctx, t, idx);
    drawWipe(ctx, t);

    // ---- finishing: vignette, grain, fade
    ctx.globalAlpha = 1;
    ctx.drawImage(vig, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    const n = noise[Math.floor(t * 24) % noise.length];
    const ox = -Math.floor(((t * 24 * 7919) % 256));
    for (let y = ox; y < H; y += 256) for (let x = ox; x < W; x += 256) ctx.drawImage(n, x, y);
    ctx.restore();

    const fade = Math.max(1 - prog(t, 0, 0.18), prog(t, DURATION - 0.3, DURATION));
    if (fade > 0) {
      ctx.fillStyle = `rgba(7,8,12,${fade})`;
      ctx.fillRect(0, 0, W, H);
    }
    setFont(ctx, 10); // reset font state cheaply
  };
}
