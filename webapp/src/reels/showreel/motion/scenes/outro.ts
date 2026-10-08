import { MONO, bg, fitSize, glow, glowDot, revealChars, rr, text } from '../draw';
import { COL, E, H, TAU, W, hash, lerp, prog, rgba } from '../util';

type Ctx = CanvasRenderingContext2D;

const CX = W / 2;
const CY = 300;

export function outro(ctx: Ctx, lt: number, g: number) {
  bg(ctx, g, COL.cyan, 0.5, 0.35);

  // ── particles converge into the chip ──
  const conv = E.inOutCubic(prog(lt, 0.0, 0.75));
  if (conv < 1) {
    ctx.save();
    ctx.font = `600 22px ${MONO}`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 140; i++) {
      const a = hash(i) * TAU;
      const r0 = 700 + hash(i + 7) * 700;
      const sx = CX + Math.cos(a) * r0 * 1.5;
      const sy = CY + Math.sin(a) * r0 * 0.8;
      const swirl = (1 - conv) * (hash(i + 3) - 0.5) * 3;
      const k = E.inExpo(clampLocal(conv * 1.05 - hash(i + 20) * 0.25));
      const ang = a + swirl;
      const x = lerp(CX + Math.cos(ang) * r0 * 1.5, CX, k);
      const y = lerp(CY + Math.sin(ang) * r0 * 0.8, CY, k);
      void sx;
      void sy;
      const col = [COL.cyan, COL.violet, COL.magenta, COL.amber, COL.lime][i % 5];
      ctx.fillStyle = rgba(col, (1 - k) * 0.95);
      if (i % 3 === 0) ctx.fillText(hash(i * 3 + Math.floor(lt * 20)) > 0.5 ? '1' : '0', x, y);
      else ctx.fillRect(x - 4, y - 4, 8, 8);
    }
    ctx.restore();
  }

  // shock rings on impact
  [0.72, 0.9].forEach((t0, i) => {
    const k = prog(lt, t0, 0.8);
    if (k > 0 && k < 1) {
      glow(ctx, i ? COL.magenta : COL.cyan, 3 * (1 - k) + 0.5, 1 - k, () => {
        ctx.beginPath();
        ctx.arc(CX, CY, 40 + E.outExpo(k) * 520, 0, TAU);
      });
    }
  });
  const flashA = 1 - prog(lt, 0.7, 0.25);
  if (lt > 0.68 && flashA > 0) glowDot(ctx, CX, CY, 90, COL.white, flashA);

  // ── chip glyph ──
  const cp = E.outExpo(prog(lt, 0.7, 0.7));
  if (cp > 0) {
    ctx.save();
    ctx.translate(CX, CY);
    const s = 0.5 + 0.5 * cp;
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, cp * 2);
    const R = 100;
    for (let i = 0; i < 6; i++) {
      const o = -R + 20 + i * ((2 * R - 40) / 5);
      const ext = 34 * E.outBack(prog(lt, 0.85 + i * 0.03, 0.4));
      ctx.strokeStyle = rgba(COL.cyan, 0.9);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(o, -R);
      ctx.lineTo(o, -R - ext);
      ctx.moveTo(o, R);
      ctx.lineTo(o, R + ext);
      ctx.moveTo(-R, o);
      ctx.lineTo(-R - ext, o);
      ctx.moveTo(R, o);
      ctx.lineTo(R + ext, o);
      ctx.stroke();
    }
    rr(ctx, -R, -R, R * 2, R * 2, 24);
    ctx.fillStyle = '#0a1226';
    ctx.fill();
    glow(ctx, COL.cyan, 4, 1, () => rr(ctx, -R, -R, R * 2, R * 2, 24));
    rr(ctx, -56, -56, 112, 112, 12);
    const gr = ctx.createLinearGradient(-56, -56, 56, 56);
    gr.addColorStop(0, COL.cyan);
    gr.addColorStop(0.5, COL.violet);
    gr.addColorStop(1, COL.magenta);
    ctx.fillStyle = gr;
    ctx.globalAlpha *= 0.25 + 0.15 * Math.sin(g * 6);
    ctx.fill();
    ctx.globalAlpha = Math.min(1, cp * 2);
    ctx.strokeStyle = gr;
    ctx.lineWidth = 4;
    ctx.stroke();
    // inner die cells
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const on = hash(r * 3 + c + Math.floor(g * 7)) > 0.45;
        ctx.fillStyle = on ? '#fff' : rgba(COL.white, 0.15);
        ctx.fillRect(-34 + c * 25, -34 + r * 25, 18, 18);
      }
    }
    ctx.restore();
  }

  // ── title ──
  const size = fitSize(ctx, 'MOTION DESIGN', 1500, 200);
  const tb = 640;
  const tl = [lt - 0.05, lt];
  void tl;
  revealChars(ctx, 'MOTION', CX - 10, tb, size, lt, {
    start: 0.95,
    stagger: 0.04,
    dur: 0.7,
    fill: COL.white,
    align: 'center',
    dx: fitHalf(ctx, size, 'MOTION'),
  });
  revealChars(ctx, 'DESIGN', CX + 10, tb, size, lt, {
    start: 1.15,
    stagger: 0.04,
    dur: 0.7,
    stroke: COL.cyan,
    fill: rgba(COL.cyan, E.outCubic(prog(lt, 1.6, 0.4)) * 0.9),
    lw: 3,
    align: 'center',
    dx: fitHalf(ctx, size, 'DESIGN'),
  });

  const sp = E.outCubic(prog(lt, 1.4, 0.5));
  text(ctx, 'SHOWREEL 2026  ·  COMPUTER ARCHITECTURE EDITION', CX, tb + 62, { size: 24, align: 'center', color: COL.mid, track: 6, alpha: sp, weight: 600 });

  // ── stats ──
  const stats: Array<[number, string, string]> = [
    [450, 'FRAMES', COL.cyan],
    [0, 'VIDEO FILES', COL.magenta],
    [100, '% PURE CODE', COL.lime],
  ];
  stats.forEach(([val, lab, col], i) => {
    const p = E.outExpo(prog(lt, 1.35 + i * 0.1, 0.6));
    const n = Math.round(val * E.outCubic(prog(lt, 1.35 + i * 0.1, 0.8)));
    const x = CX + (i - 1) * 440;
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(0, (1 - p) * 40);
    text(ctx, String(n), x, 790, { size: 84, family: '"Space Grotesk",sans-serif', weight: 700, color: col, align: 'center' });
    text(ctx, lab, x, 828, { size: 18, color: COL.mid, align: 'center', track: 5, weight: 600 });
    ctx.restore();
  });

  // ── CTA pill ──
  const pp = E.outBack(prog(lt, 1.6, 0.45));
  if (pp > 0) {
    ctx.save();
    ctx.translate(CX, 910);
    ctx.scale(pp, pp);
    rr(ctx, -250, -34, 500, 68, 34);
    ctx.fillStyle = rgba(COL.lime, 0.12);
    ctx.fill();
    glow(ctx, COL.lime, 2, 0.9, () => rr(ctx, -250, -34, 500, 68, 34));
    const bl = 0.5 + 0.5 * Math.sin(g * 8);
    glowDot(ctx, -205, 0, 6, COL.lime, 0.5 + 0.5 * bl);
    text(ctx, "AVAILABLE FOR HIRE — LET'S MAKE IT MOVE", 18, 8, { size: 18, weight: 700, color: COL.white, align: 'center', track: 2.5 });
    ctx.restore();
  }
  void H;
}

function clampLocal(x: number) {
  return Math.min(1, Math.max(0, x));
}

/** helper: horizontal offset so "MOTION"/"DESIGN" sit side by side centred */
function fitHalf(ctx: Ctx, size: number, which: 'MOTION' | 'DESIGN' = 'MOTION') {
  ctx.save();
  ctx.font = `700 ${size}px "Space Grotesk","Helvetica Neue",Arial,sans-serif`;
  const a = ctx.measureText('MOTION').width;
  const b = ctx.measureText('DESIGN').width;
  ctx.restore();
  const gap = 28;
  const total = a + b + gap;
  // revealChars centre-aligns each word around x; shift so words are placed left/right of true centre
  if (which === 'MOTION') return -(total / 2 - a / 2) + 10;
  return total / 2 - b / 2 - 10;
}
