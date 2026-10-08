import { useMemo, useState } from "react";
import { Panel, Segmented } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { LEVEL_NS, MACHINE } from "../../lib/lab-data";
import { cn } from "../../utils/cn";

type TfFn = (key: string, params: Record<string, string | number>) => string;

interface Level {
  id: string;
  name: string;
  short: string;
  color: string;
  size: string;
  bytes: number; // representative, for log bar
  cycles: number; // representative @ 3 GHz
  latency: string;
  cost: string;
  costDots: number;
  tech: string;
  managedBy: string;
  note: string;
  /** measured mode: tf template overrides for the two dynamic readouts */
  sizeT?: { key: string; params: Record<string, string | number> };
  latencyT?: { key: string; params: Record<string, string | number> };
}

const LEVELS: Level[] = [
  { id: "reg", name: "Registers", short: "Registers", color: "#fb7185", size: "≈ 1 KB (e.g. 16–32 × 64-bit architectural)", bytes: 1e3, cycles: 1, latency: "≈ 0.3 ns", cost: "Most expensive per bit: multi-ported, on the critical path", costDots: 5, tech: "Flip-flops / multi-ported SRAM", managedBy: "Compiler (register allocation)", note: "Operands the ALU can use this very cycle." },
  { id: "l1", name: "L1 cache", short: "L1", color: "#fb923c", size: "32–64 KB per core (split I$ / D$)", bytes: 3.2e4, cycles: 4, latency: "≈ 1 ns (3–5 cycles)", cost: "On-die SRAM: ≳ $1,000 per GB-equivalent of die area", costDots: 5, tech: "SRAM (6T), tiny & heavily optimised", managedBy: "Hardware", note: "Small enough to be accessed in a few cycles." },
  { id: "l2", name: "L2 cache", short: "L2", color: "#fbbf24", size: "256 KB – 2 MB per core", bytes: 5e5, cycles: 12, latency: "≈ 4 ns (12–15 cycles)", cost: "On-die SRAM, denser but slower than L1", costDots: 4, tech: "SRAM", managedBy: "Hardware", note: "Catches most L1 misses." },
  { id: "l3", name: "L3 cache", short: "L3", color: "#a3e635", size: "8–64 MB, shared by all cores", bytes: 3e7, cycles: 40, latency: "≈ 12 ns (≈ 40 cycles)", cost: "Large chunk of die area", costDots: 4, tech: "SRAM, banked, often on a ring/mesh", managedBy: "Hardware", note: "Last line of defence before DRAM; also the sharing point between cores." },
  { id: "ram", name: "Main memory (DRAM)", short: "DRAM", color: "#34d399", size: "16–64 GB", bytes: 3.2e10, cycles: 240, latency: "≈ 80 ns (≈ 240 cycles)", cost: "≈ $3–6 per GB", costDots: 3, tech: "DRAM: 1 transistor + 1 capacitor per bit, needs refresh", managedBy: "OS (virtual memory) + memory controller", note: "Off-chip: wires, row activation and refresh make it ~100× slower than L1." },
  { id: "disk", name: "Storage (SSD / HDD)", short: "Disk", color: "#38bdf8", size: "0.5 – 8 TB (SSD) · up to 20+ TB (HDD)", bytes: 2e12, cycles: 300000, latency: "SSD ≈ 100 µs · HDD ≈ 5–10 ms", cost: "SSD ≈ $0.05–0.10 / GB · HDD ≈ $0.02 / GB", costDots: 1, tech: "NAND flash (SSD) · magnetic platters (HDD) — non-volatile", managedBy: "OS (file system, paging)", note: "The only level that survives power-off — and is millions of times slower than a register." },
];

function humanTime(cycles: number, tf: TfFn) {
  const s = cycles; // 1 cycle ↦ 1 second
  if (s < 60) return tf("{n} second{s}", { n: s, s: s === 1 ? "" : "s" });
  if (s < 3600) return tf("{n} minutes", { n: (s / 60).toFixed(s < 600 ? 1 : 0) });
  if (s < 86400) return tf("{n} hours", { n: (s / 3600).toFixed(1) });
  if (s < 86400 * 60) return tf("{n} days", { n: (s / 86400).toFixed(1) });
  return tf("{n} years", { n: (s / 86400 / 365).toFixed(1) });
}

const fmtBytes = (b: number) => {
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1000 && i < u.length - 1) {
    b /= 1000;
    i++;
  }
  return `${b >= 100 ? b.toFixed(0) : b.toFixed(b < 10 ? 1 : 0)} ${u[i]}`;
};

const kib = (b: number) => {
  const u = ["B", "KiB", "MiB", "GiB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? Math.round(v) : Math.round(v * 100) / 100} ${u[i]}`;
};

/** Textbook levels (above) vs the same levels measured on the lab machine. */
function measuredLevels(): Level[] {
  const get = (level: number, type: string) => MACHINE.caches.find((c) => c.level === level && c.type === type);
  const d1 = get(1, "data");
  const l2 = get(2, "unified");
  const l3 = get(3, "unified");
  const cyc = (ns: number) => Math.round(ns * MACHINE.tscGhz * 10) / 10;
  return LEVELS.map((lv): Level => {
    if (lv.id === "l1" && d1)
      return {
        ...lv,
        size: `${kib(d1.sizeBytes)} per core, ${d1.type} (${d1.ways}-way, ${d1.lineSize} B lines)`,
        sizeT: {
          key: "{cap} per core, {type} ({ways}-way, {line} B lines)",
          params: { cap: kib(d1.sizeBytes), type: d1.type, ways: d1.ways, line: d1.lineSize },
        },
        bytes: d1.sizeBytes,
        cycles: cyc(LEVEL_NS.l1),
        latency: `≈ ${LEVEL_NS.l1} ns (${cyc(LEVEL_NS.l1)} cycles) — measured`,
        latencyT: { key: "≈ {ns} ns ({cyc} cycles) — measured", params: { ns: LEVEL_NS.l1, cyc: cyc(LEVEL_NS.l1) } },
        note: "Pointer-chase plateau below 48 KiB on the lab machine.",
      };
    if (lv.id === "l2" && l2)
      return {
        ...lv,
        size: `${kib(l2.sizeBytes)} per core, unified (${l2.ways}-way)`,
        sizeT: {
          key: "{cap} per core, unified ({ways}-way)",
          params: { cap: kib(l2.sizeBytes), ways: l2.ways },
        },
        bytes: l2.sizeBytes,
        cycles: cyc(LEVEL_NS.l2),
        latency: `≈ ${LEVEL_NS.l2} ns (${cyc(LEVEL_NS.l2)} cycles) — measured`,
        latencyT: { key: "≈ {ns} ns ({cyc} cycles) — measured", params: { ns: LEVEL_NS.l2, cyc: cyc(LEVEL_NS.l2) } },
        note: "The staircase steps ×3 exactly where this cache ends.",
      };
    if (lv.id === "l3" && l3)
      return {
        ...lv,
        size: `${kib(l3.sizeBytes)} shared, unified (${l3.ways}-way)`,
        sizeT: {
          key: "{cap} shared, unified ({ways}-way)",
          params: { cap: kib(l3.sizeBytes), ways: l3.ways },
        },
        bytes: l3.sizeBytes,
        cycles: cyc(LEVEL_NS.l3),
        latency: `≈ ${LEVEL_NS.l3} ns (${cyc(LEVEL_NS.l3)} cycles) — measured`,
        latencyT: { key: "≈ {ns} ns ({cyc} cycles) — measured", params: { ns: LEVEL_NS.l3, cyc: cyc(LEVEL_NS.l3) } },
        note: "First step past L2; the climb up to 32 MiB is L3 sharing and replacement effects.",
      };
    if (lv.id === "ram")
      return {
        ...lv,
        cycles: cyc(LEVEL_NS.dram),
        latency: `≈ ${LEVEL_NS.dram} ns plateau (${cyc(LEVEL_NS.dram)} cycles) — measured`,
        latencyT: {
          key: "≈ {ns} ns plateau ({cyc} cycles) — measured",
          params: { ns: LEVEL_NS.dram, cyc: cyc(LEVEL_NS.dram) },
        },
        note: "Working sets beyond L3 land here: the ~100× cliff between L1 and DRAM, measured.",
      };
    return lv;
  });
}

export function Pyramid() {
  const { t, ts, tf } = useLang();
  const [sel, setSel] = useState(1);
  const [mode, setMode] = useState<"textbook" | "measured">("textbook");
  const measured = useMemo(measuredLevels, []);
  const levels = mode === "measured" ? measured : LEVELS;
  const L = levels[sel];

  const W = 520;
  const rowH = 56;
  const gap = 5;
  const top = 70;
  const bottom = 470;
  const H = levels.length * (rowH + gap);
  const widthAt = (y: number) => top + (bottom - top) * (y / H);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel
          title={t("The hierarchy (click a level)")}
          right={
            <Segmented
              value={mode}
              onChange={setMode}
              color="#fbbf24"
              options={[
                { value: "textbook", label: t("Textbook"), title: ts("Order-of-magnitude values for a ~3 GHz desktop core") },
                {
                  value: "measured",
                  label: t("Measured"),
                  title: tf("Detected caches + pointer-chase latencies on the lab machine ({date})", { date: MACHINE.date }),
                },
              ]}
            />
          }
          bodyClassName="p-3 sm:p-4"
        >
          <div className="relative">
            <svg viewBox={`-50 0 ${W + 100} ${H}`} className="w-full" role="img" aria-label={ts("Memory hierarchy pyramid")} style={{ direction: "ltr" }}>
              {levels.map((lv, i) => {
                const y0 = i * (rowH + gap);
                const y1 = y0 + rowH;
                const w0 = widthAt(y0);
                const w1 = widthAt(y1);
                const cx = W / 2;
                const pts = `${cx - w0 / 2},${y0} ${cx + w0 / 2},${y0} ${cx + w1 / 2},${y1} ${cx - w1 / 2},${y1}`;
                const active = i === sel;
                return (
                  <g key={lv.id} onClick={() => setSel(i)} style={{ cursor: "pointer" }} tabIndex={0} role="button" aria-label={ts(lv.name)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSel(i)}>
                    <polygon
                      points={pts}
                      fill={lv.color + (active ? "55" : "1f")}
                      stroke={lv.color}
                      strokeWidth={active ? 3 : 1.5}
                      strokeLinejoin="round"
                      style={{ transition: "all .25s", filter: active ? `drop-shadow(0 0 10px ${lv.color}77)` : "none" }}
                    />
                    <text x={cx} y={y0 + 24} textAnchor="middle" fontSize={i === 0 ? 12 : 14} fontWeight={800} fill={lv.color} style={{ fontFamily: "var(--font-sans)" }}>
                      {lv.short}
                    </text>
                    <text x={cx} y={y0 + 42} textAnchor="middle" fontSize={11} fill="#c7d0ee">
                      {lv.size.split(" (")[0].split(" · ")[0].replace(" per core", "").replace(", shared by all cores", "")}
                    </text>
                  </g>
                );
              })}
              {/* axes */}
              <g fill="#62709b" fontSize={11}>
                <text x={-46} y={14}>{t("faster")}</text>
                <text x={-46} y={28}>{t("smaller")}</text>
                <text x={-46} y={42}>{t("costlier/B")}</text>
                <text x={W + 46} y={H - 40} textAnchor="end">{t("slower")}</text>
                <text x={W + 46} y={H - 26} textAnchor="end">{t("bigger")}</text>
                <text x={W + 46} y={H - 12} textAnchor="end">{t("cheaper/B")}</text>
              </g>
            </svg>
          </div>
        </Panel>

        <Panel
          title={t(L.name)}
          right={<span className="rounded-md px-2 py-0.5 text-[11px] font-bold" style={{ color: L.color, background: L.color + "22" }}>{tf("LEVEL {n}", { n: sel })}</span>}
          bodyClassName="space-y-4"
        >
          <p className="text-sm text-mute">{t(L.note)}</p>
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-3 text-sm">
            <dt className="text-dim">{t("Capacity")}</dt>
            <dd className="text-ink">{L.sizeT ? tf(L.sizeT.key, L.sizeT.params) : t(L.size)}</dd>
            <dt className="text-dim">{t("Latency")}</dt>
            <dd className="text-ink">{L.latencyT ? tf(L.latencyT.key, L.latencyT.params) : t(L.latency)}</dd>
            <dt className="text-dim">{t("Cost")}</dt>
            <dd className="text-ink">
              <div className="mb-1 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className="h-2 w-6 rounded-full transition-colors" style={{ background: n <= L.costDots ? L.color : "#223052" }} />
                ))}
              </div>
              <span className="text-mute">{t(L.cost)}</span>
            </dd>
            <dt className="text-dim">{t("Technology")}</dt>
            <dd className="text-ink">{t(L.tech)}</dd>
            <dt className="text-dim">{t("Managed by")}</dt>
            <dd className="text-ink">{t(L.managedBy)}</dd>
          </dl>
          <div className="rounded-xl border border-line bg-bg/50 p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("If one cycle (~0.33 ns) were one second…")}</div>
            <div className="mt-1 font-mono text-2xl font-bold transition-colors" style={{ color: L.color }}>
              {L.id === "disk" ? t("≈ 3.5 days (SSD) · ≈ 1 year (HDD)") : humanTime(L.cycles, tf)}
            </div>
            <div className="mt-1 text-xs text-dim">{t("…a trip to this level would take this long.")}</div>
          </div>
          {mode === "measured" && (
            <p className="text-xs leading-relaxed text-dim">
              {t("Measured on a")} <span className="text-mute">{MACHINE.cpu}</span>{" "}
              {tf("({date}): caches detected via the OS, latencies from the pointer-chase benchmark in the folder", { date: MACHINE.date })}{" "}
              <span className="font-mono text-mute">cpu-cache-lab</span> {t("of this repo.")}
            </p>
          )}
        </Panel>
      </div>

      <Panel title={t("Same data, log scale")} bodyClassName="p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-widest text-dim">
                <th className="px-4 py-2.5 text-start font-semibold">{t("Level")}</th>
                <th className="px-4 py-2.5 text-start font-semibold">{t("Capacity (log)")}</th>
                <th className="px-4 py-2.5 text-start font-semibold">{t("Latency in cycles (log)")}</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((lv, i) => (
                <tr key={lv.id} onClick={() => setSel(i)} className={cn("cursor-pointer border-b border-line/50 transition-colors hover:bg-white/5", i === sel && "bg-white/[0.06]")}>
                  <td className="px-4 py-2.5 font-semibold" style={{ color: lv.color }}>{lv.short}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(Math.log10(lv.bytes) / 13) * 100}%`, background: lv.color }} />
                      </div>
                      <span className="w-16 text-end font-mono text-xs text-mute">{fmtBytes(lv.bytes)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(3, (Math.log10(lv.cycles) / 5.6) * 100)}%`, background: lv.color }} />
                      </div>
                      <span className="w-20 text-end font-mono text-xs text-mute">{lv.cycles >= 1000 ? `${(lv.cycles / 1000).toFixed(0)}k+` : `~${lv.cycles}`}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
