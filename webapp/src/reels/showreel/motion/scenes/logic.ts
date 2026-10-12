import { MONO, bg, glow, glowDot, header, polyPath, rr, text, type Pt } from '../draw';
import { COL, E, prog, rgba } from '../util';

type Ctx = CanvasRenderingContext2D;

const GX = 640; // gate left
const XOR_Y = 430;
const AND_Y = 700;

export function logic(ctx: Ctx, lt: number, g: number) {
  bg(ctx, g, COL.cyan);
  header(ctx, lt, '01', 'LOGIC', '// half adder — two gates, one bit of math', COL.cyan);

  const step = 0.4;
  const t0 = 1.0;
  const idx = lt < t0 ? -1 : Math.floor((lt - t0) / step);
  const st = idx < 0 ? 0 : idx % 4;
  const A = (st >> 1) & 1;
  const B = st & 1;
  const S = A ^ B;
  const C = A & B;

  // ── wires ──
  const wires: Array<{ pts: Pt[]; on: number; col: string }> = [
    { pts: [[260, 458], [GX + 12, 458]], on: A, col: COL.cyan },
    { pts: [[420, 458], [420, 728], [GX + 4, 728]], on: A, col: COL.cyan },
    { pts: [[260, 840], [520, 840], [520, 512], [GX + 12, 512]], on: B, col: COL.violet },
    { pts: [[520, 782], [GX + 4, 782]], on: B, col: COL.violet },
    { pts: [[GX + 100, 485], [1000, 485]], on: S, col: COL.amber },
    { pts: [[GX + 100, 755], [1000, 755]], on: C, col: COL.magenta },
  ];
  wires.forEach((w, i) => {
    const wp = E.outCubic(prog(lt, 0.2 + i * 0.07, 0.5));
    if (wp <= 0) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(COL.mid, 0.45);
    ctx.lineWidth = 5;
    polyPath(ctx, w.pts, wp);
    ctx.stroke();
    ctx.restore();
    if (w.on && wp > 0.99) {
      glow(ctx, w.col, 4.5, 0.85, () => polyPath(ctx, w.pts));
      ctx.save();
      ctx.setLineDash([5, 30]);
      ctx.lineDashOffset = -g * 260;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      polyPath(ctx, w.pts);
      ctx.stroke();
      ctx.restore();
    }
  });
  // junction dots
  const jp = E.outBack(prog(lt, 0.7, 0.3));
  ([[420, 458, A, COL.cyan], [520, 782, B, COL.violet]] as Array<[number, number, number, string]>).forEach(([x, y, on, c]) => {
    ctx.beginPath();
    ctx.arc(x, y, 8 * jp, 0, Math.PI * 2);
    ctx.fillStyle = on ? c : COL.mid;
    ctx.fill();
  });

  // ── gates ──
  const gate = (kind: 'XOR' | 'AND', y: number, on: number, col: string, k: number) => {
    const p = E.outBack(prog(lt, 0.45 + k * 0.12, 0.5));
    if (p <= 0) return;
    const w = 150;
    const h = 110;
    ctx.save();
    ctx.translate(GX + w / 2, y + h / 2);
    ctx.scale(p, p);
    ctx.translate(-(GX + w / 2), -(y + h / 2));
    const path = () => {
      ctx.beginPath();
      if (kind === 'AND') {
        ctx.moveTo(GX, y);
        ctx.lineTo(GX + 0.5 * w, y);
        ctx.bezierCurveTo(GX + 0.95 * w, y, GX + 0.95 * w, y + h, GX + 0.5 * w, y + h);
        ctx.lineTo(GX, y + h);
        ctx.closePath();
      } else {
        ctx.moveTo(GX + 0.1 * w, y);
        ctx.bezierCurveTo(GX + 0.55 * w, y, GX + 0.9 * w, y + 0.3 * h, GX + w, y + 0.5 * h);
        ctx.bezierCurveTo(GX + 0.9 * w, y + 0.7 * h, GX + 0.55 * w, y + h, GX + 0.1 * w, y + h);
        ctx.quadraticCurveTo(GX + 0.35 * w, y + 0.5 * h, GX + 0.1 * w, y);
        ctx.closePath();
      }
    };
    path();
    ctx.fillStyle = COL.panel;
    ctx.fill();
    if (on) glow(ctx, col, 3, 0.9, path);
    ctx.strokeStyle = on ? col : rgba(COL.mid, 0.9);
    ctx.lineWidth = 3;
    path();
    ctx.stroke();
    if (kind === 'XOR') {
      ctx.beginPath();
      ctx.moveTo(GX - 0.04 * w, y);
      ctx.quadraticCurveTo(GX + 0.21 * w, y + 0.5 * h, GX - 0.04 * w, y + h);
      ctx.stroke();
    }
    text(ctx, kind, GX + 0.52 * w, y + h / 2 + 8, { size: 22, weight: 700, align: 'center', color: on ? col : COL.mid, track: 2 });
    ctx.restore();
  };
  gate('XOR', XOR_Y, S, COL.amber, 0);
  gate('AND', AND_Y, C, COL.magenta, 1);

  // ── lamps ──
  const lamp = (y: number, on: number, col: string, label: string, k: number) => {
    const p = E.outBack(prog(lt, 0.8 + k * 0.1, 0.4));
    if (p <= 0) return;
    ctx.save();
    ctx.translate(1050, y);
    ctx.scale(p, p);
    if (on) glowDot(ctx, 0, 0, 22, col, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fillStyle = on ? rgba(col, 0.9) : COL.panel;
    ctx.fill();
    ctx.strokeStyle = on ? '#fff' : COL.mid;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, String(on), 0, 11, { size: 32, weight: 700, align: 'center', color: on ? '#05060b' : COL.mid });
    text(ctx, label, 56, 8, { size: 22, weight: 600, color: on ? col : COL.mid, track: 3 });
    ctx.restore();
  };
  lamp(485, S, COL.amber, 'SUM', 0);
  lamp(755, C, COL.magenta, 'CARRY', 1);

  // ── switches ──
  const sw = (y: number, on: number, col: string, label: string, k: number) => {
    const p = E.outExpo(prog(lt, 0.15 + k * 0.1, 0.5));
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate((1 - p) * -60, 0);
    rr(ctx, 160, y - 26, 100, 52, 26);
    ctx.fillStyle = on ? rgba(col, 0.22) : COL.panel;
    ctx.fill();
    ctx.strokeStyle = on ? col : COL.mid;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(on ? 234 : 186, y, 19, 0, Math.PI * 2);
    ctx.fillStyle = on ? col : COL.mid;
    ctx.fill();
    text(ctx, `INPUT ${label}`, 160, y - 44, { size: 18, color: COL.mid, track: 3, weight: 600 });
    ctx.restore();
  };
  sw(458, A, COL.cyan, 'A', 0);
  sw(840, B, COL.violet, 'B', 1);

  // ── truth table ──
  const tx = 1340;
  const cw = 108;
  const rowsY = 520;
  const hp = E.outCubic(prog(lt, 0.6, 0.4));
  ['A', 'B', 'S', 'C'].forEach((h, i) => {
    text(ctx, h, tx + i * cw + cw / 2, 478, {
      size: 26,
      weight: 700,
      align: 'center',
      color: [COL.cyan, COL.violet, COL.amber, COL.magenta][i],
      alpha: hp,
    });
  });
  ctx.fillStyle = rgba(COL.white, 0.25 * hp);
  ctx.fillRect(tx, 492, cw * 4 * hp, 1.5);
  for (let r = 0; r < 4; r++) {
    const rp = E.outExpo(prog(lt, 0.7 + r * 0.08, 0.5));
    const ra = (r >> 1) & 1;
    const rb = r & 1;
    const active = idx >= 0 && r === st;
    ctx.save();
    ctx.globalAlpha = rp;
    ctx.translate((1 - rp) * 80, 0);
    const y = rowsY + r * 66;
    if (active) {
      rr(ctx, tx - 12, y - 30, cw * 4 + 24, 56, 12);
      ctx.fillStyle = rgba(COL.cyan, 0.16);
      ctx.fill();
      ctx.strokeStyle = rgba(COL.cyan, 0.9);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    [ra, rb, ra ^ rb, ra & rb].forEach((v, i) => {
      text(ctx, String(v), tx + i * cw + cw / 2, y + 9, {
        size: 32,
        weight: 600,
        align: 'center',
        color: v ? (active ? COL.white : COL.cyan) : COL.mid,
      });
    });
    ctx.restore();
  }

  // equation readout
  const ep = E.outExpo(prog(lt, 1.0, 0.5));
  text(ctx, `${A} + ${B} = ${C}${S}`, tx - 4, 892, { size: 72, family: '"Space Grotesk",sans-serif', weight: 700, alpha: ep });
  text(ctx, 'BINARY RESULT  (CARRY · SUM)', tx, 808, { size: 18, color: COL.mid, track: 3, alpha: ep, weight: 600 });
  void MONO;
}
