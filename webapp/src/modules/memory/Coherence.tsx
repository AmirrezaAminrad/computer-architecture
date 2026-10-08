import { useEffect, useRef, useState } from "react";
import { Button, Callout, Panel, Segmented, Stat, Tag } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { COHERENCE, FALSE_SHARING } from "../../lib/lab-data";
import { cn } from "../../utils/cn";

type St = "M" | "E" | "S" | "I";
type Protocol = "MSI" | "MESI";
type CoreId = 0 | 1;

const ST_COLOR: Record<St, string> = { M: "#fb7185", E: "#a78bfa", S: "#34d399", I: "#4a5886" };
const ST_NAME: Record<St, string> = { M: "Modified", E: "Exclusive", S: "Shared", I: "Invalid" };

interface LogEntry {
  core: string;
  kind: "hit" | "bus" | "silent" | "wb";
  txn: string | null;
  /** tf template for the entry text; {params} are substituted at render time */
  key: string;
  params: Record<string, string | number>;
}

interface Sim {
  st: [St, St];
  x: number; // memory value of the shared line
  bus: number; // bus transactions so far
  log: LogEntry[];
}

const EMPTY: Sim = { st: ["I", "I"], x: 0, bus: 0, log: [] };

/** One coherent bus transaction against a single shared line, 2 cores. */
function apply(sim: Sim, protocol: Protocol, core: CoreId, kind: "read" | "write"): Sim {
  const name = core === 0 ? "A" : "B";
  const other: CoreId = core === 0 ? 1 : 0;
  const oName = other === 0 ? "A" : "B";
  const me = sim.st[core];
  const oSt = sim.st[other];
  const st: [St, St] = [sim.st[0], sim.st[1]];
  let bus = sim.bus;
  let x = sim.x;
  const log: LogEntry[] = [];

  if (kind === "read") {
    if (me !== "I") {
      log.push({ core: name, kind: "hit", txn: null, key: "read hit — already holds v{x}", params: { x } });
    } else {
      bus += 1;
      let key: string;
      let wb = false;
      if (oSt === "M") {
        st[other] = "S";
        wb = true;
        key = "read miss → BusRd; {o} was M: writes back, M→S; {name}→{st}";
      } else if (oSt === "E") {
        st[other] = "S";
        key = "read miss → BusRd; {o} was E: E→S (no writeback); {name}→{st}";
      } else if (oSt === "S") {
        key = "read miss → BusRd; {o} keeps S; {name}→{st}";
      } else {
        key = "read miss → BusRd; cold miss, served by memory; {name}→{st}";
      }
      st[core] = protocol === "MESI" && oSt === "I" ? "E" : "S";
      log.push({ core: name, kind: wb ? "wb" : "bus", txn: "BusRd", key, params: { o: oName, name, st: st[core] } });
    }
  } else {
    if (me === "M") {
      x += 1;
      log.push({ core: name, kind: "silent", txn: null, key: "write hit (M) — local update to v{x}, no bus traffic", params: { x } });
    } else if (me === "E") {
      x += 1;
      st[core] = "M";
      log.push({ core: name, kind: "silent", txn: null, key: "write hit (E) — silent E→M, no bus traffic. v{x}", params: { x } });
    } else {
      bus += 1;
      const upgrade = me === "S";
      let key: string;
      if (oSt === "M") {
        key = "write miss → {txn}; {o} writes back, {o} invalidated; {name}→M, v{x}";
      } else if (oSt !== "I") {
        st[other] = "I";
        key = "write miss → {txn}; {o} invalidated; {name}→M, v{x}";
      } else {
        key = "write miss → {txn}; cold miss, served by memory; {name}→M, v{x}";
      }
      x += 1;
      st[core] = "M";
      const txn = upgrade ? "BusUpgr" : "BusRdX";
      log.push({ core: name, kind: "bus", txn, key, params: { txn, o: oName, name, x } });
    }
  }
  return { st, x, bus, log: [...log, ...sim.log].slice(0, 40) };
}

const SCRIPT: { core: CoreId; kind: "read" | "write" }[] = [
  { core: 0, kind: "read" },
  { core: 0, kind: "write" },
  { core: 1, kind: "read" },
  { core: 1, kind: "write" },
];

function CoreCard({ id, st, protocol, value }: { id: string; st: St; protocol: Protocol; value: number | null }) {
  const { t, ts, tf } = useLang();
  const c = ST_COLOR[st];
  const hidden = st === "I";
  return (
    <div className="rounded-xl border border-line bg-bg/50 p-3.5" style={{ borderColor: st === "I" ? undefined : c + "66" }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink">{tf("Core {c}", { c: id })}</span>
        <span
          className="rounded-md px-2 py-0.5 font-mono text-xs font-bold"
          style={{ color: c, background: c + "22", border: `1px solid ${c}55` }}
          title={ts(ST_NAME[st])}
        >
          {st}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-dim">{t(ST_NAME[st])}</div>
      <div className="mt-2.5 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-center font-mono text-sm">
        {hidden ? <span className="text-dim">{t("— no copy —")}</span> : <span style={{ color: c }}>{tf("line X = v{v}", { v: value ?? 0 })}</span>}
      </div>
      <div className="mt-2 text-[10px] leading-snug text-dim">
        {st === "M"
          ? t("dirty — only copy, must write back")
          : st === "E"
            ? t("clean, sole owner (MESI: can write silently)")
            : st === "S"
              ? t("clean, read-only copy")
              : t("must fetch before touching the line")}
      </div>
      {protocol === "MSI" && st === "S" ? <div className="mt-1 text-[10px] text-amber-300/80">{t("MSI: writing from S costs a BusUpgr")}</div> : null}
    </div>
  );
}

function ProtocolToy() {
  const { t, tf } = useLang();
  const [protocol, setProtocol] = useState<Protocol>("MESI");
  const [sim, setSim] = useState<Sim>(EMPTY);
  const [results, setResults] = useState<Partial<Record<Protocol, number>>>({});
  const [running, setRunning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setRunning(false);
    setSim(EMPTY);
  };

  useEffect(() => reset, []); // eslint-disable-line react-hooks/exhaustive-deps

  const op = (core: CoreId, kind: "read" | "write") => setSim((s) => apply(s, protocol, core, kind));

  const runScript = () => {
    if (running) {
      if (timer.current) clearTimeout(timer.current);
      setRunning(false);
      return;
    }
    setRunning(true);
    setSim(EMPTY);
    const startBus = 0;
    SCRIPT.forEach((step, i) => {
      timer.current = setTimeout(() => {
        setSim((s) => {
          const next = apply(s, protocol, step.core, step.kind);
          if (i === SCRIPT.length - 1) {
            setResults((r) => ({ ...r, [protocol]: next.bus - startBus }));
            setRunning(false);
          }
          return next;
        });
      }, 750 * (i + 1));
    });
  };

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-mute">
        {t("Two cores cache the same line")} <span className="font-mono text-ink">X</span>
        {t(". Each write must make the other core's copy invalid — that's what a cache")} <b className="text-ink">{t("coherence protocol")}</b>
        {t(" (MSI / MESI) does, one bus transaction at a time. Read and write from each core, or run the scripted single-writer handoff under both protocols and compare the bus counters.")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={protocol}
          onChange={(p) => {
            reset();
            setProtocol(p);
          }}
          color="#a78bfa"
          options={[
            { value: "MSI", label: "MSI" },
            { value: "MESI", label: "MESI" },
          ]}
        />
        <div className="flex items-center gap-2">
          {(["A", "B"] as const).map((c, i) => (
            <span key={c} className="flex overflow-hidden rounded-lg border border-line">
              <Button className="rounded-none border-0" onClick={() => op(i as CoreId, "read")} title={tf("Core {c} reads X", { c })}>
                {tf("{c} reads", { c })}
              </Button>
              <Button className="rounded-none border-0 border-s border-s-line" color="#fb7185" variant="primary" onClick={() => op(i as CoreId, "write")} title={tf("Core {c} writes X", { c })}>
                {tf("{c} writes", { c })}
              </Button>
            </span>
          ))}
        </div>
        <Button variant="primary" color="#a78bfa" onClick={runScript} active={running}>
          {running ? t("‖ Stop") : t("▶ Run handoff script")}
        </Button>
        <Button onClick={reset}>{t("↺ Reset")}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CoreCard id="A" st={sim.st[0]} protocol={protocol} value={sim.x} />
            <CoreCard id="B" st={sim.st[1]} protocol={protocol} value={sim.x} />
          </div>
          {/* the shared bus */}
          <div className="relative rounded-lg border border-line bg-bg/60 px-3 py-2">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-dim">
              <span>{t("Core A")}</span>
              <span className="text-mute">{t("coherent bus")}</span>
              <span>{t("Core B")}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <div className="h-1 flex-1 rounded bg-gradient-to-r from-cpu/40 to-pipe/40" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-dim">{t("memory X =")}</span>
              <span className="font-mono font-bold text-ink">v{sim.x}</span>
              <span className="ms-auto text-dim">{t("bus transactions:")}</span>
              <span className="font-mono font-bold text-cpu">{sim.bus}</span>
            </div>
          </div>
          {results.MSI !== undefined && results.MESI !== undefined && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label={t("Handoff · MSI")} value={tf("{n} bus txns", { n: results.MSI })} color="#fb7185" />
              <Stat label={t("Handoff · MESI")} value={tf("{n} bus txns", { n: results.MESI })} color="#34d399" sub={t("E lets the sole reader write silently")} />
            </div>
          )}
        </div>
        <div className="rounded-xl border border-line bg-bg/40 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Bus log (newest first)")}</div>
          <div className="max-h-[300px] space-y-1.5 overflow-y-auto font-mono text-[11px] leading-snug">
            {sim.log.length === 0 && <div className="text-dim">{t("— nothing yet —")}</div>}
            {sim.log.map((e, i) => (
              <div key={i} className="flex gap-1.5">
                <span className={cn("font-bold", e.core === "A" ? "text-cpu" : "text-pipe")}>{e.core}</span>
                {e.txn ? <span className="shrink-0 font-bold" style={{ color: e.kind === "wb" ? "#fbbf24" : "#a78bfa" }}>[{e.txn}]</span> : null}
                <span className={cn(e.kind === "hit" || e.kind === "silent" ? "text-dim" : "text-mute")}>{tf(e.key, e.params)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-bg/40 p-3.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-dim">
          {t("What the lab's simulator measured — same rules, 4 cores × 200 iterations")}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["MSI", "MESI"] as const).map((p) => {
            const adj = COHERENCE.find((r) => r.protocol === p && r.workload === "adjacent_counters")!;
            const pad = COHERENCE.find((r) => r.protocol === p && r.workload === "padded_counters")!;
            return (
              <div key={p} className="rounded-lg border border-line bg-raised px-3 py-2.5 text-xs">
                <Tag color="#a78bfa">{p}</Tag>
                <div className="mt-1.5 space-y-1 font-mono text-mute">
                  <div>
                    {t("adjacent counters:")} <b className="text-bad">{adj.busTransactions}</b> {tf("bus txns, {m} invalidations", { m: adj.invalidations })}
                  </div>
                  <div>
                    {t("padded counters:")}&nbsp;&nbsp; <b className="text-good">{pad.busTransactions}</b> {tf("bus txns, {m} invalidations", { m: pad.invalidations })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-dim">
          {t("Same eight stores: padding each counter onto its own cache line removes ~1590 of 1600 bus transactions. Source:")}{" "}
          <span className="font-mono">cpu-cache-lab/results/coherence.csv</span> (<span className="font-mono">simulator/coherence.py</span>).
        </p>
      </div>
    </div>
  );
}

/* ───────────── False sharing ───────────── */

interface FsStep {
  core: CoreId;
  owner: CoreId; // who holds the (shared adjacent) line in M after this step
  invalidated: boolean;
}

function FalseSharing() {
  const { t, tf } = useLang();
  const [layout, setLayout] = useState<"adjacent" | "padded">("adjacent");
  const STEPS = 12;
  const script: FsStep[] = Array.from({ length: STEPS }, (_, i) => ({
    core: (i % 2) as CoreId,
    owner: (i % 2) as CoreId,
    invalidated: layout === "adjacent" && i > 0,
  }));
  const [p, setP] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setP(0);
    setPlaying(false);
  }, [layout]);

  useEffect(() => {
    if (!playing) return;
    if (p >= STEPS) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setP((x) => x + 1), 700);
    return () => clearTimeout(timer);
  }, [playing, p]);

  const done = script.slice(0, p);
  const transfers = layout === "adjacent" ? Math.max(0, p - (p > 0 ? 1 : 0)) : 0;
  const cur = done.length ? done[done.length - 1] : null;
  const ownerOfShared = layout === "adjacent" ? (cur ? cur.owner : null) : null;

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-mute">
        {t("Two threads, each incrementing")} <em>{t("its own")}</em>
        {t(" counter — logically zero sharing. But both counters are 8 bytes, and a 64-byte cache line holds them both. The cache knows nothing about variables: coherence works on")}{" "}
        <b className="text-ink">{t("lines")}</b>
        {t(". Flip the layout and press play.")}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={layout}
          onChange={setLayout}
          color="#fb7185"
          options={[
            { value: "adjacent", label: t("Adjacent (one line)") },
            { value: "padded", label: t("Padded to 64 B") },
          ]}
        />
        <Button variant="primary" color="#fb7185" onClick={() => setPlaying((v) => !v)} active={playing}>
          {playing ? t("‖ Pause") : p >= STEPS ? t("Done") : t("▶ Play")}
        </Button>
        <Button onClick={() => { setP(0); setPlaying(false); }}>{t("↺ Reset")}</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((name, i) => {
          const ci = i as CoreId;
          const ownsShared = ownerOfShared === ci;
          const paddedM = layout === "padded" && done.some((s) => s.core === ci);
          return (
            <div
              key={name}
              className={cn(
                "rounded-xl border bg-bg/50 p-3.5 transition-all duration-300",
                ownsShared || paddedM ? "border-rose-400/60 shadow-[0_0_18px_rgba(251,113,133,0.15)]" : "border-line",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink">{tf("Core {c}", { c: name })}</span>
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-xs font-bold"
                  style={{
                    color: ownsShared || paddedM ? "#fb7185" : "#4a5886",
                    background: ownsShared || paddedM ? "#fb718522" : "#4a588622",
                  }}
                >
                  {layout === "adjacent" ? (ownsShared ? "M" : "I") : paddedM ? "M" : "I"}
                </span>
              </div>
              {/* the counters */}
              <div className="mt-2.5 space-y-1.5">
                {layout === "adjacent" ? (
                  <div className="rounded-lg border border-dashed border-rose-400/40 bg-raised px-2.5 py-2 text-center font-mono text-xs text-mute">
                    {tf("one 64 B line: [ counter {a} = {na} · counter {b} = … ]", {
                      a: name,
                      na: done.filter((s) => s.core === ci).length,
                      b: name === "A" ? "B" : "A",
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-line bg-raised px-2.5 py-2 text-center font-mono text-xs text-mute">
                    {tf("own line: [ counter {c} = {n} ]", { c: name, n: done.filter((s) => s.core === ci).length })}{" "}
                    <span className="text-dim">{t("· 56 B pad")}</span>
                  </div>
                )}
              </div>
              {ownsShared && (
                <div className="mt-2 animate-pulse text-[11px] font-semibold text-rose-300">{t("← the line lives here right now")}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("Line transfers")} value={transfers} color={transfers ? "#fb7185" : "#34d399"} sub={layout === "adjacent" ? t("line ping-pongs A↔B") : t("each core keeps its own")} />
        <Stat label={t("Invalidations")} value={layout === "adjacent" ? transfers : 0} color={transfers ? "#fb7185" : "#34d399"} sub={tf("after {p} of {n} increments", { p, n: STEPS })} />
        <Stat label={t("Measured: adjacent")} value={`${(FALSE_SHARING.adjacentMps / 1e6).toFixed(0)} M/s`} color="#fb7185" sub={t("12 threads × 5M increments")} />
        <Stat label={t("Measured: padded")} value={`${(FALSE_SHARING.paddedMps / 1e6).toFixed(0)} M/s`} color="#34d399" sub={tf("{n}× more increments/s", { n: FALSE_SHARING.slowdown })} />
      </div>

      <div className="rounded-xl border border-line bg-bg/40 p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-mute">
          <span className="uppercase tracking-widest text-dim">{t("Real-machine result")}</span>
          <span className="rounded-md bg-amber-300/15 px-2 py-0.5 font-mono font-bold text-amber-300">{FALSE_SHARING.slowdown}×</span>
        </div>
        {[
          { label: "adjacent counters", v: FALSE_SHARING.adjacentMps, c: "#fb7185" },
          { label: "padded to own lines", v: FALSE_SHARING.paddedMps, c: "#34d399" },
        ].map((b) => (
          <div key={b.label} className="mb-2 flex items-center gap-3">
            <span className="w-40 shrink-0 text-xs text-mute">{t(b.label)}</span>
            <div className="h-5 flex-1 overflow-hidden rounded-md border border-line bg-bg/60">
              <div className="h-full rounded-md transition-all duration-700" style={{ width: `${(b.v / FALSE_SHARING.paddedMps) * 100}%`, background: b.c + "aa" }} />
            </div>
            <span className="w-24 shrink-0 text-end font-mono text-xs" style={{ color: b.c }}>
              {(b.v / 1e6).toFixed(0)} M/s
            </span>
          </div>
        ))}
        <p className="mt-1 text-xs leading-relaxed text-dim">
          {t("Measured on the lab machine with")} <span className="font-mono">benchmarks/false_sharing.cpp</span>{" "}
          {tf("— a {n}× slowdown from nothing but cache-line geometry. See", { n: FALSE_SHARING.slowdown })}{" "}
          <span className="font-mono">cpu-cache-lab/docs/coherence.md</span>.
        </p>
      </div>
    </div>
  );
}

export function Coherence() {
  const { t, ts } = useLang();
  const [tab, setTab] = useState<"protocol" | "falsesharing">("protocol");
  return (
    <Panel
      title={t("Coherence lab")}
      right={
        <Segmented
          value={tab}
          onChange={setTab}
          color="#a78bfa"
          options={[
            { value: "protocol", label: t("MSI / MESI state machine") },
            { value: "falsesharing", label: t("False sharing") },
          ]}
        />
      }
    >
      {tab === "protocol" ? <ProtocolToy /> : <FalseSharing />}
      <div className="mt-4">
        <Callout title={ts("Where this fits the textbook")} tone="idea">
          {t(
            "Mano Ch. 13 stops at “semaphores for mutual exclusion”. Real multiprocessors keep cores coherent with invalidation protocols like the ones above — the lab's",
          )}{" "}
          <span className="font-mono text-ink">simulator/coherence.py</span> {t("implements MSI and MESI with machine-checked invariants, and")}{" "}
          <span className="font-mono text-ink">benchmarks/false_sharing.cpp</span> {t("measures the cost on real silicon.")}
        </Callout>
      </div>
    </Panel>
  );
}
