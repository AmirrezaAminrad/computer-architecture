import { useState } from "react";
import { Callout, Panel, Stat, Tag } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { MATMUL_LADDER, MATMUL_LOOP_ORDER_SPEEDUP, MACHINE, type LadderRun } from "../../lib/lab-data";

const N = 1024; // the lab's ladder is measured at n = 1024
const flops = 2 * N * N * N;
const secondsOf = (gflops: number) => flops / (gflops * 1e9);

const barColor = (i: number, n: number) => {
  const t = n <= 1 ? 1 : i / (n - 1);
  const mix = (a: number[], b: number[], t: number) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
  const from = [251, 113, 133]; // rose: memory-bound
  const to = [52, 211, 153]; // emerald: compute-bound
  const [r, g, b] = mix(from, to, t);
  return `rgb(${r},${g},${b})`;
};

function LadderChart({ sel, onSel }: { sel: number; onSel: (i: number) => void }) {
  const { t, ts } = useLang();
  const max = Math.max(...MATMUL_LADDER.map((r) => r.gflops));
  return (
    <div className="space-y-2.5">
      {MATMUL_LADDER.map((r: LadderRun, i) => {
        const active = i === sel;
        const w = Math.max(3, (r.gflops / max) * 100);
        const c = barColor(i, MATMUL_LADDER.length);
        return (
          <button key={r.impl} onClick={() => onSel(i)} className="block w-full text-start" aria-label={`${ts(r.label)}: ${r.gflops} GFLOPS`}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className={active ? "font-semibold text-ink" : "text-mute"}>{t(r.label)}</span>
              <span className="font-mono font-bold tabular-nums" style={{ color: c }}>
                {r.gflops.toFixed(1)} GFLOP/s
              </span>
            </div>
            <div className="h-6 overflow-hidden rounded-lg border border-line bg-bg/60">
              <div
                className="flex h-full items-center justify-end rounded-lg pe-2 transition-all duration-500"
                style={{ width: `${w}%`, background: c + (active ? "dd" : "55"), borderRight: `2px solid ${c}` }}
              >
                {r.tile ? <span className="font-mono text-[10px] text-ink/80">tile {r.tile}</span> : null}
                {r.threads > 1 ? <span className="ms-1 font-mono text-[10px] text-ink/80">×{r.threads}T</span> : null}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function MatmulLadder() {
  const { t, ts, tf } = useLang();
  const [sel, setSel] = useState(1);
  const run = MATMUL_LADDER[sel];
  const naive = MATMUL_LADDER[0];
  const fastest = MATMUL_LADDER[MATMUL_LADDER.length - 1];

  return (
    <Panel title={t("Measured on real hardware — matmul n = 1024")}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-mute">
            {t("The two toys above are 8×8. The lab took the same ideas to a real 1024×1024 matrix multiply on a")}{" "}
            {MACHINE.cpu.replace("13th Gen Intel(R) Core(TM) ", "")}{" "}
            {t("and climbed an optimization ladder one rung at a time, measuring at every step. Click a rung:")}
          </p>
          <LadderChart sel={sel} onSel={setSel} />
          <div className="mt-3 rounded-xl border border-line bg-bg/50 px-3.5 py-3 text-xs leading-relaxed text-mute">
            <span className="font-semibold text-ink">{t(run.label)}.</span> {t(run.note)}.{" "}
            {tf("{g} GFLOP/s ⇒ one multiplication takes", { g: run.gflops.toFixed(1) })}{" "}
            <span className="font-mono text-ink">{secondsOf(run.gflops).toFixed(secondsOf(run.gflops) < 1 ? 3 : 1)} s</span>.
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label={t("First rung")} value={`${secondsOf(naive.gflops).toFixed(1)} s`} color="#fb7185" sub={t("naive ijk, 1 thread")} />
            <Stat label={t("Top rung")} value={`${secondsOf(fastest.gflops).toFixed(2)} s`} color="#34d399" sub={t(fastest.label.replace("+ ", ""))} />
          </div>
          <Stat
            label={t("Total speedup")}
            value={`${Math.round(fastest.gflops / naive.gflops)}×`}
            color="#fbbf24"
            sub={t("same arithmetic, same machine — only the memory story changed")}
          />
          <div className="rounded-xl border border-line bg-bg/50 px-3.5 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("The first rung is the biggest")}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-bold text-amber-300">{MATMUL_LOOP_ORDER_SPEEDUP}×</span>
              <span className="text-xs text-mute">{t("from reordering three nested loops")}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-dim">
              {t(
                "No vectors, no threads, no tiling — the inner loop just walks rows contiguously so every cache line is used 4× before eviction. Everything the row/column demo showed, at full scale.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Tag color="#fbbf24">n = 1024</Tag>
            <Tag color="#fbbf24">{MACHINE.cpu.replace("13th Gen Intel(R) Core(TM) ", "")}</Tag>
            <Tag color="#fbbf24">{tf("measured {date}", { date: MACHINE.date })}</Tag>
          </div>
        </div>
      </div>
      <Callout title={ts("Go deeper — this repo measured it")} tone="note">
        {t("Full ladder, verification and build context:")}{" "}
        <span className="font-mono text-ink">cpu-cache-lab/docs/matmul.md</span> {t("and")}{" "}
        <span className="font-mono text-ink">cpu-cache-lab/results/matmul.csv</span>. {t("Rerun with")}{" "}
        <span className="font-mono text-ink">make run</span> {t("in")} <span className="font-mono text-ink">cpu-cache-lab/</span>;{" "}
        {t("regenerate these numbers with")} <span className="font-mono text-ink">python cpu-cache-lab/scripts/export_lab_data.py</span>.
      </Callout>
    </Panel>
  );
}
