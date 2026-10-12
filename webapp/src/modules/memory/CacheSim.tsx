import { useEffect, useMemo, useState } from "react";
import { Button, Panel, Segmented, Slider, Stat, Tag, hex } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { geometry, simulate, splitAddress, type CacheCfg, type MissKind } from "../../lib/cache";
import { cn } from "../../utils/cn";

const TAG_C = "#a78bfa";
const IDX_C = "#fbbf24";
const OFF_C = "#38bdf8";
const KIND_C: Record<MissKind, string> = { compulsory: "#fb7185", capacity: "#fb923c", conflict: "#e879f9" };
const KIND_HELP: Record<MissKind, string> = {
  compulsory: "first touch of this block — unavoidable (cold miss)",
  capacity: "even a fully-associative cache this size would have evicted it",
  conflict: "a fully-associative cache would have hit — mapping restrictions caused this",
};

const KIND_SHORT: Record<MissKind, string> = { compulsory: "cold", capacity: "cap", conflict: "conf" };

const ADDR_BITS = 8;

function parseAddresses(text: string): { addrs: number[]; bad: string[] } {
  const addrs: number[] = [];
  const bad: string[] = [];
  for (const tok of text.split(/[\s,;]+/).filter(Boolean)) {
    const n = /^0x[0-9a-f]+$/i.test(tok) ? parseInt(tok, 16) : /^\d+$/.test(tok) ? parseInt(tok, 10) : NaN;
    if (Number.isNaN(n) || n > 255) bad.push(tok);
    else addrs.push(n);
  }
  return { addrs: addrs.slice(0, 200), bad: bad.slice(0, 200) };
}

/* Tiny 4×4 matmul (4-byte elements), row-major: A @ 0x00, B @ 0x40, C @ 0x80.
   Mirrors the lab's matmul traces (workloads/matmul.py): ijk strides down B's
   columns, ikj walks B and C rows contiguously. */
const MN = 4;
const el = (base: number, r: number, c: number) => base + (r * MN + c) * 4;
function matmulTrace(order: "ijk" | "ikj"): number[] {
  const A = 0x00, B = 0x40, C = 0x80;
  const out: number[] = [];
  for (let i = 0; i < MN; i++) {
    for (let outer = 0; outer < MN; outer++) {
      for (let inner = 0; inner < MN; inner++) {
        // ijk: for j(outer) for k(inner);  ikj: for k(outer) for j(inner)
        const j = order === "ijk" ? outer : inner;
        const k = order === "ijk" ? inner : outer;
        out.push(el(A, i, k), el(B, k, j), el(C, i, j));
      }
    }
  }
  return out;
}

const PRESETS: { id: string; name: string; blurb: string; gen: (c: CacheCfg) => number[] }[] = [
  { id: "seq", name: "Sequential scan", blurb: "Walk bytes 0…31 in order. Each miss brings in a whole block, so the following bytes hit — spatial locality.", gen: () => Array.from({ length: 32 }, (_, i) => i) },
  { id: "loop", name: "Tight loop", blurb: "Revisit the same three blocks over and over — temporal locality. After the cold misses, everything hits.", gen: (c) => Array.from({ length: 15 }, (_, i) => (i % 3) * c.block) },
  { id: "stride", name: "Stride = block size", blurb: "Touch one byte per block: no spatial reuse at all, so every first touch misses.", gen: (c) => Array.from({ length: 16 }, (_, i) => i * c.block) },
  { id: "pingpong", name: "Ping-pong (conflict)", blurb: "Two addresses exactly one cache-size apart share an index. Direct-mapped: they evict each other forever. Try 2-way!", gen: (c) => Array.from({ length: 12 }, (_, i) => (i % 2) * c.lines * c.block) },
  { id: "sweep", name: "Array 2× cache, twice", blurb: "Sweep an array twice as large as the cache, then sweep again. The second pass finds nothing left (capacity misses).", gen: (c) => [...Array(2)].flatMap(() => Array.from({ length: 2 * c.lines }, (_, i) => i * c.block)) },
  { id: "random", name: "Random", blurb: "No pattern, no locality: the hit rate is roughly cache size ÷ footprint.", gen: () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 256)) },
  { id: "matmul-ijk", name: "Matmul ijk (naive)", blurb: "Tiny 4×4 C += A·B, arrays at 0x00/0x40/0x80. Inner loop strides down B's rows — a fresh cache line per multiply, exactly the lab's naive rung.", gen: () => matmulTrace("ijk") },
  { id: "matmul-ikj", name: "Matmul ikj (reordered)", blurb: "Same arithmetic, loops swapped: the inner loop walks B and C rows contiguously. Try running ijk vs ikj on the same cache — this gap is the measured 15× at full scale.", gen: () => matmulTrace("ikj") },
];

function AddrBits({ addr, cfg, label }: { addr: number | null; cfg: CacheCfg; label: string }) {
  const g = geometry(cfg);
  if (addr === null) return <div className="text-xs text-dim">{label}: —</div>;
  const s = splitAddress(addr, cfg);
  const bits = addr.toString(2).padStart(ADDR_BITS, "0");
  const tagB = bits.slice(0, g.tagBits);
  const idxB = bits.slice(g.tagBits, g.tagBits + g.indexBits);
  const offB = bits.slice(g.tagBits + g.indexBits);
  const Seg = ({ b, c, n, v }: { b: string; c: string; n: string; v: number }) =>
    b.length === 0 ? null : (
      <div className="text-center">
        <div className="rounded-md border px-1.5 py-1 font-mono text-base font-bold tracking-[0.18em] sm:text-lg" style={{ color: c, borderColor: c + "66", background: c + "18" }}>
          {b}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: c }}>
          {n} = {v}
        </div>
      </div>
    );
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-2 text-xs">
        <span className="font-semibold uppercase tracking-widest text-dim">{label}</span>
        <span className="font-mono text-ink">
          addr {addr} <span className="text-dim">(0x{hex(addr)})</span>
        </span>
      </div>
      <div className="flex gap-1.5">
        <Seg b={tagB} c={TAG_C} n="tag" v={s.tag} />
        <Seg b={idxB} c={IDX_C} n={cfg.ways === 1 ? "index" : "set"} v={s.set} />
        <Seg b={offB} c={OFF_C} n="offset" v={s.offset} />
      </div>
    </div>
  );
}

export function CacheSim() {
  const { t, ts, tf } = useLang();
  const [lines, setLines] = useState(8);
  const [block, setBlock] = useState(4);
  const [ways, setWays] = useState(1);
  const [presetId, setPresetId] = useState<string | null>("seq");
  const cfg: CacheCfg = useMemo(() => ({ lines, block, ways: Math.min(ways, lines), addrBits: ADDR_BITS }), [lines, block, ways]);
  const [text, setText] = useState(() => PRESETS[0].gen({ lines: 8, block: 4, ways: 1, addrBits: ADDR_BITS }).join(", "));
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(450);
  const [hitTime, setHitTime] = useState(1);
  const [penalty, setPenalty] = useState(100);

  const { addrs, bad } = useMemo(() => parseAddresses(text), [text]);
  const sim = useMemo(() => simulate(addrs, cfg), [addrs, cfg]);
  const g = geometry(cfg);
  const N = addrs.length;
  const p = Math.min(pos, N);

  // regenerate preset when geometry changes
  useEffect(() => {
    if (presetId) {
      const pr = PRESETS.find((x) => x.id === presetId)!;
      setText(pr.gen(cfg).join(", "));
    }
  }, [cfg]);

  useEffect(() => {
    setPos(0);
    setPlaying(false);
  }, [text, cfg]);

  useEffect(() => {
    if (!playing) return;
    if (p >= N) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setPos((x) => x + 1), speed);
    return () => window.clearTimeout(timer);
  }, [playing, p, N, speed]);

  const done = sim.accesses.slice(0, p);
  const hits = done.filter((a) => a.hit).length;
  const misses = p - hits;
  const rate = p ? hits / p : 0;
  const kinds: Record<MissKind, number> = { compulsory: 0, capacity: 0, conflict: 0 };
  done.forEach((a) => a.kind && kinds[a.kind]++);
  const last = p > 0 ? sim.accesses[p - 1] : null;
  const nextAddr = p < N ? addrs[p] : null;
  const nextSplit = nextAddr !== null ? splitAddress(nextAddr, cfg) : null;
  const snap = sim.snapshots[p];
  const missRate = p ? misses / p : 0;
  const amat = hitTime + missRate * penalty;
  const preset = PRESETS.find((x) => x.id === presetId);

  const blockRange = (blockAddr: number) => `${blockAddr * block}–${blockAddr * block + block - 1}`;

  return (
    <div className="space-y-5">
      {/* setup */}
      <Panel title={t("Configure the cache")} bodyClassName="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Lines")}</div>
            <Segmented value={lines} onChange={setLines} color="#fbbf24" options={[4, 8, 16].map((v) => ({ value: v, label: String(v) }))} />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Block size (bytes)")}</div>
            <Segmented value={block} onChange={setBlock} color="#fbbf24" options={[2, 4, 8].map((v) => ({ value: v, label: `${v} B` }))} />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Associativity")}</div>
            <Segmented
              value={cfg.ways}
              onChange={setWays}
              color="#fbbf24"
              options={[
                { value: 1, label: t("direct-mapped") },
                { value: 2, label: t("2-way") },
                { value: 4, label: t("4-way") },
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-dim">
          <span>
            {t("capacity")} <b className="font-mono text-ink">{lines * block} B</b>
          </span>
          <span>
            {t("sets")} <b className="font-mono text-ink">{g.sets}</b>
          </span>
          <span>
            {t("address =")} <b style={{ color: TAG_C }}>{g.tagBits} tag</b> + <b style={{ color: IDX_C }}>{g.indexBits} index</b> +{" "}
            <b style={{ color: OFF_C }}>{g.offsetBits} offset</b> {tf("bits ({n}-bit addresses)", { n: ADDR_BITS })}
          </span>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-dim">{t("Access pattern")}</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESETS.map((pr) => (
              <Button
                key={pr.id}
                className="!px-2.5 !py-1 !text-xs"
                active={presetId === pr.id}
                onClick={() => {
                  setPresetId(pr.id);
                  setText(pr.gen(cfg).join(", "));
                }}
              >
                {t(pr.name)}
              </Button>
            ))}
          </div>
          {preset && <p className="mb-2 text-xs leading-relaxed text-mute">{t(preset.blurb)}</p>}
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPresetId(null);
            }}
            rows={2}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-line bg-bg/70 p-3 font-mono text-[13px] leading-relaxed text-ink outline-none focus:border-mem"
            aria-label={ts("Memory address sequence")}
            placeholder="e.g. 0, 4, 8, 0x10, 0x14 …"
          />
          <div className="mt-1 text-xs text-dim">
            {t("Byte addresses 0–255, decimal or")} <span className="font-mono">0x</span>
            {t("hex, separated by commas/spaces.")} {tf("{n} accesses.", { n: N })}
            {bad.length > 0 && <span className="ms-2 text-bad">{tf("Ignored: {list}", { list: bad.slice(0, 4).join(", ") })}</span>}
          </div>
        </div>
      </Panel>

      {/* run controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" color="#fbbf24" onClick={() => setPos(Math.min(N, p + 1))} disabled={p >= N}>{t("Step ▸")}</Button>
        <Button onClick={() => setPos(Math.max(0, p - 1))} disabled={p === 0}>{t("◂ Back")}</Button>
        <Button onClick={() => setPlaying((v) => !v)} disabled={p >= N && !playing} active={playing}>{playing ? t("‖ Pause") : t("▶ Play")}</Button>
        <Button onClick={() => { setPos(N); setPlaying(false); }} disabled={p >= N}>{t("Run to end »")}</Button>
        <Button variant="ghost" onClick={() => { setPos(0); setPlaying(false); }}>{t("↺ Reset")}</Button>
        <div className="ms-auto">
          <Segmented value={speed} onChange={setSpeed} color="#fbbf24" options={[{ value: 900, label: t("slow") }, { value: 450, label: t("normal") }, { value: 120, label: t("fast") }]} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* cache table */}
        <Panel
          title={t("Cache contents")}
          right={
            last ? (
              <Tag color={last.hit ? "#34d399" : "#fb7185"}>{last.hit ? t("HIT") : tf("MISS · {k}", { k: ts(last.kind!) })}</Tag>
            ) : (
              <Tag>{t("empty")}</Tag>
            )
          }
        >
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <AddrBits addr={last ? last.addr : null} cfg={cfg} label={ts("Last access")} />
            <AddrBits addr={nextAddr} cfg={cfg} label={ts("Next access")} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-separate border-spacing-y-1 text-center font-mono text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-dim">
                  <th className="px-2 py-1 text-start font-semibold" style={{ color: IDX_C }}>{cfg.ways === 1 ? "index" : "set"}</th>
                  {Array.from({ length: cfg.ways }).map((_, w) => (
                    <th key={w} className="px-1 py-1 font-semibold" colSpan={1}>
                      {cfg.ways > 1 ? `way ${w}` : "line"} <span className="text-dim/70">(V · tag · block)</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snap.map((set, si) => {
                  const isLast = last && last.set === si;
                  const isNext = nextSplit && nextSplit.set === si;
                  return (
                    <tr key={si}>
                      <td className={cn("rounded-s-lg border-y border-s px-2 py-1.5 text-start font-bold", isNext ? "border-dashed border-mem/70 text-mem" : "border-line/60 text-mem/80")}>
                        {g.indexBits ? si.toString(2).padStart(g.indexBits, "0") : "—"}
                      </td>
                      {set.map((ln, wi) => {
                        const touched = isLast && last!.way === wi;
                        const cls = touched ? (last!.hit ? "flash-good border-good/70" : "flash-bad border-bad/70") : "border-line/60";
                        return (
                          <td
                            key={`${wi}-${touched ? p : 0}`}
                            className={cn("border-y px-1.5 py-1.5", cls, isNext && "border-dashed !border-mem/50", wi === set.length - 1 && "rounded-e-lg border-e")}
                          >
                            {ln.valid ? (
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-good">1</span>
                                <span style={{ color: TAG_C }}>{ln.tag.toString(2).padStart(Math.max(1, g.tagBits), "0")}</span>
                                <span className="text-mute">[{blockRange(ln.blockAddr)}]</span>
                              </div>
                            ) : (
                              <span className="text-dim">0 · — · —</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-dim">
            {last
              ? last.hit
                ? tf("Address {addr} → set {set}: valid bit set and tag {tag} matches → HIT, no memory traffic.", { addr: last.addr, set: last.set, tag: last.tag })
                : last.evicted
                  ? tf("Address {addr} → set {set}: tag mismatch — block [{ev}] is evicted{lru}; block [{blk}] is fetched from memory. ({kind})", {
                      addr: last.addr,
                      set: last.set,
                      ev: blockRange(last.evicted.blockAddr),
                      lru: cfg.ways > 1 ? " (LRU)" : "",
                      blk: blockRange(last.blockAddr),
                      kind: ts(last.kind!),
                    })
                  : tf("Address {addr} → set {set}: line is empty (valid = 0); block [{blk}] is fetched from memory. ({kind})", {
                      addr: last.addr,
                      set: last.set,
                      blk: blockRange(last.blockAddr),
                      kind: ts(last.kind!),
                    })
              : t("Step to feed the first address through the cache. Dashed rows show the set the next address will probe.")}
          </p>
        </Panel>

        {/* stats */}
        <div className="space-y-5">
          <Panel title={t("Hit rate")}>
            <div className="flex items-end justify-between">
              <div className="font-mono text-5xl font-bold tabular-nums transition-colors" style={{ color: p === 0 ? "#62709b" : rate >= 0.5 ? "#34d399" : "#fb7185" }}>
                {p ? (rate * 100).toFixed(1) : "—"}
                <span className="text-2xl">{p ? "%" : ""}</span>
              </div>
              <div className="text-end font-mono text-sm text-mute">
                <div><span className="text-good">{hits}</span> {t("hits")}</div>
                <div><span className="text-bad">{misses}</span> {t("misses")}</div>
              </div>
            </div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-line">
              <div className="bg-good transition-all duration-500" style={{ width: `${p ? (hits / N) * 100 : 0}%` }} />
              <div className="bg-bad transition-all duration-500" style={{ width: `${p ? (misses / N) * 100 : 0}%` }} />
            </div>
            <div className="mt-4 space-y-1.5">
              {(Object.keys(kinds) as MissKind[]).map((k) => (
                <div key={k} className="flex items-baseline gap-2 text-xs" title={ts(KIND_HELP[k])}>
                  <span className="h-2 w-2 rounded-full" style={{ background: KIND_C[k] }} />
                  <span className="w-20 font-semibold capitalize" style={{ color: KIND_C[k] }}>{t(k)}</span>
                  <span className="w-5 font-mono text-ink">{kinds[k]}</span>
                  <span className="text-dim">{t(KIND_HELP[k])}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("Average memory access time")}>
            <div className="grid grid-cols-2 gap-4">
              <Slider label={t("Hit time")} value={hitTime} min={1} max={5} onChange={setHitTime} format={(v) => `${v} cyc`} color="#fbbf24" />
              <Slider label={t("Miss penalty")} value={penalty} min={10} max={300} step={10} onChange={setPenalty} format={(v) => `${v} cyc`} color="#fbbf24" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="AMAT" value={p ? `${amat.toFixed(1)}` : "—"} sub={t("hit time + miss rate × penalty")} color="#fbbf24" />
              <Stat label={t("Without cache")} value={`${penalty}`} sub={t("every access pays the penalty")} />
            </div>
          </Panel>
        </div>
      </div>

      {/* trace */}
      <Panel title={t("Access trace")}>
        <div className="flex flex-wrap gap-1.5">
          {addrs.map((a, i) => {
            const acc = sim.accesses[i];
            const seen = i < p;
            return (
              <div
                key={`${i}-${seen}`}
                title={seen ? (acc.hit ? ts("hit") : tf("{k} miss", { k: ts(acc.kind!) })) : ts("pending")}
                className={cn(
                  "min-w-[2.8rem] rounded-md border px-1.5 py-1 text-center font-mono text-xs transition-colors duration-300",
                  seen ? (acc.hit ? "pop border-good/60 bg-good/15 text-good" : "pop border-bad/60 bg-bad/15 text-bad") : "border-line text-dim",
                  i === p && "border-dashed !border-mem text-mem",
                )}
              >
                {a}
                <div className="text-[9px] leading-none opacity-90">{seen ? (acc.hit ? "hit" : KIND_SHORT[acc.kind!]) : "·"}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dim">
          <span><b className="text-good">hit</b> {t("found in cache")}</span>
          {(Object.keys(KIND_SHORT) as MissKind[]).map((k) => (
            <span key={k}><b style={{ color: KIND_C[k] }}>{KIND_SHORT[k]}</b> {tf("{k} miss", { k: ts(k) })}</span>
          ))}
          <span>{t("dashed = next access")}</span>
        </div>
      </Panel>
    </div>
  );
}
