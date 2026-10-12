import { MONO, bg, chip, fitSize, glow, glowDot, revealChars, text } from '../draw';
import { COL, E, H, TAU, W, hash, lerp, prog, rgba } from '../util';

type Ctx = CanvasRenderingContext2D;

export function intro(ctx: Ctx, lt: number, g: number) {
  bg(ctx, g, COL.cyan, 0.5, 0.5);

  // ── binary rain ──
  const cols = 48;
  const colW = W / cols;
  const fade = lerp(1, 0.22, E.inOutCubic(prog(lt, 0.5, 1.0))) * prog(lt, 0.0, 0.35);
  ctx.save();
  ctx.font = `500 22px ${MONO}`;
  ctx.textAlign = 'center';
  for (let c = 0; c < cols; c++) {
    const speed = 160 + hash(c) * 420;
    const len = 9 + Math.floor(hash(c + 9) * 15);
    const span = H + len * 28 + 80;
    const head = (lt * speed + hash(c + 50) * span) % span;
    for (let k = 0; k < len; k++) {
      const y = head - k * 28;
      if (y < -30 || y > H + 30) continue;
      const bit = hash(c * 131 + k * 7 + Math.floor(lt * 9 + k)) > 0.5 ? '1' : '0';
      const a = (1 - k / len) * 0.6 * fade;
      ctx.fillStyle = k === 0 ? `rgba(230,250,255,${a * 1.4})` : rgba(COL.cyan, a);
      ctx.fillText(bit, c * colW + colW / 2, y);
    }
  }
  ctx.restore();

  // ── CRT boot line ──
  const lineP = E.outExpo(prog(lt, 0, 0.4));
  const lineA = 1 - prog(lt, 0.28, 0.25);
  if (lineA > 0) {
    glow(ctx, COL.white, 3, lineA, () => {
      ctx.beginPath();
      ctx.moveTo(W / 2 - (W / 2) * lineP, H / 2);
      ctx.lineTo(W / 2 + (W / 2) * lineP, H / 2);
    });
  }

  // ── kinetic title ──
  const size = Math.min(fitSize(ctx, 'ARCHITECTURE', 1290, 190), 190);
  const b1 = 470;
  const b2 = b1 + size * 0.98;
  const fillA = E.outCubic(prog(lt, 1.3, 0.5));
  const drawTitle = (ox: number, tint: string | null) => {
    revealChars(ctx, 'COMPUTER', 140 + ox, b1, size, lt, {
      start: 0.3,
      stagger: 0.045,
      dur: 0.7,
      fill: tint ?? COL.white,
    });
    revealChars(ctx, 'ARCHITECTURE', 140 + ox, b2, size, lt, {
      start: 0.55,
      stagger: 0.04,
      dur: 0.7,
      stroke: tint ?? COL.white,
      lw: 3,
      fill: tint ? undefined : rgba(COL.cyan, fillA),
    });
  };
  const glitching = (lt > 1.9 && lt < 2.12) || (lt > 2.55 && lt < 2.66);
  if (glitching) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const k = 10 + hash(Math.floor(lt * 60)) * 10;
    drawTitle(-k, '#ff1f5a');
    drawTitle(k, '#00d9ff');
    ctx.restore();
    // slice displacement
    ctx.save();
    const sy = 300 + hash(Math.floor(lt * 40)) * 400;
    ctx.beginPath();
    ctx.rect(0, sy, W, 40);
    ctx.clip();
    ctx.translate(hash(Math.floor(lt * 50) + 3) * 90 - 45, 0);
    drawTitle(0, null);
    ctx.restore();
  }
  drawTitle(0, null);

  // ── typewriter sub ──
  const msg = '// how machines think — in 15 seconds';
  const n = Math.floor(Math.max(0, lt - 1.2) * 42);
  const shown = msg.slice(0, Math.min(n, msg.length));
  const blink = Math.floor(lt * 5) % 2 === 0 || n < msg.length;
  text(ctx, shown + (blink && lt > 1.1 ? '▌' : ''), 144, b2 + 84, { size: 30, color: COL.cyan, track: 1 });

  // ── chips ──
  const tags = ['ISA', 'PIPELINE', 'CACHE', 'SIMD', 'BUS'];
  let cx = 140;
  tags.forEach((t, i) => {
    const p = E.outBack(prog(lt, 1.55 + i * 0.07, 0.35));
    ctx.save();
    ctx.translate(0, (1 - p) * 30);
    const w = chip(ctx, t, cx, b2 + 130, [COL.cyan, COL.violet, COL.magenta, COL.amber, COL.lime][i], p);
    ctx.restore();
    cx += w + 16;
  });

  // ── ISA dial ──
  const dp = E.outExpo(prog(lt, 0.6, 0.9));
  if (dp > 0) {
    const dx = 1690;
    const dy = 540;
    ctx.save();
    ctx.translate(dx, dy);
    ctx.scale(0.6 + 0.4 * dp, 0.6 + 0.4 * dp);
    ctx.globalAlpha = dp;
    const radii = [150, 118, 86];
    radii.forEach((r, i) => {
      const dir = i % 2 ? -1 : 1;
      glow(ctx, [COL.cyan, COL.violet, COL.magenta][i], 2.2, 0.9, () => {
        ctx.setLineDash([r * (0.7 + i * 0.4), r * 0.35]);
        ctx.lineDashOffset = -g * 90 * dir;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
      });
    });
    ctx.setLineDash([]);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU + g * 0.4;
      const l = i % 5 === 0 ? 16 : 8;
      ctx.strokeStyle = rgba(COL.white, i % 5 === 0 ? 0.6 : 0.25);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 168, Math.sin(a) * 168);
      ctx.lineTo(Math.cos(a) * (168 + l), Math.sin(a) * (168 + l));
      ctx.stroke();
    }
    const isa = ['x86', 'ARM', 'RISC-V'][Math.floor(lt * 3.2) % 3];
    text(ctx, isa, 0, 14, { size: 44, family: '"Space Grotesk",sans-serif', weight: 700, align: 'center' });
    ctx.restore();
    glowDot(ctx, dx + Math.cos(g * 2) * 150 * dp, dy + Math.sin(g * 2) * 150 * dp, 7, COL.cyan, dp);
  }
}
