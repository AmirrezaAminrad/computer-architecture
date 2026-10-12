import { bg, header, rr, statRight, text } from '../draw';
import { COL, E, lerp, prog, rgba } from '../util';

type Ctx = CanvasRenderingContext2D;

const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const NAMES = ['FETCH', 'DECODE', 'EXECUTE', 'MEMORY', 'WRITEBACK'];
const COLORS = [COL.cyan, COL.violet, COL.magenta, COL.amber, COL.lime];
const INSTR = ['ADD   r1, r2, r3', 'LOAD  r4, 0(r1)', 'SUB   r5, r4, r2', 'AND   r6, r1, r5', 'STORE r6, 8(r0)'];

const X0 = 560;
const PITCH = 124;
const CW = 114;
const Y0 = 480;
const RP = 84;
const RH = 72;

export function pipeline(ctx: Ctx, lt: number, g: number) {
  bg(ctx, g, COL.violet, 0.3, 0.6);
  header(ctx, lt, '02', 'PIPELINE', '// five instructions, nine cycles — not twenty-five', COL.violet);

  const start = 0.35;
  const cyc = 0.17;
  const speedup = lerp(1, 25 / 9, E.outCubic(prog(lt, start, cyc * 9)));
  statRight(ctx, lt, 'THROUGHPUT vs UNPIPELINED', `×${speedup.toFixed(1)}`, COL.violet, 0.3);

  // cycle header + active column
  const cur = Math.floor((lt - start) / cyc);
  for (let c = 0; c < 9; c++) {
    const p = E.outExpo(prog(lt, 0.25 + c * 0.03, 0.4));
    const x = X0 + c * PITCH;
    const active = c === cur;
    if (active) {
      const k = (lt - start) / cyc - c;
      ctx.fillStyle = rgba(COL.white, 0.05 + 0.05 * (1 - k));
      ctx.fillRect(x - 5, 424, PITCH, 484);
      ctx.fillStyle = COL.white;
      ctx.fillRect(x - 5, 424, PITCH, 3);
    }
    text(ctx, `T${c + 1}`, x + CW / 2, 452, {
      size: 20,
      weight: 600,
      align: 'center',
      color: active ? COL.white : COL.mid,
      alpha: p,
      track: 2,
    });
  }

  // rows
  for (let i = 0; i < 5; i++) {
    const y = Y0 + i * RP;
    const lp = E.outExpo(prog(lt, 0.3 + i * 0.07, 0.5));
    ctx.save();
    ctx.globalAlpha = lp;
    ctx.translate((1 - lp) * -80, 0);
    rr(ctx, 140, y + RH / 2 - 15, 30, 30, 8);
    ctx.fillStyle = rgba(COL.white, 0.08);
    ctx.fill();
    text(ctx, String(i + 1), 155, y + RH / 2 + 7, { size: 18, align: 'center', color: COL.mid, weight: 700 });
    text(ctx, INSTR[i], 186, y + RH / 2 + 8, { size: 23, color: COL.white, weight: 500 });
    ctx.restore();
    ctx.fillStyle = rgba(COL.white, 0.05 * lp);
    ctx.fillRect(140, y + RP - 6, X0 + 9 * PITCH - 140 - 10, 1);
  }

  // cells
  for (let i = 0; i < 5; i++) {
    for (let s = 0; s < 5; s++) {
      const c = i + s;
      const ta = start + c * cyc;
      const raw = prog(lt, ta, 0.32);
      if (raw <= 0) continue;
      const p = E.outBack(raw);
      const x = X0 + c * PITCH;
      const y = Y0 + i * RP;
      const flash = 1 - prog(lt, ta, 0.4);
      const col = COLORS[s];
      ctx.save();
      ctx.translate(x + CW / 2, y + RH / 2);
      ctx.scale(0.55 + 0.45 * p, 0.55 + 0.45 * p);
      ctx.globalAlpha = Math.min(1, raw * 3);
      ctx.translate(-CW / 2, -RH / 2 + (1 - p) * -22);
      rr(ctx, 0, 0, CW, RH, 14);
      const gr = ctx.createLinearGradient(0, 0, 0, RH);
      gr.addColorStop(0, rgba(col, 0.32 + flash * 0.45));
      gr.addColorStop(1, rgba(col, 0.1 + flash * 0.3));
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (flash > 0.01) {
        rr(ctx, -5, -5, CW + 10, RH + 10, 18);
        ctx.strokeStyle = rgba(col, flash * 0.6);
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      text(ctx, STAGES[s], CW / 2, RH / 2 + 9, { size: 28, weight: 700, align: 'center', color: COL.white, family: '"JetBrains Mono",monospace' });
      ctx.restore();
    }
  }

  // legend
  NAMES.forEach((n, s) => {
    const p = E.outExpo(prog(lt, 1.7 + s * 0.05, 0.4));
    const x = 140 + s * 220;
    ctx.fillStyle = COLORS[s];
    ctx.globalAlpha = p;
    ctx.fillRect(x, 940, 14, 14);
    ctx.globalAlpha = 1;
    text(ctx, `${STAGES[s]} ${n}`, x + 24, 953, { size: 17, color: COL.mid, track: 2, alpha: p, weight: 600 });
  });
}
