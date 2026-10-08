import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button, Callout, Panel, Segmented, Stat, Tag, hex } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { TLB_STAIRCASE } from "../../lib/lab-data";
import { cn } from "../../utils/cn";

/*
 * Tiny virtual memory system, sized to be watchable:
 *   VA 8 bits = 3-bit VPN + 5-bit offset   → 8 virtual pages of 32 B
 *   PA 9 bits = 4-bit PFN + 5-bit offset   → 16 frames of 32 B
 *   TLB: 4-entry, fully associative, LRU
 *   Page table: 8 entries, some unmapped → page faults, auto-mapped by the "OS"
 */

const VPN_BITS = 3;
const OFF_BITS = 5;
const PFN_BITS = 4;
const PAGES = 1 << VPN_BITS;
const PAGE_SIZE = 1 << OFF_BITS;
const TLB_WAYS = 4;
const VA_BITS = VPN_BITS + OFF_BITS;

const VPN_C = "#a78bfa";
const OFF_C = "#38bdf8";
const GOOD = "#34d399";
const BAD = "#fb7185";
const WARN = "#fbbf24";

interface TlbEntry {
  vpn: number;
  pfn: number;
  last: number;
}

type PtEntry = {
  pfn: number;
  last: number;
} | null;

interface Stats {
  accesses: number;
  tlbHits: number;
  faults: number;
  evictions: number;
}

interface StepResult {
  va: number;
  vpn: number;
  off: number;
  pfn: number;
  tlbHit: boolean;
  fault: boolean;
  evictedVpn: number | null;
}

type LogLine = { key: string; params: Record<string, string | number> };

interface VmState {
  tlb: TlbEntry[];
  pt: PtEntry[];
  freeFrames: number[];
  stats: Stats;
  last: StepResult | null;
  log: LogLine[];
}

// every access pattern starts from a fresh address space: pages 0–3 mapped, 4–7 not
function freshState(): VmState {
  const now = 0;
  return {
    tlb: [],
    pt: [
      { pfn: 5, last: now },
      { pfn: 2, last: now },
      { pfn: 7, last: now },
      { pfn: 0, last: now },
      null,
      { pfn: 3, last: now },
      null,
      { pfn: 6, last: now },
    ],
    freeFrames: [1, 4, 8, 9, 10, 11, 12, 13, 14, 15],
    stats: { accesses: 0, tlbHits: 0, faults: 0, evictions: 0 },
    last: null,
    log: [],
  };
}

function access(st: VmState, va: number): VmState {
  const vpn = (va >> OFF_BITS) & (PAGES - 1);
  const off = va & (PAGE_SIZE - 1);
  const t = st.stats.accesses + 1;
  const tlb = st.tlb.map((e) => ({ ...e }));
  const pt = st.pt.map((e) => (e ? { ...e } : null));
  const stats = { ...st.stats, accesses: t };
  const log: LogLine[] = [...st.log];
  const vaHex = hex(va);
  let pfn: number;
  let tlbHit = false;
  let fault = false;
  let evictedVpn: number | null = null;

  const idx = tlb.findIndex((e) => e.vpn === vpn);
  if (idx >= 0) {
    tlbHit = true;
    stats.tlbHits += 1;
    pfn = tlb[idx].pfn;
    tlb[idx].last = t;
    pt[vpn]!.last = t;
    log.unshift({ key: "0x{va} → TLB hit (vpn {vpn} → frame {pfn})", params: { va: vaHex, vpn, pfn } });
  } else {
    const entry = pt[vpn];
    if (!entry) {
      // page fault: the OS maps the page into a free frame, evicting if necessary
      fault = true;
      stats.faults += 1;
      let p = st.freeFrames[0];
      if (p === undefined) {
        const victimIdx = pt.reduce((best, e, i) => (e && e.last < (pt[best] as PtEntry)!.last ? i : best), 0);
        const victim = pt[victimIdx]!;
        p = victim.pfn;
        pt[victimIdx] = null;
        evictedVpn = victimIdx;
        tlb.filter((e) => e.vpn !== victimIdx);
        for (let i = tlb.length - 1; i >= 0; i--) if (tlb[i].vpn === victimIdx) tlb.splice(i, 1);
        stats.evictions += 1;
        log.unshift({ key: "0x{va} → PAGE FAULT: no free frame, evicted page {vpn} (frame {pfn})", params: { va: vaHex, vpn: victimIdx, pfn: p } });
      } else {
        st.freeFrames = st.freeFrames.slice(1);
        log.unshift({ key: "0x{va} → PAGE FAULT: mapped page {vpn} into free frame {pfn}", params: { va: vaHex, vpn, pfn: p } });
      }
      pt[vpn] = { pfn: p, last: t };
      pfn = p;
    } else {
      pfn = entry.pfn;
      entry.last = t;
      log.unshift({ key: "0x{va} → TLB miss → page-table walk (vpn {vpn} → frame {pfn})", params: { va: vaHex, vpn, pfn } });
    }
    // refill TLB (LRU eviction)
    if (tlb.length >= TLB_WAYS) {
      let lru = 0;
      tlb.forEach((e, i) => {
        if (e.last < tlb[lru].last) lru = i;
      });
      tlb.splice(lru, 1);
    }
    tlb.push({ vpn, pfn, last: t });
  }

  return {
    tlb,
    pt,
    freeFrames: fault && st.freeFrames.length ? st.freeFrames.slice(1) : st.freeFrames,
    stats,
    last: { va, vpn, off, pfn, tlbHit, fault, evictedVpn },
    log: log.slice(0, 8),
  };
}

const PRESETS: { id: string; name: string; blurb: string; gen: () => number[] }[] = [
  {
    id: "loop",
    name: "Loop in 2 pages",
    blurb: "Alternate between pages 0 and 1. After two walks the TLB holds both translations — everything hits.",
    gen: () => Array.from({ length: 14 }, (_, i) => (i % 2) * PAGE_SIZE + (i % 5)),
  },
  {
    id: "walk",
    name: "Touch all 8 pages",
    blurb: "More distinct pages than TLB slots: LRU thrash becomes visible, and pages 4 and 6 are unmapped at first.",
    gen: () => Array.from({ length: 16 }, (_, i) => (i % PAGES) * PAGE_SIZE + (i % 3)),
  },
  {
    id: "random",
    name: "Random",
    blurb: "No locality at all — expect TLB misses and a few page faults mapping the unmapped pages.",
    gen: () => Array.from({ length: 16 }, () => Math.floor(Math.random() * (1 << VA_BITS))),
  },
];

function BitField({ label, parts }: { label: ReactNode; parts: { bits: string; color: string; name: string; val: number }[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-dim">{label}</div>
      <div className="flex gap-1.5">
        {parts.map((p, i) => (
          <div key={i} className="text-center">
            <div className="rounded-md border px-1.5 py-1 font-mono text-sm font-bold tracking-[0.15em]" style={{ color: p.color, borderColor: p.color + "66", background: p.color + "18" }}>
              {p.bits || "—"}
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ color: p.color }}>
              {p.name} = {p.val}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VirtualMemory() {
  const { t, ts, tf } = useLang();
  const [st, setSt] = useState<VmState>(freshState);
  const [presetId, setPresetId] = useState<string | null>("loop");
  const [queue, setQueue] = useState<number[]>(() => PRESETS[0].gen());
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [manual, setManual] = useState("");

  const reset = () => {
    setSt(freshState());
    setPos(0);
    setPlaying(false);
  };

  const loadPreset = (id: string) => {
    const pr = PRESETS.find((p) => p.id === id)!;
    setPresetId(id);
    setQueue(pr.gen());
    reset();
  };

  const step = (va: number) => setSt((s) => access(s, va));

  useEffect(() => {
    if (!playing) return;
    if (pos >= queue.length) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      step(queue[pos]);
      setPos((p) => p + 1);
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, pos, queue]);

  const submitManual = () => {
    const m = manual.trim();
    if (!m) return;
    const n = /^0x[0-9a-f]+$/i.test(m) ? parseInt(m, 16) : /^\d+$/.test(m) ? parseInt(m, 10) : NaN;
    if (Number.isNaN(n) || n > (1 << VA_BITS) - 1) return;
    setPresetId(null);
    step(n & ((1 << VA_BITS) - 1));
    setManual("");
  };

  const L = st.last;
  const rate = st.stats.accesses ? st.stats.tlbHits / st.stats.accesses : 0;

  // measured TLB staircase mini-chart (log pages)
  const chart = useMemo(() => {
    const W = 300;
    const H = 120;
    const xs = TLB_STAIRCASE.map((d) => Math.log2(d.pages));
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y1 = 1;
    const y0v = 15;
    const x = (p: number) => 28 + ((Math.log2(p) - x0) / (x1 - x0)) * (W - 40);
    const y = (ns: number) => H - 22 - ((Math.log2(ns) - Math.log2(y1)) / (Math.log2(y0v) - Math.log2(y1))) * (H - 34);
    const path = TLB_STAIRCASE.map((d, i) => `${i ? "L" : "M"}${x(d.pages).toFixed(1)} ${y(d.ns).toFixed(1)}`).join(" ");
    return { W, H, x, y, path };
  }, []);

  return (
    <Panel title={t("Virtual memory & TLB — one load, translated")}>
      <p className="mb-4 max-w-3xl text-sm leading-relaxed text-mute">
        {t("The CPU never sees a physical address. Every load goes through a two-step lookup: a tiny, fast, fully-associative")}{" "}
        <b className="text-ink">TLB</b> {t("(hardware) caches recent translations of the")} <b className="text-ink">{t("page table")}</b>{" "}
        {t("(owned by the OS). Miss the TLB and you walk the table; the page isn't even mapped and you trap to the OS — a")}{" "}
        <b className="text-ink">{t("page fault")}</b> {t("— which maps it in, evicting another page if memory is full.")}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          value={presetId ?? ""}
          onChange={loadPreset}
          color="#fbbf24"
          options={PRESETS.map((p) => ({ value: p.id, label: t(p.name), title: ts(p.blurb) }))}
        />
        <Button onClick={reset}>{t("↺ Reset")}</Button>
        <div className="flex items-center gap-1.5">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitManual()}
            placeholder="0x.."
            className="w-16 rounded-lg border border-line bg-bg/60 px-2 py-1.5 text-center font-mono text-xs text-ink outline-none focus:border-dim"
            aria-label={ts("Virtual address in hex")}
          />
          <Button onClick={submitManual} title={ts("Translate one address")}>
            {t("Translate")}
          </Button>
        </div>
        <Button variant="primary" color="#fbbf24" onClick={() => setPlaying((v) => !v)} active={playing}>
          {playing ? t("‖ Pause") : pos >= queue.length ? t("Done") : t("▶ Play")}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          {/* translation flow */}
          <div className="rounded-xl border border-line bg-bg/40 p-3.5">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <BitField
                label={t("Virtual address")}
                parts={[
                  { bits: L ? L.vpn.toString(2).padStart(VPN_BITS, "0") : "", color: VPN_C, name: "vpn", val: L?.vpn ?? 0 },
                  { bits: L ? L.off.toString(2).padStart(OFF_BITS, "0") : "", color: OFF_C, name: "offset", val: L?.off ?? 0 },
                ]}
              />
              <span className="text-lg text-dim">→</span>
              <BitField
                label={t("Physical address")}
                parts={[
                  { bits: L ? L.pfn.toString(2).padStart(PFN_BITS, "0") : "", color: L ? (L.fault ? BAD : GOOD) : "#4a5886", name: "pfn", val: L?.pfn ?? 0 },
                  { bits: L ? L.off.toString(2).padStart(OFF_BITS, "0") : "", color: OFF_C, name: "offset", val: L?.off ?? 0 },
                ]}
              />
            </div>
            {L && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Tag color={L.fault ? BAD : L.tlbHit ? GOOD : WARN}>
                  {L.fault ? t("PAGE FAULT → OS maps it") : L.tlbHit ? t("TLB hit — 1 cycle-ish") : t("TLB miss → page-table walk")}
                </Tag>
                <span className="font-mono text-xs text-mute">
                  va 0x{hex(L.va)} (page {L.vpn}, byte {L.off}) → pa 0x{hex(L.pfn << OFF_BITS | L.off, 3)}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t("Accesses")} value={st.stats.accesses} />
            <Stat label={t("TLB hit rate")} value={`${(rate * 100).toFixed(0)}%`} color={rate > 0.7 ? GOOD : WARN} sub={t("4 TLB entries · LRU")} />
            <Stat label={t("Page faults")} value={st.stats.faults} color={st.stats.faults ? BAD : undefined} sub={t("OS mapped the page")} />
            <Stat label={t("Pages evicted")} value={st.stats.evictions} color={st.stats.evictions ? WARN : undefined} sub={t("no free frame left")} />
          </div>

          <div className="rounded-xl border border-line bg-bg/40 p-3 font-mono text-[11px] leading-relaxed">
            {st.log.length === 0 && <div className="text-dim font-sans">{t("— translate something —")}</div>}
            {st.log.map((l, i) => (
              <div key={i} className={cn(i === 0 ? "text-ink" : "text-dim")}>
                {tf(l.key, l.params)}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* TLB */}
          <div className="rounded-xl border border-line bg-bg/40 p-3.5">
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-dim">
              <span>{t("TLB — 4 entries, fully associative")}</span>
              <span className="text-mute">{t("hardware")}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: TLB_WAYS }).map((_, i) => {
                const e = st.tlb[i];
                const active = L && e && e.vpn === L.vpn;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border px-1.5 py-2 text-center font-mono text-xs transition-all duration-300",
                      active ? "border-good/70 bg-good/15 text-good" : e ? "border-line bg-raised text-mute" : "border-dashed border-line text-dim/50",
                    )}
                  >
                    {e ? (
                      <>
                        <div className="text-[10px] text-dim">vpn</div>
                        <div className="font-bold">{e.vpn}</div>
                        <div className="text-[10px] text-dim">{tf("→ frame {n}", { n: e.pfn })}</div>
                      </>
                    ) : (
                      t("empty")
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* page table */}
          <div className="rounded-xl border border-line bg-bg/40 p-3.5">
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-dim">
              <span>{t("Page table — 8 pages")}</span>
              <span className="text-mute">{t("OS-owned")}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {st.pt.map((e, vpn) => {
                const justFaulted = L?.fault && L.vpn === vpn;
                return (
                  <div
                    key={vpn}
                    className={cn(
                      "rounded-lg border px-1.5 py-1.5 text-center font-mono text-xs transition-all duration-300",
                      justFaulted ? "border-bad/70 bg-bad/15 text-bad" : e ? "border-line bg-raised text-mute" : "border-dashed border-line/70 text-dim/50",
                    )}
                  >
                    <div className="text-[10px] text-dim">{tf("page {n}", { n: vpn })}</div>
                    <div className="font-bold">{e ? `f${e.pfn}` : t("unmapped")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* measured TLB staircase */}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-xl border border-line bg-bg/40 p-3.5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Measured: what a TLB miss costs")}</div>
          <svg viewBox={`0 0 ${chart.W} ${chart.H}`} className="w-full" role="img" aria-label={ts("Measured hop latency versus pages touched")} style={{ direction: "ltr" }}>
            <path d={chart.path} fill="none" stroke="#fbbf24" strokeWidth={2} strokeLinejoin="round" />
            {[
              { p: 45, ns: 1.14, label: "TLB-resident 1.1 ns", left: true },
              { p: 362, ns: 2.7, label: "beyond TLB ~2.7 ns" },
              { p: 8192, ns: 12.3, label: "walk + DRAM ~12 ns" },
            ].map((a) => {
              const ax = chart.x(a.p);
              const end = "left" in a || ax > chart.W * 0.6;
              return (
                <g key={a.label}>
                  <circle cx={ax} cy={chart.y(a.ns)} r={3.5} fill={WARN} />
                  <text x={end ? ax + 6 : ax + 5} y={chart.y(a.ns) - 8} fontSize={8.5} fill="#c7d0ee" textAnchor={end ? "end" : "start"}>
                    {t(a.label)}
                  </text>
                </g>
              );
            })}
            <text x={chart.W / 2} y={chart.H - 2} fontSize={8.5} fill="#62709b" textAnchor="middle">
              {t("distinct 4 KiB pages touched (log scale: 1 → 16 k)")}
            </text>
          </svg>
        </div>
        <Callout title={ts("Real numbers from this repo")} tone="note">
          {t("The lab's")} <span className="font-mono text-ink">benchmarks/tlb.cpp</span> {t("chases pointers across")} <em>N</em>{" "}
          {t("distinct 4 KiB pages. While the working set fits the TLB, a hop costs")} <span className="font-mono text-ink">1.14 ns</span>
          {t(". Past ~90 pages it doubles (2.7 ns — second-level TLB), and past ~4 k pages the full walk + DRAM lands at")}{" "}
          <span className="font-mono text-ink">~12–14 ns</span>
          {t(": a 10× penalty for losing one translation. Details:")} <span className="font-mono text-ink">cpu-cache-lab/docs/tlb.md</span>.
        </Callout>
      </div>

      <Callout title={ts("Where this fits the textbook")} tone="idea">
        {t(
          "This is Mano §12-6 “Virtual memory” and §12-4 “Associative memory” made concrete: the TLB is exactly the associative page table from the book, and the LRU eviction above is the book's page-replacement problem — except here it runs in microseconds, not on paper.",
        )}
      </Callout>
    </Panel>
  );
}
