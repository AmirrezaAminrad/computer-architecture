import { bg, glowDot, header, statRight, text } from '../draw';
import { COL, E, TAU, clamp, lerp, prog, rgba } from '../util';

type Ctx = CanvasRenderingContext2D;

const LEVELS = [
  { name: 'REGISTERS', size: '1 KB', lat: '0.3 ns', ns: 0.3, col: COL.cyan },
  { name: 'L1 CACHE', size: '64 KB', lat: '1 ns', ns: 1, col: COL.blue },
  { name: 'L2 CACHE', size: '1 MB', lat: '4 ns', ns: 4, col: COL.violet },
  { name: 'L3 CACHE', size: '32 MB', lat: '12 ns', ns: 12, col: '#d44bd0' },
  { name: 'DRAM', size: '32 GB', lat: '80 ns', ns: 80, col: COL.magenta },
  { name: 'SSD', size: '2 TB', lat: '100 µs', ns: 100000, col: COL.amber },
];

const CX = 520;
const Y0 = 424;
const PITCH = 84;
const RH = 76;
const BAR_X = 1010;
const BAR_MAX = 640;

export function memory(ctx: Ctx, lt: number, g: number) {
  bg(ctx, g, COL.magenta, 0.25, 0.7);
  header(ctx, lt, '03', 'MEMORY', '// the hierarchy that hides the speed of light', COL.magenta);

  const pk = prog(lt, 1.0, 0.9);
  const gap = Math.pow(10, 5.5 * pk);
  statRight(ctx, lt, 'LATENCY GAP', `×${Math.round(gap).toLocaleString('en-US')}`, COL.magenta, 0.3);

  const centerY = (i: number) => Y0 + i * PITCH + RH / 2;
  const pkY = lerp(centerY(0), centerY(5), pk);
  text(ctx, 'LATENCY · LOG SCALE', BAR_X, 410, { size: 16, color: COL.mid, track: 4, alpha: prog(lt, 0.5, 0.4), weight: 600 });

  LEVELS.forEach((lv, i) => {
    const p = E.outExpo(prog(lt, 0.25 + i * 0.09, 0.55));
    const cy = centerY(i);
    const hit = lt > 1.0 ? clamp(1 - Math.abs(pkY - cy) / 55) : 0;
    const topW = 210 + i * 98;
    const botW = 210 + (i + 1) * 98 - 8;
    const y = Y0 + i * PITCH;

    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate((1 - p) * -260, 0);
    ctx.beginPath();
    ctx.moveTo(CX - topW / 2, y);
    ctx.lineTo(CX + topW / 2, y);
    ctx.lineTo(CX + botW / 2, y + RH);
    ctx.lineTo(CX - botW / 2, y + RH);
    ctx.closePath();
    const gr = ctx.createLinearGradient(0, y, 0, y + RH);
    gr.addColorStop(0, rgba(lv.col, 0.2 + hit * 0.55));
    gr.addColorStop(1, rgba(lv.col, 0.08 + hit * 0.4));
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = rgba(lv.col, 0.95);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    text(ctx, lv.name, CX, y + 34, { size: 25, weight: 700, align: 'center', family: '"Space Grotesk",sans-serif', color: COL.white, track: 1 });
    text(ctx, lv.size, CX, y + 59, { size: 17, align: 'center', color: lv.col, weight: 600 });
    ctx.restore();

    // bar
    const bp = E.outExpo(prog(lt, 0.55 + i * 0.12, 0.7));
    const n = (Math.log10(lv.ns) + 0.7) / 5.8;
    const len = Math.max(8, n * BAR_MAX) * bp;
    const bh = 34;
    ctx.fillStyle = rgba(COL.white, 0.05 * p);
    ctx.fillRect(BAR_X, cy - bh / 2, BAR_MAX, bh);
    if (len > 0.5) {
      const bg2 = ctx.createLinearGradient(BAR_X, 0, BAR_X + len, 0);
      bg2.addColorStop(0, rgba(lv.col, 0.35));
      bg2.addColorStop(1, rgba(lv.col, 1));
      ctx.fillStyle = bg2;
      ctx.fillRect(BAR_X, cy - bh / 2, len, bh);
      ctx.fillStyle = '#fff';
      ctx.fillRect(BAR_X + len - 3, cy - bh / 2, 3, bh);
    }
    text(ctx, lv.lat, BAR_X + len + 18, cy + 9, { size: 26, weight: 700, color: hit > 0.3 ? COL.white : lv.col, alpha: bp });

    // ripple
    const tHit = 1.0 + (i / 5) * 0.9;
    const age = lt - tHit;
    if (age > 0 && age < 0.55) {
      const k = age / 0.55;
      ctx.beginPath();
      ctx.ellipse(CX, cy, 40 + k * 260, 10 + k * 40, 0, 0, TAU);
      ctx.strokeStyle = rgba(lv.col, (1 - k) * 0.9);
      ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.stroke();
    }
  });

  // data packet
  if (lt > 0.95 && lt < 2.1) {
    const a = clamp(prog(lt, 0.95, 0.1)) * (1 - prog(lt, 1.95, 0.15));
    const tail = 90;
    const tg = ctx.createLinearGradient(0, pkY - tail, 0, pkY);
    tg.addColorStop(0, 'rgba(255,255,255,0)');
    tg.addColorStop(1, `rgba(255,255,255,${0.7 * a})`);
    ctx.fillStyle = tg;
    ctx.fillRect(CX - 3, pkY - tail, 6, tail);
    glowDot(ctx, CX, pkY, 14, COL.white, a);
  }
}
