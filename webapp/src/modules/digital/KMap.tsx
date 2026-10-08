import { useMemo, useState } from "react";
import { Button, Callout, Panel } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { SIGNAL } from "../../lib/theme";

type Dim = 3 | 4;
const GRAY4 = [0, 1, 3, 2];
const LOOP_COLORS = ["#22d3ee", "#fb923c", "#34d399", "#f472b6", "#a78bfa", "#fbbf24", "#38bdf8", "#fb7185"];

const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

/** Cyclic-contiguous position windows (K-map adjacency), sizes 1,2,(4). */
function windows(n: number): number[][] {
  const out: number[][] = [];
  for (let size = 1; size <= n; size *= 2) {
    for (let start = 0; start < n; start++) {
      const s: number[] = [];
      for (let k = 0; k < size; k++) s.push((start + k) % n);
      if (!out.some((o) => sameSet(o, s))) out.push(s);
    }
  }
  return out;
}

interface Implicant {
  rows: number[];
  cols: number[];
  minterms: number[];
  term: string;
}

function buildImplicants(dim: Dim, ones: Set<number>): Implicant[] {
  const rowWins = windows(dim === 3 ? 2 : 4);
  const colWins = windows(4);
  const imp: Implicant[] = [];
  for (const rows of rowWins) {
    for (const cols of colWins) {
      const minterms: number[] = [];
      for (const rp of rows) {
        for (const cp of cols) {
          const m = dim === 3 ? rp * 4 + GRAY4[cp] : GRAY4[rp] * 4 + GRAY4[cp];
          minterms.push(m);
        }
      }
      if (!minterms.every((m) => ones.has(m))) continue;
      imp.push({ rows, cols, minterms, term: termOf(dim, minterms) });
    }
  }
  return imp;
}

function termOf(dim: Dim, minterms: number[]): string {
  const nVars = dim;
  let s = "";
  for (let v = 0; v < nVars; v++) {
    const bitPos = nVars - 1 - v; // v=0 → MSB (A)
    const bits = new Set(minterms.map((m) => (m >> bitPos) & 1));
    if (bits.size === 1) s += "ABCD"[v] + (bits.has(0) ? "′" : "");
  }
  return s || "1";
}

function isContained(a: Implicant, b: Implicant) {
  return a !== b && a.minterms.every((m) => b.minterms.includes(m));
}

/** Minimal SOP: essential prime implicants, then greedy on remaining minterms. */
function minimalCover(dim: Dim, ones: Set<number>) {
  const all = buildImplicants(dim, ones);
  const primes = all.filter((p) => !all.some((q) => isContained(p, q)));
  const uncovered = new Set(ones);
  const cover: Implicant[] = [];
  for (const p of primes) {
    const alone = [...uncovered].filter((m) => p.minterms.includes(m) && primes.filter((q) => q.minterms.includes(m)).length === 1);
    if (alone.length > 0 && p.minterms.some((m) => alone.includes(m))) {
      cover.push(p);
      p.minterms.forEach((m) => uncovered.delete(m));
    }
  }
  while (uncovered.size > 0) {
    let best: Implicant | null = null;
    for (const p of primes) {
      if (cover.includes(p)) continue;
      const hits = p.minterms.filter((m) => uncovered.has(m)).length;
      if (hits > 0 && (!best || hits > best.minterms.filter((m) => uncovered.has(m)).length)) best = p;
    }
    if (!best) break;
    cover.push(best);
    best.minterms.forEach((m) => uncovered.delete(m));
  }
  return { primes, cover };
}

/** Decompose a cyclic window into maximal straight runs (for drawing rects). */
function runsOf(win: number[], n: number): number[][] {
  const sorted = [...win].sort((a, b) => a - b);
  if (win.length === 1 || win.length === n) return [sorted];
  const isWrap = win.some((p) => p === 0) && win.some((p) => p === n - 1);
  if (!isWrap) return [sorted];
  // split: the wrap pair (n-1, 0) breaks into two single runs; middle stays contiguous
  const inner = sorted.filter((p) => p !== 0 && p !== n - 1);
  const out: number[][] = [[n - 1]];
  if (inner.length) {
    // inner may itself be contiguous with one of the ends — keep it simple: emit inner as its own run
    out.push(inner);
  }
  out.push([0]);
  return out;
}

const CELL = 52;
const LABEL_W = 34;
const HEAD_H = 24;

export function KMap() {
  const { t } = useLang();
  const [dim, setDim] = useState<Dim>(3);
  const [ones, setOnes] = useState<Set<number>>(new Set([0, 3, 4]));

  const nRows = dim === 3 ? 2 : 4;
  const W = LABEL_W + 4 * CELL + 6;
  const H = HEAD_H + nRows * CELL + 6;

  const { cover } = useMemo(() => minimalCover(dim, ones), [dim, ones]);
  const allOnes = ones.size === (dim === 3 ? 8 : 16);
  const sorted = [...ones].sort((a, b) => a - b);
  const maxterms = useMemo(
    () => Array.from({ length: dim === 3 ? 8 : 16 }, (_, i) => i).filter((m) => !ones.has(m)),
    [dim, ones],
  );

  const toggle = (m: number) => {
    const next = new Set(ones);
    if (next.has(m)) next.delete(m);
    else next.add(m);
    setOnes(next);
  };

  const preset = (d: Dim, set: number[]) => {
    setDim(d);
    setOnes(new Set(set));
  };

  // term → color for the drawn loops
  const colored = cover.map((c, i) => ({ ...c, color: LOOP_COLORS[i % LOOP_COLORS.length] }));

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Panel title={t("Karnaugh map — click cells to toggle 1s")} bodyClassName="overflow-x-auto">
          <div dir="ltr">
            <svg width={W} height={H} className="max-w-full">
              {/* column headers: C D (or B C) gray codes */}
              {[0, 1, 3, 2].map((bc, ci) => (
                <text key={ci} x={LABEL_W + ci * CELL + CELL / 2} y={16} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">
                  {bc.toString(2).padStart(2, "0")}
                </text>
              ))}
              {/* row headers */}
              {(dim === 3 ? [0, 1] : GRAY4).map((ab, ri) => (
                <text key={ri} x={LABEL_W / 2} y={HEAD_H + ri * CELL + CELL / 2 + 4} fontSize={12} fontWeight={700} fill={SIGNAL.mute} textAnchor="middle">
                  {dim === 3 ? String(ab) : ab.toString(2).padStart(2, "0")}
                </text>
              ))}
              {/* variable labels */}
              <text x={4} y={12} fontSize={10} fill={SIGNAL.dim}>{dim === 3 ? "A\\BC" : "AB\\CD"}</text>

              {/* cells */}
              {Array.from({ length: nRows }, (_, ri) =>
                Array.from({ length: 4 }, (_, ci) => {
                  const m = dim === 3 ? ri * 4 + GRAY4[ci] : GRAY4[ri] * 4 + GRAY4[ci];
                  const on = ones.has(m);
                  const x = LABEL_W + ci * CELL;
                  const y = HEAD_H + ri * CELL;
                  return (
                    <g key={m} onClick={() => toggle(m)} style={{ cursor: "pointer" }}>
                      <rect x={x} y={y} width={CELL - 2} height={CELL - 2} rx={6} fill={on ? "rgba(251,146,60,.16)" : "#0b1226"} stroke={on ? "#fb923c" : "#223052"} strokeWidth={1.5} style={{ transition: "all .2s" }} />
                      <text x={x + 5} y={y + 12} fontSize={9} fill={SIGNAL.dim}>{m}</text>
                      <text x={x + CELL / 2 - 1} y={y + CELL / 2 + 7} fontSize={17} fontWeight={800} textAnchor="middle" fill={on ? "#fb923c" : "#31406e"} style={{ transition: "fill .2s" }}>
                        {on ? 1 : 0}
                      </text>
                    </g>
                  );
                }),
              )}

              {/* cover loops */}
              {colored.map((c, i) =>
                runsOf(c.rows, nRows).flatMap((rr) =>
                  runsOf(c.cols, 4).map((cc, k) => {
                    const x = LABEL_W + Math.min(...cc) * CELL + 3;
                    const y = HEAD_H + Math.min(...rr) * CELL + 3;
                    const w = (Math.max(...cc) - Math.min(...cc) + 1) * CELL - 8;
                    const h = (Math.max(...rr) - Math.min(...rr) + 1) * CELL - 8;
                    return (
                      <rect key={`${i}-${k}`} x={x} y={y} width={w} height={h} rx={14} fill={c.color + "14"} stroke={c.color} strokeWidth={2.5} style={{ pointerEvents: "none" }} />
                    );
                  }),
                ),
              )}
            </svg>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("Notation & result")}>
            <div className="space-y-3 text-[14px]">
              <div className="font-mono text-ink" dir="ltr">
                f = Σm({sorted.length ? sorted.join(", ") : "—"})
              </div>
              <div className="font-mono text-mute" dir="ltr">
                f = ∏M({maxterms.join(", ")})
              </div>
              <div className="border-t border-line pt-3">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Minimal sum of products")}</div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-lg font-semibold text-ink" dir="ltr">
                  <span>F =</span>
                  {allOnes ? (
                    <span>1</span>
                  ) : (
                    colored.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5">
                        {i > 0 && <span className="text-dim">+</span>}
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                        {c.term}
                      </span>
                    ))
                  )}
                </div>
                <div className="mt-2 text-[13px] text-mute">
                  {t("Each colored loop is one product term — a group of 2ᵏ adjacent 1s whose variables that stay constant survive; the rest drop out.")}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title={t("Presets from the slides")}>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => preset(3, [0, 3, 4])}>{t("3-var · F = A′B′C′ + A′BC + AB′C′")}</Button>
              <Button onClick={() => preset(4, [3, 9, 12])}>{t("4-var · Σm(3, 9, 12)")}</Button>
              <Button variant="ghost" onClick={() => setOnes(new Set())}>{t("Clear")}</Button>
            </div>
          </Panel>
        </div>
      </div>

      <Callout title={t("Wrap-around adjacency")} tone="warn">
        {t("Edges are neighbors: the leftmost and rightmost columns touch, and so do the top and bottom rows — that is why groups of 2, 4 or 8 can wrap around the border of the map. Try Σm(0, 2, 8, 10) to see the four corners collapse into a single term B′D′.")}
      </Callout>
    </div>
  );
}
