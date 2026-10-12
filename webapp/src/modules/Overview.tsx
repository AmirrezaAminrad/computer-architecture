import { useEffect, useState } from "react";
import { GateShape } from "../components/gates";
import { Button, Panel, Slider, Tag } from "../components/ui";
import { MODULES, STAGES, STAGE_INFO, getModule, type ModuleId } from "../lib/theme";
import { useLang } from "../lib/i18n";
import { cn } from "../utils/cn";

type Go = (id: ModuleId) => void;

/* ───────────── hero ───────────── */

function HeroByte() {
  const { t } = useLang();
  const [v, setV] = useState(0x41);
  useEffect(() => {
    const id = window.setInterval(() => setV((x) => (x + 1 + Math.floor(Math.random() * 3)) & 0xff), 1100);
    return () => window.clearInterval(id);
  }, []);
  const bits = v.toString(2).padStart(8, "0").split("");
  return (
    <div className="inline-flex flex-col items-start gap-2 rounded-2xl border border-line bg-surface/70 p-4 backdrop-blur">
      <div className="flex gap-1">
        {bits.map((b, i) => (
          <span
            key={i}
            className={cn(
              "flex h-9 w-7 items-center justify-center rounded-md border font-mono text-base font-bold transition-all duration-500",
              b === "1" ? "border-logic bg-logic/20 text-logic" : "border-line text-dim",
            )}
          >
            {b}
          </span>
        ))}
      </div>
      <div className="font-mono text-xs text-mute">
        = <span className="text-ink">{v}</span> = <span className="text-ink">0x{v.toString(16).toUpperCase().padStart(2, "0")}</span>
        {v >= 32 && v < 127 && <> = <span className="text-ink">'{String.fromCharCode(v)}'</span></>}
        <span className="text-dim"> — {t("same bits, different meaning")}</span>
      </div>
    </div>
  );
}

/* ───────────── machine map ───────────── */

function MachineMap({ go }: { go: Go }) {
  const { t, ts } = useLang();
  const [hover, setHover] = useState<ModuleId | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((x) => x + 1), 800);
    return () => window.clearInterval(id);
  }, []);

  const dim = (id: ModuleId) => (hover && hover !== id ? 0.28 : 1);
  const region = (id: ModuleId) => ({
    onMouseEnter: () => setHover(id),
    onMouseLeave: () => setHover(null),
    onFocus: () => setHover(id),
    onBlur: () => setHover(null),
    onClick: () => go(id),
    onKeyDown: (e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && go(id),
    tabIndex: 0,
    role: "link" as const,
    style: { cursor: "pointer", opacity: dim(id), transition: "opacity .25s", outline: "none" },
  });
  const badge = (id: ModuleId, x: number, y: number) => {
    const m = getModule(id);
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={15} fill="#070b17" stroke={m.hex} strokeWidth={2} />
        <text y={4.5} textAnchor="middle" fontSize={12} fontWeight={800} fill={m.hex}>{m.num}</text>
      </g>
    );
  };
  const active = tick % 5;
  // word-wrap a caption into centred <tspan> lines (SVG text doesn't wrap by itself)
  const caption = (str: string, x: number, y: number, max: number, fill: string) => {
    const lines: string[] = [];
    let cur = "";
    for (const w of str.split(" ")) {
      if (cur && (cur + " " + w).length > max) {
        lines.push(cur);
        cur = w;
      } else cur = cur ? cur + " " + w : w;
    }
    if (cur) lines.push(cur);
    return (
      <text textAnchor="middle" fontSize={10.5} fill={fill}>
        {lines.map((l, i) => (
          <tspan key={i} x={x} y={y + i * 14}>{l}</tspan>
        ))}
      </text>
    );
  };
  const mem = [
    { n: "L1", t: "~1 ns", y: 36, w: 120, c: "#fb923c" },
    { n: "L2", t: "~4 ns", y: 96, w: 150, c: "#fbbf24" },
    { n: "L3", t: "~12 ns", y: 156, w: 180, c: "#a3e635" },
    { n: "DRAM", t: "~80 ns", y: 244, w: 210, c: "#34d399" },
    { n: "SSD / disk", t: "~100 µs", y: 322, w: 240, c: "#38bdf8" },
  ];

  return (
    <svg viewBox="0 0 960 440" className="w-full" role="img" aria-label={ts("Map of how the five modules fit together inside a computer")}>
      {/* CPU outline */}
      <rect x={20} y={14} width={610} height={410} rx={22} fill="#0d1427" stroke="#2f3f6e" strokeWidth={1.5} strokeDasharray="6 6" />
      <text x={42} y={40} fontSize={11} fontWeight={800} letterSpacing={2} fill="#62709b">{t("CPU CORE")}</text>

      {/* 05 pipeline strip */}
      <g {...region("pipeline")} aria-label={ts("Module 5: Pipelining")}>
        <rect x={34} y={52} width={582} height={64} rx={14} fill="#34d39908" stroke="#34d39944" />
        {STAGES.map((s, i) => (
          <g key={s} transform={`translate(${46 + i * 113} 62)`}>
            <rect width={104} height={34} rx={9} fill={STAGE_INFO[s].hex + (active === i ? "55" : "1a")} stroke={STAGE_INFO[s].hex} strokeWidth={active === i ? 2.5 : 1} style={{ transition: "all .35s" }} />
            <text x={52} y={22} textAnchor="middle" fontSize={13} fontWeight={800} fill={STAGE_INFO[s].hex}>{s}</text>
          </g>
        ))}
        <text x={325} y={110} textAnchor="middle" fontSize={10.5} fill="#34d399">{t("overlap the stages so every unit stays busy")}</text>
        {badge("pipeline", 604, 52)}
      </g>

      {/* 03 datapath */}
      <g {...region("cpu")} aria-label={ts("Module 3: CPU design")}>
        <rect x={34} y={132} width={342} height={278} rx={14} fill="#a78bfa08" stroke="#a78bfa44" />
        <rect x={50} y={150} width={140} height={50} rx={10} fill="#141d37" stroke="#a78bfa" strokeWidth={1.5} />
        <text x={120} y={180} textAnchor="middle" fontSize={13} fontWeight={700} fill="#a78bfa">{t("Control unit")}</text>
        <rect x={50} y={230} width={140} height={70} rx={10} fill="#141d37" stroke="#a78bfa" strokeWidth={1.5} />
        <text x={120} y={258} textAnchor="middle" fontSize={13} fontWeight={700} fill="#a78bfa">{t("Registers")}</text>
        <text x={120} y={278} textAnchor="middle" fontSize={10} fill="#98a4cb">R0 R1 R2 R3 …</text>
        <rect x={50} y={330} width={140} height={44} rx={10} fill="#141d37" stroke="#a78bfa" strokeWidth={1.5} />
        <text x={120} y={357} textAnchor="middle" fontSize={13} fontWeight={700} fill="#a78bfa">PC · IR</text>
        <polygon points="250,160 350,190 350,290 250,320" fill="#141d37" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
        <text x={298} y={246} textAnchor="middle" fontSize={15} fontWeight={800} fill="#a78bfa">ALU</text>
        <path d="M190 265 H250" stroke="#a78bfa" strokeWidth={2} fill="none" />
        <path d="M190 175 H220 V205 H250" stroke="#a78bfa88" strokeDasharray="3 5" strokeWidth={2} fill="none" />
        <text x={200} y={396} textAnchor="middle" fontSize={10.5} fill="#a78bfa">{t("decode instructions, steer the datapath")}</text>
        {badge("cpu", 366, 144)}
      </g>

      {/* 01 logic */}
      <g {...region("logic")} aria-label={ts("Module 1: Numbers and logic gates")}>
        <rect x={400} y={150} width={214} height={130} rx={14} fill="#22d3ee08" stroke="#22d3ee44" />
        <path d="M350 240 H400" stroke="#22d3ee" strokeWidth={2} strokeDasharray="4 4" fill="none" />
        <g transform="translate(420 168) scale(.5)"><GateShape type="XOR" out={tick % 2} /></g>
        <g transform="translate(420 214) scale(.5)"><GateShape type="AND" out={(tick >> 1) % 2} /></g>
        <g transform="translate(520 190) scale(.55)"><GateShape type="OR" out={(tick + 1) % 2} /></g>
        <path d="M456 188 H488 V204 H520 M456 234 H488 V220 H520 M560 212 H590" stroke="#22d3ee88" strokeWidth={1.5} fill="none" strokeLinejoin="round" />
        {caption(ts("the ALU is gates all the way down"), 507, 258, 22, "#22d3ee")}
        {badge("logic", 600, 146)}
      </g>

      {/* 02 digital */}
      <g {...region("digital")} aria-label={ts("Module 2: Digital design — registers and memory chips")}>
        <rect x={400} y={296} width={214} height={114} rx={14} fill="#fb923c08" stroke="#fb923c44" />
        <path d="M350 353 H400" stroke="#fb923c" strokeWidth={2} strokeDasharray="4 4" fill="none" />
        {[0, 1, 2, 3].map((k) => (
          <g key={k} transform={`translate(${424 + k * 52} 316)`}>
            <rect width={38} height={38} rx={7} fill="#141d37" stroke="#fb923c" strokeWidth={1.5} />
            <text x={19} y={17} textAnchor="middle" fontSize={13} fontWeight={800} fill={k === active % 4 ? "#fb923c" : "#62709b"} style={{ transition: "fill .3s" }}>{(tick + k) % 2}</text>
            <text x={19} y={32} textAnchor="middle" fontSize={9} fill="#62709b">Q{3 - k}</text>
          </g>
        ))}
        {caption(ts("flip-flops remember; counters and K-maps build on them"), 507, 374, 30, "#fb923c")}
        {badge("digital", 600, 292)}
      </g>

      {/* 04 memory */}
      <g {...region("memory")} aria-label={ts("Module 4: Memory hierarchy")}>
        <rect x={660} y={14} width={286} height={410} rx={22} fill="#fbbf2408" stroke="#fbbf2444" />
        <text x={680} y={40} fontSize={11} fontWeight={800} letterSpacing={2} fill="#62709b">{t("MEMORY HIERARCHY")}</text>
        {mem.map((m, i) => (
          <g key={m.n}>
            <rect x={803 - m.w / 2} y={m.y + 14} width={m.w} height={42} rx={10} fill={m.c + "1f"} stroke={m.c} strokeWidth={1.5} />
            <text x={803 - m.w / 2 + 14} y={m.y + 40} fontSize={13} fontWeight={800} fill={m.c} style={{ fontFamily: "var(--font-sans)" }}>{m.n}</text>
            <text x={803 + m.w / 2 - 14} y={m.y + 40} textAnchor="end" fontSize={11} fill="#c7d0ee">{m.t}</text>
            {i < mem.length - 1 && <path d={`M803 ${m.y + 56} V${mem[i + 1].y + 14}`} stroke="#62709b" strokeWidth={1.5} strokeDasharray="3 4" />}
          </g>
        ))}
        <text x={803} y={412} textAnchor="middle" fontSize={10.5} fill="#fbbf24">{t("bigger, slower, cheaper per byte ↓")}</text>
        {badge("memory", 934, 28)}
      </g>

      {/* CPU ↔ memory link */}
      <path d="M630 100 H660" stroke="#fbbf24" strokeWidth={2.5} />
      <text x={645} y={92} fontSize={9} textAnchor="middle" fill="#fbbf24">{t("data")}</text>
    </svg>
  );
}

/* ───────────── journey ───────────── */

const JOURNEY: { mod: ModuleId; title: string; text: string }[] = [
  { mod: "logic", title: "It starts as bits", text: "LOAD R1, [R3+4] is a 16-bit pattern — 0x6704. Numbers, addresses and instructions are all just bits; what they mean depends on who reads them." },
  { mod: "memory", title: "Fetch from the instruction cache", text: "The PC's value is an address. The L1 instruction cache usually answers in a few cycles; on a miss the request falls to L2, L3, then DRAM (~80 ns, hundreds of cycles)." },
  { mod: "cpu", title: "Decode and read registers", text: "The control unit splits the bits: opcode LOAD, base register R3, offset 4. It sets MemRead, ALUSrc = immediate, RegWrite and MemToReg." },
  { mod: "logic", title: "The ALU adds R3 + 4", text: "The effective address is computed by an adder — the same full-adder chain from Module 01, built entirely from XOR, AND and OR gates." },
  { mod: "memory", title: "Data-cache lookup", text: "The address splits into tag | index | offset. Tag match → hit, data in ~1 ns. Mismatch → miss, and the whole 64-byte block is pulled up the hierarchy." },
  { mod: "pipeline", title: "Meanwhile, the pipeline moves on", text: "While LOAD sits in MEM, the next instructions are already in EX, ID and IF. If the next instruction needs R1, it must wait one bubble — the load-use hazard." },
];

function Journey({ go }: { go: Go }) {
  const { t, ts, tf } = useLang();
  const [i, setI] = useState(0);
  const cur = JOURNEY[i];
  const m = getModule(cur.mod);
  return (
    <Panel title={t("Follow one instruction: LOAD R1, [R3 + 4]")}>
      <div className="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
        <ol className="space-y-1.5">
          {JOURNEY.map((j, k) => {
            const mm = getModule(j.mod);
            return (
              <li key={k}>
                <button
                  onClick={() => setI(k)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-start text-sm transition-all",
                    k === i ? "border-white/25 bg-white/10 text-ink" : "border-transparent text-mute hover:bg-white/5",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold" style={{ background: mm.hex + (k <= i ? "" : "33"), color: k <= i ? "#06101c" : mm.hex }}>
                    {k + 1}
                  </span>
                  <span className="leading-tight">{t(j.title)}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div key={i} className="rise-in flex flex-col justify-between rounded-xl border bg-bg/50 p-5" style={{ borderColor: m.hex + "55" }}>
          <div>
            <Tag color={m.hex}>{t("MODULE")} {m.num} · {ts(m.short)}</Tag>
            <h4 className="mt-3 text-lg font-semibold text-ink">{t(cur.title)}</h4>
            <p className="mt-2 text-[15px] leading-relaxed text-mute">{t(cur.text)}</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>{t("◂ Back")}</Button>
            <Button variant="primary" color={m.hex} onClick={() => setI(Math.min(JOURNEY.length - 1, i + 1))} disabled={i === JOURNEY.length - 1}>{t("Next ▸")}</Button>
            <Button variant="ghost" className="ms-auto" onClick={() => go(cur.mod)}>{tf("Explore {mod} →", { mod: ts(m.short) })}</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ───────────── iron law ───────────── */

function IronLaw({ go }: { go: Go }) {
  const { t, tf } = useLang();
  const [ic, setIc] = useState(1000); // millions of instructions
  const [ghz, setGhz] = useState(3);
  const [baseCpi, setBaseCpi] = useState(1.2);
  const [miss, setMiss] = useState(2); // % of memory references missing the L1
  const [pen, setPen] = useState(40); // average cycles per miss

  const refs = 1.3; // memory refs per instruction (1 fetch + ~0.3 data)
  const memCpi = refs * (miss / 100) * pen;
  const cpi = baseCpi + memCpi;
  const seconds = (ic * 1e6 * cpi) / (ghz * 1e9);
  const frac = memCpi / cpi;

  return (
    <Panel title={t("One equation ties them together: the Iron Law of performance")}>
      <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-xl border border-line bg-bg/50 px-4 py-4 text-center font-mono text-base sm:text-xl">
        <span className="text-mute">{t("CPU time")}</span>
        <span className="text-dim">=</span>
        <button onClick={() => go("cpu")} className="rounded-lg border border-cpu/40 bg-cpu/10 px-3 py-1 text-cpu transition hover:bg-cpu/20">{t("Instructions")}</button>
        <span className="text-dim">×</span>
        <button onClick={() => go("pipeline")} className="rounded-lg border border-pipe/40 bg-pipe/10 px-3 py-1 text-pipe transition hover:bg-pipe/20">CPI</button>
        <span className="text-dim">×</span>
        <button onClick={() => go("logic")} className="rounded-lg border border-logic/40 bg-logic/10 px-3 py-1 text-logic transition hover:bg-logic/20">{t("Clock period")}</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Slider label={<span className="text-cpu">{t("Instruction count — ISA & compiler (Module 03)")}</span>} value={ic} min={100} max={5000} step={100} onChange={setIc} format={(v) => `${v} M`} color="#a78bfa" />
          <Slider label={<span className="text-logic">{t("Clock frequency — gate & wire delay (Module 01)")}</span>} value={ghz} min={1} max={5} step={0.1} onChange={setGhz} format={(v) => `${v.toFixed(1)} GHz`} color="#22d3ee" />
          <Slider label={<span className="text-pipe">{t("Base CPI — pipeline hazards (Module 05)")}</span>} value={baseCpi} min={1} max={4} step={0.1} onChange={setBaseCpi} format={(v) => v.toFixed(1)} color="#34d399" />
          <Slider label={<span className="text-mem">{t("L1 miss rate per memory reference (Module 04)")}</span>} value={miss} min={0} max={10} step={0.5} onChange={setMiss} format={(v) => `${v.toFixed(1)} %`} color="#fbbf24" />
          <Slider label={<span className="text-mem">{t("Average miss penalty (Module 04)")}</span>} value={pen} min={5} max={300} step={5} onChange={setPen} format={(v) => `${v} cycles`} color="#fbbf24" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-bg/50 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Run time")}</div>
            <div className="mt-1 font-mono text-4xl font-bold tabular-nums text-ink">{seconds.toFixed(2)}<span className="ms-1 text-lg text-dim">s</span></div>
            <div className="mt-1 font-mono text-xs text-dim">{ic} M × {cpi.toFixed(2)} CPI ÷ {ghz.toFixed(1)} GHz</div>
          </div>
          <div className="rounded-xl border border-line bg-bg/50 p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{tf("Where the cycles go (effective CPI = {cpi})", { cpi: cpi.toFixed(2) })}</div>
            </div>
            <div className="flex h-5 overflow-hidden rounded-full bg-line">
              <div className="bg-pipe transition-all duration-300" style={{ width: `${(baseCpi / cpi) * 100}%` }} />
              <div className="bg-mem transition-all duration-300" style={{ width: `${frac * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-pipe">{tf("pipeline: {n}", { n: baseCpi.toFixed(2) })}</span>
              <span className="text-mem">{tf("memory stalls: {n} ({p}%)", { n: memCpi.toFixed(2), p: (frac * 100).toFixed(0) })}</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-dim">
              {tf("memory CPI = {refs} refs/instr × {miss}% × {pen} cycles. A fast clock and a perfect pipeline are wasted if the cache keeps missing — each module attacks a different term of the same product.", { refs, miss: miss.toFixed(1), pen })}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ───────────── page ───────────── */

export default function Overview({ go }: { go: Go }) {
  const { t } = useLang();
  const cards = MODULES.filter((m) => m.id !== "overview");
  return (
    <div>
      {/* hero */}
      <header className="rise-in mb-12 grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <Tag color="#98a4cb">{t("AN EXPLORABLE EXPLANATION")}</Tag>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            {t("How a computer")} <span className="bg-gradient-to-r from-logic via-cpu to-pipe bg-clip-text text-transparent">{t("actually works.")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-mute">
            {t("Five ideas — logic, digital design, the CPU, memory and pipelining — stack up into every processor you've ever used. Don't read about them: flip the gates, shrink the logic, step the CPU, miss the cache, and break the pipeline.")}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button variant="primary" className="!px-5 !py-2.5 !text-base" onClick={() => go("logic")}>{t("Start with bits →")}</Button>
            <Button className="!px-5 !py-2.5 !text-base" onClick={() => document.getElementById("map")?.scrollIntoView({ behavior: "smooth" })}>{t("See the big picture")}</Button>
          </div>
        </div>
        <div className="flex justify-start lg:justify-end">
          <HeroByte />
        </div>
      </header>

      {/* map */}
      <section id="map" className="mb-14 scroll-mt-24">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-ink">{t("The big picture")}</h2>
        <p className="mb-5 max-w-3xl text-[15px] leading-relaxed text-mute">
          {t("A processor runs a program by repeatedly doing one tiny thing: fetch an instruction, do it. Everything else exists to make that loop")} <em>{t("possible")}</em>{t(",")} <em>{t("correct")}</em>{t(" and ")}<em>{t("fast")}</em>{t(". Hover a region to see which module covers it; click to dive in.")}
        </p>
        <Panel bodyClassName="p-2 sm:p-4">
          <MachineMap go={go} />
        </Panel>
      </section>

      {/* four questions */}
      <section className="mb-14">
        <h2 className="mb-5 text-2xl font-semibold tracking-tight text-ink">{t("Five questions, five modules")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards
            .filter((m) => m.id !== "videos")
            .map((m) => (
            <button
              key={m.id}
              onClick={() => go(m.id)}
              className={cn("group relative overflow-hidden rounded-2xl border bg-surface/70 p-5 text-start transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface", m.borderSoft, "hover:border-white/30")}
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: m.hex }} />
              <div className="relative">
                <div className="mb-3 flex items-center gap-3">
                  <span className={cn("rounded-md border px-2 py-0.5 font-mono text-xs font-bold", m.text, m.border, m.bgSoft)}>{m.num}</span>
                  <span className="text-xs uppercase tracking-widest text-dim">{t(m.short)}</span>
                </div>
                <h3 className="text-xl font-semibold text-ink">{t(m.question)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mute">{t(WHY[m.id])}</p>
                <div className={cn("mt-4 text-sm font-semibold", m.text)}>
                  {t("Explore")} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => go("videos")}
          className="group mt-4 flex w-full items-center gap-4 rounded-2xl border border-vid/30 bg-vid/[0.06] p-4 text-start transition-all duration-200 hover:border-vid/50"
        >
          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-vid/50 bg-vid/15 text-vid transition-transform group-hover:scale-105">
            ▶
          </span>
          <span>
            <span className="block text-sm font-semibold text-ink">
              {t("Prefer to watch? The Motion Reels (06) animate the processor's history, the five modules above, and the Antikythera mechanism.")}
            </span>
            <span className="mt-0.5 block text-xs text-dim">{t("Live canvas reels, drawn by code in this repo · ")}<span className="text-vid">{t("Watch →")}</span></span>
          </span>
        </button>
      </section>

      <section className="mb-14">
        <Journey go={go} />
      </section>

      <section className="mb-6">
        <IronLaw go={go} />
      </section>
    </div>
  );
}

const WHY: Record<string, string> = {
  logic: "Hardware only knows high and low voltage. Bits encode everything; gates transform them; adders prove that arithmetic is just logic. The ALU you'll meet in Module 03 is built from exactly these parts.",
  digital: "Boolean algebra and Karnaugh maps shrink a pile of gates to the minimum that does the job; flip-flops add memory. Registers, shifters, counters and the RAM chips everything talks to are built here.",
  cpu: "A datapath moves data, a control unit decides what it does each cycle. The fetch–decode–execute loop turns a list of numbers in memory into behaviour — you'll write and single-step a program yourself.",
  memory: "Compute is cheap, waiting for data is not. A hierarchy of caches exploits locality to make a huge slow memory behave like a fast one — until your access pattern breaks the bet.",
  pipeline: "Instead of finishing one instruction before starting the next, overlap them like an assembly line. Throughput soars — until dependencies and branches introduce stalls, forwarding, and flushes.",
};
