import { useState } from "react";
import { Button, Callout, Panel, Segmented, Tag, bin, hex } from "../../components/ui";
import { useLang } from "../../lib/i18n";
import { cn } from "../../utils/cn";

/*
 * A miniature of Mano's basic-computer common bus (Ch. 4/5): five registers
 * and a memory port share ONE internal bus; at every clock pulse exactly one
 * transfer happens — source selected by S₂S₁S₀, destination by its LD input.
 */

type RegName = "AR" | "PC" | "DR" | "IR" | "AC";
type Source = RegName | "MEM";

const REGS: RegName[] = ["AR", "PC", "DR", "IR", "AC"];
const SRC_CODE: Record<Source, string> = { AR: "001", PC: "010", DR: "011", AC: "100", IR: "101", MEM: "111" };
const REG_COLOR: Record<string, string> = { AR: "#38bdf8", PC: "#a78bfa", DR: "#34d399", IR: "#fbbf24", AC: "#fb7185", MEM: "#98a4cb" };

const MEM_SIZE = 16;

interface MicroOp {
  t: string;
  stmt: string;
  src: Source;
  dst: RegName;
  inc?: boolean; // PC ← PC + 1 (uses the incrementer, not the bus)
  note: string;
}

const FETCH_DEMO: MicroOp[] = [
  { t: "T₀", stmt: "AR ← PC", src: "PC", dst: "AR", note: "the address of the next instruction leaves the PC for the memory" },
  { t: "T₁", stmt: "DR ← M[AR]", src: "MEM", dst: "DR", note: "memory read: the instruction word arrives on the bus" },
  { t: "T₂", stmt: "IR ← DR", src: "DR", dst: "IR", note: "the opcode moves to the instruction register, where the decoder waits" },
  { t: "T₃", stmt: "PC ← PC + 1", src: "PC", dst: "PC", inc: true, note: "the incrementer advances PC — the bus was free to do nothing here" },
];

function initialMemory() {
  // a few plausible instruction/data words; M[0] will be "fetched"
  return [0x2a, 0x07, 0x11, 0xff, 0x03, 0x00, 0x42, 0x19, 0x00, 0x00, 0x0c, 0x2a, 0x05, 0x31, 0x00, 0x0f];
}

export function BusTransfer() {
  const { t, ts, tf } = useLang();
  const [regs, setRegs] = useState<Record<RegName, number>>({ AR: 0, PC: 0, DR: 0, IR: 0, AC: 0 });
  const [mem, setMem] = useState<number[]>(initialMemory);
  const [src, setSrc] = useState<Source>("PC");
  const [dst, setDst] = useState<RegName>("AR");
  const [pulse, setPulse] = useState(0); // increments each clock to retrigger animation
  const [lastStmt, setLastStmt] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState<number | null>(null);

  const valueOf = (s: Source) => (s === "MEM" ? mem[regs.AR % MEM_SIZE] : regs[s]);
  const stmt = src !== "MEM" && src === dst ? `${dst} ← ${src}` : `${dst} ← ${src === "MEM" ? `M[AR] (= ${hex(valueOf("MEM"))})` : src}`;

  const clock = (s: Source = src, d: RegName = dst, inc = false) => {
    setPulse((p) => p + 1);
    setRegs((r) => {
      const next = { ...r };
      next[d] = inc ? (r[d] + 1) & 0xff : valueOf(s);
      return next;
    });
    setLastStmt(inc ? `${d} ← ${d} + 1` : `${d} ← ${s === "MEM" ? "M[AR]" : s}`);
  };

  const runDemoStep = (i: number) => {
    const op = FETCH_DEMO[i];
    setDemoStep(i);
    clock(op.src, op.dst, op.inc);
  };

  const reset = () => {
    setRegs({ AR: 0, PC: 0, DR: 0, IR: 0, AC: 0 });
    setMem(initialMemory());
    setLastStmt(null);
    setDemoStep(null);
    setPulse(0);
  };

  // ── SVG diagram ──────────────────────────────────────────────────────────
  const W = 600;
  const rowW = 88;
  const rowH = 54;
  const gap = 10;
  const busY = 150;
  const regX = (i: number) => 8 + i * (rowW + gap);
  const memX = regX(5);
  const srcIdx = src === "MEM" ? -1 : REGS.indexOf(src as RegName);
  const srcX = src === "MEM" ? memX + rowW / 2 : regX(srcIdx) + rowW / 2;
  const dstIdx = REGS.indexOf(dst);
  const dstX = regX(dstIdx) + rowW / 2;
  const animKey = `${pulse}-${src}-${dst}`;

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm leading-relaxed text-mute">
        {t("Between the gates of module 01 and the running programs above sits the ")}<b className="text-ink">{t("register transfer level")}</b>{t(": a handful of registers, an ALU, and ")}<b className="text-ink">{t("one shared bus")}</b>{t(". Each clock pulse, control logic selects ")}<em>{t("one")}</em>{t(" source onto the bus and pulses one destination's load input. Pick a source and a destination, then clock it.")}
      </p>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Panel title={t("Datapath — one bus, one transfer per clock")}>
          <svg viewBox={`0 0 ${W} 235`} className="w-full" role="img" aria-label={ts("Registers connected by a common bus")} style={{ direction: "ltr" }}>
            {/* registers */}
            {REGS.map((r, i) => {
              const active = r === dst || r === src;
              const isSrc = r === src;
              const isDst = r === dst;
              return (
                <g key={r}>
                  <rect
                    x={regX(i)}
                    y={30}
                    width={rowW}
                    height={rowH}
                    rx={10}
                    fill={active ? REG_COLOR[r] + "22" : "rgba(13,20,39,.6)"}
                    stroke={isSrc || isDst ? REG_COLOR[r] : "#223052"}
                    strokeWidth={isSrc || isDst ? 2.5 : 1.5}
                    style={{ transition: "all .25s" }}
                  />
                  <text x={regX(i) + 10} y={48} fontSize={12} fontWeight={800} fill={REG_COLOR[r]} style={{ fontFamily: "var(--font-sans)" }}>
                    {r}
                  </text>
                  <text x={regX(i) + rowW - 10} y={48} fontSize={12} textAnchor="end" fill="#98a4cb" fontFamily="monospace">
                    {hex(regs[r])}
                  </text>
                  <text x={regX(i) + 10} y={68} fontSize={10} fill="#62709b" fontFamily="monospace">
                    {bin(regs[r])}
                  </text>
                  {/* drop to bus */}
                  <line x1={regX(i) + rowW / 2} y1={30 + rowH} x2={regX(i) + rowW / 2} y2={busY} stroke={isSrc || isDst ? REG_COLOR[r] : "#223052"} strokeWidth={isSrc || isDst ? 2.5 : 1.5} style={{ transition: "all .25s" }} />
                </g>
              );
            })}
            {/* memory box */}
            <g>
              <rect x={memX} y={30} width={rowW} height={rowH} rx={10} fill="rgba(13,20,39,.6)" stroke={src === "MEM" ? "#98a4cb" : "#223052"} strokeWidth={src === "MEM" ? 2.5 : 1.5} style={{ transition: "all .25s" }} />
              <text x={memX + rowW / 2} y={50} fontSize={12} fontWeight={800} textAnchor="middle" fill="#98a4cb" style={{ fontFamily: "var(--font-sans)" }}>
                Memory
              </text>
              <text x={memX + rowW / 2} y={68} fontSize={10} textAnchor="middle" fill="#62709b" fontFamily="monospace">
                M[{regs.AR % MEM_SIZE}] = {hex(valueOf("MEM"))}
              </text>
              <line x1={memX + rowW / 2} y1={30 + rowH} x2={memX + rowW / 2} y2={busY} stroke={src === "MEM" ? "#98a4cb" : "#223052"} strokeWidth={src === "MEM" ? 2.5 : 1.5} style={{ transition: "all .25s" }} />
              <text x={memX + rowW} y={125} fontSize={9} textAnchor="end" fill="#62709b" fontFamily="monospace">
                read: bus ← M[AR]
              </text>
            </g>
            {/* the bus */}
            <line x1={4} y1={busY} x2={W - 4} y2={busY} stroke="#2f3f6e" strokeWidth={6} strokeLinecap="round" />
            <text x={6} y={busY + 20} fontSize={11} fill="#62709b" fontWeight={700}>
              {t("common bus · S₂S₁S₀ selects the source")}
            </text>
            {/* animated transfer: only after a clock pulse */}
            {pulse > 0 && (
              <g key={animKey} className="bus-flow">
                <line x1={srcX} y1={busY} x2={dstX} y2={busY} stroke={REG_COLOR[src]} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
                <circle r={5} fill={REG_COLOR[src]}>
                  <animate attributeName="cx" from={srcX} to={dstX} dur="0.45s" fill="freeze" />
                  <animate attributeName="cy" from={busY} to={busY} dur="0.45s" fill="freeze" />
                </circle>
              </g>
            )}
            {/* destination load arrow */}
            <text x={dstX} y={busY - 10} fontSize={10} textAnchor="middle" fill={REG_COLOR[dst]} fontWeight={800} fontFamily="monospace">
              LD·{dst}
            </text>
            {/* control word strip */}
            <text x={6} y={222} fontSize={11} fill="#98a4cb" fontFamily="monospace">
              {t("control word:")} S₂S₁S₀ = {SRC_CODE[src]} · LD·{dst} = 1
              {src === "MEM" ? t(" · R (memory read) = 1") : ""}
            </text>
          </svg>
        </Panel>

        <div className="space-y-4">
          <Panel title={t("Compose a micro-operation")} bodyClassName="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Source (S₂S₁S₀)")}</div>
              <Segmented
                value={src}
                onChange={(v) => setSrc(v)}
                color="#a78bfa"
                options={([...REGS, "MEM"] as Source[]).map((s) => ({ value: s, label: `${s} (${SRC_CODE[s]})` }))}
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Destination (load input)")}</div>
              <Segmented value={dst} onChange={(v) => setDst(v)} color="#fb7185" options={REGS.map((r) => ({ value: r, label: r }))} />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" color="#a78bfa" onClick={() => clock()}>
                {t("Clock ↑")}
              </Button>
              <span className="font-mono text-sm text-ink">
                {stmt.split(" ← ")[0]} <span className="text-dim">←</span> {stmt.split(" ← ")[1]}
              </span>
            </div>
            {lastStmt && (
              <div className="rounded-lg border border-line bg-bg/50 px-3 py-2 text-xs text-mute">
                {t("last clock:")} <span className="font-mono text-ink">{lastStmt}</span> — <Tag color="#a78bfa">{tf("{n} pulses", { n: pulse })}</Tag>
              </div>
            )}
          </Panel>

          <Panel title={t("Micro-program: the fetch cycle")} right={<Button className="!px-2.5 !py-1 !text-xs" onClick={reset}>{t("↺ Reset")}</Button>} bodyClassName="space-y-2">
            {FETCH_DEMO.map((op, i) => {
              const done = demoStep !== null && demoStep >= i;
              const isCur = demoStep === i;
              return (
                <button
                  key={op.t}
                  onClick={() => runDemoStep(i)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-start transition-all duration-200",
                      isCur ? "border-cpu/60 bg-cpu/10" : done ? "border-line bg-bg/40 opacity-70" : "border-line bg-bg/40 hover:border-dim",
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] font-bold text-cpu">{op.t}</span>
                      <span className="font-mono text-sm text-ink">{op.stmt}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-dim">{t(op.note)}</div>
                  </button>
                );
              })}
              <p className="pt-1 text-[11px] leading-relaxed text-dim">
                {t("Click each timing step in order. Real hardware runs T₁'s memory read and T₂'s PC increment in the same clock — here every micro-operation gets its own pulse so you can watch the bus.")}
              </p>
          </Panel>
        </div>
      </div>

      <Callout title={ts("One bus ⇒ one transfer per clock")} tone="idea">
        {t("That constraint is the whole game of datapath design: instruction timing (above, and Mano Ch. 5) is literally a table of which micro-operations happen at T₀, T₁, T₂…. More buses or dedicated paths (like the incrementer feeding PC) buy parallelism — the same trade the pipeline module makes at scale.")}
      </Callout>
    </div>
  );
}
