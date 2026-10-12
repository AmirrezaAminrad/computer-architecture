import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Callout, Panel, Segmented, Slider, Stat } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { hitRate, simulate, type Access, type CacheCfg } from "../../lib/cache";
import { cn } from "../../utils/cn";

const N = 8; // 8×8 matrix of 4-byte elements = 256 B

/* ───────────── Spatial: matrix traversal ───────────── */

function Grid({ title, sub, order, acc, p }: { title: ReactNode; sub: string; order: number[]; acc: Access[]; p: number }) {
  const { tf } = useLang();
  // order[k] = element index touched at step k
  const stepOf = new Array(N * N).fill(-1);
  order.forEach((el, k) => (stepOf[el] = k));
  const done = acc.slice(0, p);
  const hits = done.filter((a) => a.hit).length;
  const rate = p ? hits / p : 0;
  const cur = p > 0 ? order[p - 1] : -1;
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3 sm:p-4">
      <div className="mb-0.5 flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <span className="font-mono text-sm font-bold" style={{ color: p === 0 ? "#62709b" : rate >= 0.5 ? "#34d399" : "#fb7185" }}>
          {p ? tf("{pct}% hit", { pct: (rate * 100).toFixed(0) }) : "—"}
        </span>
      </div>
      <p className="mb-3 font-mono text-[11px] text-dim">{sub}</p>
      <div className="mx-auto grid max-w-[320px] grid-cols-8 gap-1">
        {Array.from({ length: N * N }).map((_, el) => {
          const k = stepOf[el];
          const seen = k >= 0 && k < p;
          const a = seen ? acc[k] : null;
          return (
            <div
              key={el}
              className={cn(
                "relative flex aspect-square items-center justify-center rounded-[5px] border text-[9px] font-mono transition-all duration-200",
                a ? (a.hit ? "border-good/60 bg-good/25 text-good" : "border-bad/70 bg-bad/30 text-bad") : "border-line bg-raised text-dim/60",
                el === cur && "scale-110 ring-2 ring-white",
              )}
              title={`element [${Math.floor(el / N)}][${el % N}] · address ${el * 4} · visited #${k + 1}`}
            >
              {k + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Spatial() {
  const { t, ts, tf } = useLang();
  const [block, setBlock] = useState(16);
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);

  const cfg: CacheCfg = useMemo(() => ({ lines: 8, block, ways: 1, addrBits: 8 }), [block]);
  const rowOrder = useMemo(() => Array.from({ length: N * N }, (_, k) => k), []);
  const colOrder = useMemo(() => Array.from({ length: N * N }, (_, k) => (k % N) * N + Math.floor(k / N)), []);
  const rowSim = useMemo(() => simulate(rowOrder.map((e) => e * 4), cfg), [rowOrder, cfg]);
  const colSim = useMemo(() => simulate(colOrder.map((e) => e * 4), cfg), [colOrder, cfg]);

  useEffect(() => {
    if (!playing) return;
    if (p >= N * N) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setP((x) => x + 1), 90);
    return () => window.clearTimeout(timer);
  }, [playing, p]);

  useEffect(() => {
    setP(0);
    setPlaying(false);
  }, [block]);

  const penalty = 100;
  const cost = (a: Access[]) => {
    const part = a.slice(0, p);
    return part.reduce((s, x) => s + (x.hit ? 1 : 1 + penalty), 0);
  };
  const rc = cost(rowSim.accesses);
  const cc = cost(colSim.accesses);

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-mute">
        {t(
          "The same 8×8 array of 4-byte integers, stored row by row in memory, is summed twice — once along rows, once down columns. Identical work, identical cache (8 lines, direct-mapped). Press play.",
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" color="#fbbf24" onClick={() => setPlaying((v) => !v)} active={playing}>
          {playing ? t("‖ Pause") : p >= N * N ? t("Done") : t("▶ Play")}
        </Button>
        <Button onClick={() => { setP(0); setPlaying(false); }}>{t("↺ Reset")}</Button>
        <div className="flex items-center gap-2 text-xs text-dim">
          {t("Cache block")}
          <Segmented value={block} onChange={setBlock} color="#fbbf24" options={[{ value: 4, label: "4 B" }, { value: 16, label: "16 B" }, { value: 32, label: "32 B" }]} />
        </div>
        <div className="min-w-[200px] flex-1">
          <Slider label={t("Step")} value={p} min={0} max={N * N} onChange={(v) => { setP(v); setPlaying(false); }} color="#fbbf24" format={(v) => `${v} / ${N * N}`} />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Grid title={t("Row-major walk")} sub="for r: for c: sum += A[r][c]" order={rowOrder} acc={rowSim.accesses} p={p} />
        <Grid title={t("Column-major walk")} sub="for c: for r: sum += A[r][c]" order={colOrder} acc={colSim.accesses} p={p} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("Row-walk cycles")} value={rc} color="#34d399" sub={tf("hit 1 · miss {m}", { m: 1 + penalty })} />
        <Stat label={t("Column-walk cycles")} value={cc} color={cc > rc ? "#fb7185" : "#34d399"} sub={t("same data, same cache")} />
        <Stat label={t("Final hit rate (row)")} value={`${(hitRate(rowSim.accesses) * 100).toFixed(0)}%`} />
        <Stat label={t("Final hit rate (col)")} value={`${(hitRate(colSim.accesses) * 100).toFixed(0)}%`} />
      </div>
      <Callout title={ts("What to notice")} tone="warn">
        {block === 16 &&
          t(
            "With 16-byte blocks, one miss pulls in 4 consecutive ints, so the row walk hits 3 times out of 4 (75%). The column walk jumps 32 bytes per step: each access lands in a different block, and rows 0 and 4 (and 1 and 5…) collide on the same cache line before the next column can reuse anything — 0% hits.",
          )}
        {block === 4 &&
          t(
            "With 4-byte blocks, a block is exactly one int: there is no spatial locality to exploit, so neither order ever hits. Block size is how hardware cashes in on spatial locality.",
          )}
        {block === 32 &&
          t(
            "A 32-byte block is exactly one row, and 8 lines × 32 B = 256 B holds the entire matrix — so the column walk works too after the first column (cold misses only). Same code, same cache size: block size and capacity change the verdict.",
          )}
      </Callout>
    </div>
  );
}

/* ───────────── Temporal: working-set cliff ───────────── */

function Temporal() {
  const { t, ts, tf } = useLang();
  const [w, setW] = useState(6);
  const passes = 6;
  const LINES = 8;
  const BLOCK = 16;

  const curves = useMemo(() => {
    const dm: CacheCfg = { lines: LINES, block: BLOCK, ways: 1, addrBits: 8 };
    const fa: CacheCfg = { lines: LINES, block: BLOCK, ways: LINES, addrBits: 8 };
    const out: { w: number; dm: number; fa: number }[] = [];
    for (let k = 1; k <= 16; k++) {
      const addrs = Array.from({ length: passes }).flatMap(() => Array.from({ length: k }, (_, i) => i * BLOCK));
      out.push({ w: k, dm: hitRate(simulate(addrs, dm).accesses), fa: hitRate(simulate(addrs, fa).accesses) });
    }
    return out;
  }, []);

  const cur = curves[w - 1];
  const X0 = 44, X1 = 560, Y0 = 20, Y1 = 220;
  const x = (k: number) => X0 + ((k - 1) / 15) * (X1 - X0);
  const y = (v: number) => Y1 - v * (Y1 - Y0);
  const path = (key: "dm" | "fa") => curves.map((c, i) => `${i ? "L" : "M"}${x(c.w).toFixed(1)} ${y(c[key]).toFixed(1)}`).join(" ");

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-mute">
        {t("A loop touches")} <b className="text-ink">W</b>{" "}
        {tf(
          "different cache blocks, {n} times in a row (one word per block, so there is no spatial reuse — only temporal). The cache holds 8 blocks (128 B). Drag W and watch the hit rate fall off a cliff when the working set stops fitting.",
          { n: passes },
        )}
      </p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-xl border border-line bg-bg/40 p-3 sm:p-4">
          <svg viewBox="0 0 600 270" className="w-full" role="img" aria-label={ts("Hit rate versus working set size")}>
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line x1={X0} x2={X1} y1={y(v)} y2={y(v)} stroke="#223052" strokeDasharray={v === 0 ? undefined : "3 5"} />
                <text x={X0 - 8} y={y(v) + 4} fontSize={10} fill="#62709b" textAnchor="end">{Math.round(v * 100)}%</text>
              </g>
            ))}
            {curves.map((c) => (
              <text key={c.w} x={x(c.w)} y={Y1 + 16} fontSize={10} fill={c.w === w ? "#fbbf24" : "#62709b"} textAnchor="middle" fontWeight={c.w === w ? 800 : 400}>{c.w}</text>
            ))}
            <text x={(X0 + X1) / 2} y={Y1 + 36} fontSize={11} fill="#98a4cb" textAnchor="middle">{t("working set W (blocks of 16 B)")}</text>
            {/* capacity marker */}
            <line x1={x(8)} x2={x(8)} y1={Y0 - 6} y2={Y1} stroke="#fbbf24" strokeDasharray="4 4" opacity={0.7} />
            <text x={x(8) + 6} y={Y0 + 6} fontSize={10} fill="#fbbf24">{t("cache capacity (8 blocks)")}</text>
            {/* selected */}
            <rect x={x(w) - 12} y={Y0 - 6} width={24} height={Y1 - Y0 + 6} fill="#fbbf24" opacity={0.09} rx={6} style={{ transition: "x .25s" }} />
            <path d={path("fa")} fill="none" stroke="#a78bfa" strokeWidth={2.5} strokeLinejoin="round" />
            <path d={path("dm")} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinejoin="round" />
            <circle cx={x(w)} cy={y(cur.fa)} r={5.5} fill="#a78bfa" stroke="#0d1427" strokeWidth={2} style={{ transition: "all .25s" }} />
            <circle cx={x(w)} cy={y(cur.dm)} r={5.5} fill="#34d399" stroke="#0d1427" strokeWidth={2} style={{ transition: "all .25s" }} />
            <g transform="translate(370 168)" fontSize={11}>
              <rect x={0} y={0} width={10} height={10} rx={2} fill="#34d399" />
              <text x={16} y={9} fill="#c7d0ee">{t("direct-mapped")}</text>
              <rect x={0} y={18} width={10} height={10} rx={2} fill="#a78bfa" />
              <text x={16} y={27} fill="#c7d0ee">{t("fully-assoc. LRU")}</text>
            </g>
          </svg>
        </div>
        <div className="space-y-4">
          <Slider label={t("Working set W")} value={w} min={1} max={16} onChange={setW} color="#fbbf24" format={(v) => tf("{v} blocks · {b} B", { v, b: v * 16 })} />
          <Stat label={t("Direct-mapped")} value={`${(cur.dm * 100).toFixed(0)}%`} color="#34d399" />
          <Stat label={t("Fully-assoc. LRU")} value={`${(cur.fa * 100).toFixed(0)}%`} color="#a78bfa" />
        </div>
      </div>
      <Callout title={ts("Why LRU falls off a hard cliff")} tone="note">
        {t("Looping over just")} <em>{t("one more block")}</em>{" "}
        {tf(
          "than the cache holds is LRU's worst case: each block is evicted right before it's needed again, so the hit rate drops from {pct}% straight to 0%.",
          { pct: (((passes - 1) / passes) * 100).toFixed(0) },
        )}{" "}
        {t(
          "Direct-mapped degrades more gently here (try W = 9–15), because only blocks that collide on an index thrash while the rest stay put — a reminder that associativity and replacement policy shape",
        )}{" "}
        <em>{t("how")}</em> {t("the cliff looks, while capacity decides")} <em>{t("where")}</em> {t("it is.")}
      </Callout>
    </div>
  );
}

export function Locality() {
  const { t } = useLang();
  const [tab, setTab] = useState<"spatial" | "temporal">("spatial");
  return (
    <Panel
      title={t("Locality lab")}
      right={
        <Segmented
          value={tab}
          onChange={setTab}
          color="#fbbf24"
          options={[{ value: "spatial", label: t("Spatial: array order") }, { value: "temporal", label: t("Temporal: working set") }]}
        />
      }
    >
      {tab === "spatial" ? <Spatial /> : <Temporal />}
    </Panel>
  );
}
