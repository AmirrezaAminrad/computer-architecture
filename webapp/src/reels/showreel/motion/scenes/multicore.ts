import { bg, glow, glowDot, header, pointAlong, polyLen, polyPath, rr, text, type Pt } from '../draw';
import { COL, E, hash, prog, rgba } from '../util';

type Ctx = CanvasRenderingContext2D;

const DX = 900;
const DY = 440;
const DW = 744;
const DH = 480;
const CORE_COLS = [COL.cyan, COL.violet, COL.magenta, COL.amber];
const CORES: Array<[number, number]> = [
  [928, 468],
  [1286, 468],
  [928, 626],
  [1286, 626],
];
const BUS: Pt[][] = [
  [[928, 612], [1616, 612]],
  [[1272, 468], [1272, 756]],
  [[928, 770], [1616, 770]],
];

export function multicore(ctx: Ctx, lt: number, g: number) {
  bg(ctx, g, COL.amber, 0.78, 0.7);
  header(ctx, lt, '04', 'MULTICORE', '// four cores, one clock, shared everything', COL.amber);

  // ── left panel : threads + clock ──
  const lp = E.outExpo(prog(lt, 0.3, 0.6));
  const threads = Math.floor(8 * E.outCubic(prog(lt, 0.5, 1.0)) + 0.0001);
  text(ctx, 'ACTIVE THREADS', 140, 462, { size: 18, color: COL.mid, track: 5, weight: 600, alpha: lp });
  ctx.save();
  ctx.beginPath();
  ctx.rect(120, 470, 600, 210);
  ctx.clip();
  text(ctx, String(threads), 140, 650 + (1 - lp) * 200, { size: 230, family: '"Space Grotesk",sans-serif', weight: 700, color: COL.white });
  text(ctx, `/ 8`, 140 + (threads >= 10 ? 280 : 160), 650 + (1 - lp) * 200, { size: 64, family: '"Space Grotesk",sans-serif', weight: 500, color: COL.mid });
  ctx.restore();

  for (let i = 0; i < 8; i++) {
    const on = i < threads;
    const p = E.outBack(prog(lt, 0.5 + i * 0.1, 0.35));
    const x = 140 + i * 66;
    ctx.save();
    ctx.translate(x + 26, 724);
    ctx.scale(0.4 + 0.6 * p, 0.4 + 0.6 * p);
    rr(ctx, -26, -26, 52, 52, 10);
    ctx.fillStyle = on ? rgba(CORE_COLS[i % 4], 0.85) : rgba(COL.white, 0.05);
    ctx.fill();
    ctx.strokeStyle = on ? '#fff' : COL.dim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    if (on && lt - (0.5 + i * 0.1) < 0.4) glowDot(ctx, x + 26, 724, 10, CORE_COLS[i % 4], 1 - (lt - (0.5 + i * 0.1)) / 0.4);
  }

  // clock wave
  text(ctx, 'CLK  5.2 GHz', 140, 810, { size: 20, color: COL.amber, track: 4, weight: 600, alpha: lp });
  const wp = E.outCubic(prog(lt, 0.8, 0.5));
  if (wp > 0) {
    const off = (g * 180) % 80;
    const pts: Pt[] = [];
    for (let k = 0; k < 10; k++) {
      const x = 140 - off + k * 40;
      const hi = k % 2 === 0;
      const y = hi ? 842 : 890;
      pts.push([x, y], [x + 40, y]);
    }
    // build stepped path
    const path = () => {
      ctx.beginPath();
      let started = false;
      let prevY = 0;
      for (const [x, y] of pts) {
        const cx = x;
        if (!started) {
          ctx.moveTo(cx, y);
          started = true;
        } else if (y !== prevY) {
          ctx.lineTo(cx, prevY);
          ctx.lineTo(cx, y);
        } else ctx.lineTo(cx, y);
        prevY = y;
      }
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(140, 825, 540 * wp, 90);
    ctx.clip();
    glow(ctx, COL.amber, 3, 0.9, path);
    ctx.restore();
  }

  // ── die ──
  const perim: Pt[] = [
    [DX, DY],
    [DX + DW, DY],
    [DX + DW, DY + DH],
    [DX, DY + DH],
    [DX, DY],
  ];
  const dp = E.outCubic(prog(lt, 0.05, 0.7));
  const fillA = E.outCubic(prog(lt, 0.4, 0.4));
  rr(ctx, DX, DY, DW, DH, 18);
  ctx.fillStyle = rgba('#0b1122', 0.92 * fillA);
  ctx.fill();
  glow(ctx, COL.amber, 3, 0.9, () => polyPath(ctx, perim, dp));

  // pins
  const pinA = E.outCubic(prog(lt, 0.2, 0.6));
  for (let i = 0; i < 24; i++) {
    const x = 928 + i * 30 - 5;
    const wave = 0.35 + 0.65 * Math.max(0, Math.sin(g * 6 - i * 0.5));
    ctx.fillStyle = rgba(COL.amber, 0.25 + 0.6 * wave);
    ctx.globalAlpha = pinA;
    ctx.fillRect(x, DY - 26 * pinA, 12, 22);
    ctx.fillRect(x, DY + DH + 4, 12, 22 * pinA);
  }
  for (let j = 0; j < 14; j++) {
    const y = DY + 24 + j * 32;
    const wave = 0.35 + 0.65 * Math.max(0, Math.sin(g * 6 + j * 0.6));
    ctx.fillStyle = rgba(COL.amber, 0.25 + 0.6 * wave);
    ctx.fillRect(DX - 26 * pinA, y, 22, 12);
    ctx.fillRect(DX + DW + 4, y, 22 * pinA, 12);
  }
  ctx.globalAlpha = 1;

  // bus traces
  const busA = E.outCubic(prog(lt, 0.5, 0.5));
  BUS.forEach((b) => {
    ctx.strokeStyle = rgba(COL.white, 0.12 * busA);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    polyPath(ctx, b);
    ctx.stroke();
  });

  // L3
  const l3 = E.outBack(prog(lt, 0.7, 0.5));
  if (l3 > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, l3);
    rr(ctx, 928, 784, 688, 108, 12);
    ctx.fillStyle = rgba(COL.amber, 0.08);
    ctx.fill();
    ctx.strokeStyle = rgba(COL.amber, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let c = 0; c < 36; c++) {
      for (let r = 0; r < 3; r++) {
        const h = hash(c * 17 + r * 5 + Math.floor(g * 9) * 3.1);
        ctx.fillStyle = rgba(COL.amber, h > 0.82 ? 0.95 : h > 0.5 ? 0.3 : 0.1);
        ctx.fillRect(1010 + c * 16 - 80, 828 + r * 18, 12, 12);
      }
    }
    text(ctx, 'SHARED L3', 946, 812, { size: 16, color: COL.amber, track: 3, weight: 700 });
    ctx.restore();
  }

  // cores
  CORES.forEach(([x, y], i) => {
    const t0 = 0.55 + i * 0.16;
    const p = E.outBack(prog(lt, t0, 0.45));
    if (p <= 0) return;
    const col = CORE_COLS[i];
    const flash = 1 - prog(lt, t0, 0.5);
    ctx.save();
    ctx.translate(x + 165, y + 65);
    ctx.scale(p, p);
    ctx.translate(-165, -65);
    rr(ctx, 0, 0, 330, 130, 14);
    ctx.fillStyle = rgba(col, 0.1 + flash * 0.4);
    ctx.fill();
    glow(ctx, col, 2.5, 0.9, () => rr(ctx, 0, 0, 330, 130, 14));
    text(ctx, `CORE ${i}`, 20, 34, { size: 20, weight: 700, color: COL.white, track: 3 });
    text(ctx, `T${i * 2} · T${i * 2 + 1}`, 20, 58, { size: 14, color: col, track: 2, weight: 600 });
    // activity bars
    for (let k = 0; k < 18; k++) {
      const v = 0.25 + 0.75 * Math.abs(Math.sin(g * 6.5 + k * 0.62 + i * 1.9));
      const bh = v * 44;
      ctx.fillStyle = rgba(col, 0.35 + 0.65 * v);
      ctx.fillRect(18 + k * 17, 112 - bh, 11, bh);
    }
    // little ALU square
    rr(ctx, 262, 18, 50, 50, 8);
    ctx.strokeStyle = rgba(col, 0.9);
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'ALU', 287, 49, { size: 15, weight: 700, color: col, align: 'center' });
    ctx.restore();
  });

  // packets on the bus
  if (busA > 0.5) {
    for (let k = 0; k < 18; k++) {
      const b = BUS[k % BUS.length];
      const len = polyLen(b);
      const sp = 0.18 + hash(k) * 0.3;
      const ph = (g * sp * (k % 2 ? 1 : -1) + hash(k + 40) + 10) % 1;
      const [px, py] = pointAlong(b, ph * len);
      glowDot(ctx, px, py, 5, [COL.cyan, COL.amber, COL.magenta, COL.lime][k % 4], busA);
    }
  }
}
