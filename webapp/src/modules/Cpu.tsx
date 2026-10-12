import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button, Callout, Code, ModuleHeader, Panel, Section, Segmented, Stat, Tag, bin, hex } from "../components/ui";
import {
  PRESETS,
  STAGE_LABEL,
  STAGE_ORDER,
  assemble,
  control,
  decode,
  nextStage,
  resetCpu,
  stagesUsed,
  step,
  type Cpu,
  type Decoded,
  type Instr,
} from "../lib/isa";
import { STAGE_INFO, STAGE_KEY, getModule } from "../lib/theme";
import { useLang } from "../lib/i18n";
import { cn } from "../utils/cn";
import { Alu } from "./cpu/Alu";
import { AsmControl } from "./cpu/AsmControl";
import { BusTransfer } from "./cpu/BusTransfer";
import { Datapath } from "./cpu/Datapath";

/* ───────────── machine state reducer ───────────── */

interface Machine {
  cpu: Cpu;
  curIdx: number | null; // index of the instruction currently in flight
}
type Action = { type: "step"; program: Instr[] } | { type: "instr"; program: Instr[] } | { type: "reset" };

const initMachine = (): Machine => ({ cpu: resetCpu(), curIdx: null });

function advance(m: Machine, program: Instr[]): Machine {
  if (m.cpu.halted) return m;
  const before = m.cpu;
  const cpu = step(before, program);
  const isFetch = cpu.stage === "F";
  const curIdx = isFetch && !(cpu.halted && cpu.ir === null) ? before.pc : m.curIdx;
  return { cpu, curIdx };
}

function reducer(m: Machine, a: Action): Machine {
  switch (a.type) {
    case "reset":
      return initMachine();
    case "step":
      return advance(m, a.program);
    case "instr": {
      let s = advance(m, a.program);
      let guard = 0;
      while (!s.cpu.halted && nextStage(s.cpu) !== "F" && guard++ < 8) s = advance(s, a.program);
      return s;
    }
  }
}

/* ───────────── small views ───────────── */

function StageTracker({ cpu }: { cpu: Cpu }) {
  const { t } = useLang();
  const ins = cpu.ir !== null ? decode(cpu.ir) : null;
  const used = ins ? stagesUsed(ins.op) : STAGE_ORDER;
  const nxt = cpu.halted ? null : nextStage(cpu);
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
      {STAGE_ORDER.map((s, i) => {
        const info = STAGE_INFO[STAGE_KEY[s]];
        const active = cpu.stage === s;
        const isUsed = used.includes(s) || s === "F";
        const isNext = nxt === s && !active;
        return (
          <div
            key={s}
            className={cn(
              "relative overflow-hidden rounded-xl border px-2 py-2 text-center transition-all duration-300 sm:px-3 sm:py-2.5",
              active ? cn(info.bg, info.border, "scale-[1.03]") : "border-line bg-bg/40",
              !isUsed && !active && "opacity-35",
              isNext && "border-dashed border-ink/50",
            )}
            style={active ? { boxShadow: `0 0 22px ${info.hex}40` } : undefined}
          >
            <div className="font-mono text-[10px] text-dim">{i + 1}</div>
            <div className={cn("text-xs font-bold sm:text-sm", active ? info.text : "text-mute")}>{t(info.name)}</div>
            <div className="mt-0.5 hidden h-8 text-[10px] leading-tight text-dim sm:block">
              {!isUsed ? t("not used by this instruction") : t(info.verb)}
            </div>
            {isNext && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-ink/40" />}
          </div>
        );
      })}
    </div>
  );
}

function fieldNames(d: Decoded): { a: string; b: string; imm: string; aUsed: boolean; bUsed: boolean; immBits: string } {
  switch (d.op) {
    case "ADD": case "SUB": case "AND":
      return { a: "rd", b: "rs", imm: "rt", aUsed: true, bUsed: true, immBits: "000000 rt" };
    case "ADDI": return { a: "rd", b: "rs", imm: "imm", aUsed: true, bUsed: true, immBits: "imm8" };
    case "LDI": return { a: "rd", b: "—", imm: "imm", aUsed: true, bUsed: false, immBits: "imm8" };
    case "LOAD": return { a: "rd", b: "base", imm: "offset", aUsed: true, bUsed: true, immBits: "off8" };
    case "STORE": return { a: "src", b: "base", imm: "offset", aUsed: true, bUsed: true, immBits: "off8" };
    case "BEQ": case "BNE": return { a: "rs1", b: "rs2", imm: "target", aUsed: true, bUsed: true, immBits: "addr8" };
    case "JMP": return { a: "—", b: "—", imm: "target", aUsed: false, bUsed: false, immBits: "addr8" };
    default: return { a: "—", b: "—", imm: "—", aUsed: false, bUsed: false, immBits: "—" };
  }
}

function DecoderStrip({ cpu }: { cpu: Cpu }) {
  const { t } = useLang();
  const word = cpu.ir;
  const d = word !== null ? decode(word) : null;
  const f = d ? fieldNames(d) : null;
  const bits = word !== null ? bin(word, 16) : "—".repeat(16);
  const seg = (from: number, to: number) => bits.slice(from, to);
  const decoded = cpu.stage !== null && cpu.stage !== "F";
  const groups = [
    { label: "opcode", bits: seg(0, 4), val: d?.op ?? "?", color: "#a78bfa", used: true },
    { label: f?.a ?? "a", bits: seg(4, 6), val: d && f?.aUsed ? `R${d.a}` : "", color: "#38bdf8", used: f?.aUsed ?? true },
    { label: f?.b ?? "b", bits: seg(6, 8), val: d && f?.bUsed ? `R${d.b}` : "", color: "#34d399", used: f?.bUsed ?? true },
    { label: f?.imm ?? "imm8", bits: seg(8, 16), val: d && f && f.imm !== "—" ? (d.op.startsWith("B") || d.op === "JMP" ? `→ ${d.imm}` : d.op === "ADD" || d.op === "SUB" || d.op === "AND" ? `R${d.rt}` : String(d.imm > 127 && d.op !== "LDI" ? d.imm - 256 : d.imm)) : "", color: "#fbbf24", used: d ? f?.imm !== "—" : true },
  ];
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-dim">
        <span>{t("Instruction register, bit by bit")}</span>
        <span>{decoded ? t("decoded ✓") : t("waiting for fetch/decode")}</span>
      </div>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {groups.map((g, i) => (
          <div key={i} className={cn("text-center transition-opacity duration-300", !g.used && "opacity-35")}>
            <div
              className="rounded-lg border px-2 py-1.5 font-mono text-base font-bold tracking-widest sm:text-lg"
              style={{ borderColor: g.color + "66", color: g.color, background: g.color + (decoded ? "20" : "0d") }}
            >
              {g.bits}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-mute">{g.label}</div>
            <div className="h-4 font-mono text-[11px] text-ink">{decoded ? g.val : ""}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Registers({ cpu }: { cpu: Cpu }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between rounded-lg border border-line bg-bg/40 px-3 py-2">
        <span className="font-mono text-sm font-bold text-sky-400">PC</span>
        <span key={cpu.pc} className={cn("font-mono text-lg font-bold text-ink", cpu.changed.pc && "pop")}>{cpu.pc}</span>
      </div>
      {cpu.regs.map((v, i) => (
        <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-bg/40 px-3 py-2">
          <span className="font-mono text-sm font-bold text-mute">R{i}</span>
          <span className="font-mono text-[11px] text-dim">{bin(v, 8)} · 0x{hex(v)}</span>
          <span key={`${v}-${cpu.cycles}`} className={cn("w-10 text-right font-mono text-lg font-bold text-ink", cpu.changed.reg === i && "pop text-emerald-400")}>{v}</span>
        </div>
      ))}
    </div>
  );
}

function MemoryGrid({ cpu }: { cpu: Cpu }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 lg:grid-cols-4 xl:grid-cols-8">
      {cpu.mem.map((v, i) => {
        const wrote = cpu.changed.mem === i;
        const reading = cpu.stage === "M" && cpu.addr === i && cpu.memOut !== null;
        return (
          <div
            key={`${i}-${wrote ? cpu.cycles : 0}`}
            className={cn(
              "rounded-lg border px-1 py-1.5 text-center transition-colors duration-300",
              wrote ? "pop border-rose-400 bg-rose-400/20" : reading ? "border-rose-400/70 bg-rose-400/10" : "border-line bg-bg/40",
            )}
          >
            <div className="font-mono text-[9px] text-dim">[{i}]</div>
            <div className="font-mono text-sm font-bold text-ink">{v}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── lab ───────────── */

function Lab() {
  const mod = getModule("cpu");
  const { t, ts } = useLang();
  const [presetIdx, setPresetIdx] = useState(0);
  const [src, setSrc] = useState(PRESETS[0].src);
  const asm = useMemo(() => assemble(src), [src]);
  const [m, dispatch] = useReducer(reducer, undefined, initMachine);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const programRef = useRef(asm.program);
  programRef.current = asm.program;
  const hasErrors = asm.errors.length > 0 || asm.program.length === 0;
  const { cpu } = m;

  // any source change resets the machine
  useEffect(() => {
    dispatch({ type: "reset" });
    setRunning(false);
  }, [src]);

  useEffect(() => {
    if (!running) return;
    if (cpu.halted) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => dispatch({ type: "step", program: programRef.current }), speed);
    return () => window.clearTimeout(t);
  }, [running, cpu, speed]);

  const doStep = () => dispatch({ type: "step", program: asm.program });
  const doInstr = () => dispatch({ type: "instr", program: asm.program });
  const reset = () => {
    setRunning(false);
    dispatch({ type: "reset" });
  };

  const nxt = cpu.halted ? null : nextStage(cpu);
  const errByLine = new Map(asm.errors.map((e) => [e.line, e.msg]));
  const cpi = cpu.retired ? cpu.cycles / cpu.retired : 0;
  const lines = src.split("\n");

  return (
    <div className="space-y-5">
      <Panel
        title={t("Datapath")}
        right={
          <Tag color={cpu.stage ? STAGE_INFO[STAGE_KEY[cpu.stage]].hex : "#62709b"}>
            {cpu.halted ? t("HALTED") : cpu.stage ? `${STAGE_LABEL[cpu.stage].toUpperCase()} ${t("done")}` : t("READY")}
          </Tag>
        }
      >
        <div className="overflow-x-auto"><Datapath cpu={cpu} program={asm.program} /></div>
      </Panel>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* left: datapath + controls */}
        <div className="space-y-5">
          <Panel title={t("Instruction cycle")}>
            <StageTracker cpu={cpu} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="primary" color={mod.hex} onClick={doStep} disabled={cpu.halted || hasErrors}>
                {t("Step")} ▸ {nxt ? STAGE_LABEL[nxt] : "—"}
              </Button>
              <Button onClick={doInstr} disabled={cpu.halted || hasErrors}>{t("Step instruction »")}</Button>
              <Button onClick={() => setRunning((r) => !r)} disabled={cpu.halted || hasErrors} active={running}>
                {running ? t("‖ Pause") : t("▶ Run")}
              </Button>
              <Button variant="ghost" onClick={reset}>{t("↺ Reset")}</Button>
              <div className="ms-auto">
                <Segmented
                  value={speed}
                  onChange={setSpeed}
                  color={mod.hex}
                  options={[{ value: 1000, label: t("slow") }, { value: 500, label: t("normal") }, { value: 130, label: t("fast") }]}
                />
              </div>
            </div>
            <div className="mt-4 min-h-[56px] rounded-xl border border-line bg-bg/60 px-4 py-3 font-mono text-[13px] leading-relaxed text-ink">
              <span key={cpu.cycles} className="rise-in inline-block">{cpu.note}</span>
            </div>
          </Panel>

          <DecoderStrip cpu={cpu} />

          {cpu.halted && (
            <Callout title={cpu.error ? t("Stopped") : t("Program finished")} tone={cpu.error ? "warn" : "note"}>
              {cpu.error ?? (
                <>
                  <strong className="text-ink">{cpu.retired}</strong> {t("instructions in")} <strong className="text-ink">{cpu.cycles}</strong> {t("cycles →")} <strong className="text-ink">CPI ≈ {cpi.toFixed(2)}</strong>.{" "}
                  {t("This multi-cycle machine uses most of the datapath for only one stage at a time. Pipelining (module 05) overlaps stages to push CPI toward 1.")}
                </>
              )}
            </Callout>
          )}
        </div>

        {/* right: program + state */}
        <div className="space-y-5">
          <Panel title={t("Program")} bodyClassName="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, i) => (
                <Button
                  key={p.name}
                  variant="subtle"
                  className="!px-2 !py-1 !text-xs"
                  active={presetIdx === i}
                  onClick={() => {
                    setPresetIdx(i);
                    setSrc(p.src);
                  }}
                >
                  {t(p.name)}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-dim">{t(PRESETS[presetIdx]?.blurb ?? "")}</p>
            <textarea
              value={src}
              onChange={(e) => {
                setSrc(e.target.value);
                setPresetIdx(-1);
              }}
              spellCheck={false}
              rows={Math.min(14, Math.max(7, lines.length + 1))}
              className="w-full resize-y overflow-x-auto whitespace-pre rounded-xl border border-line bg-bg/70 p-3 font-mono text-[13px] leading-6 text-ink outline-none focus:border-cpu"
              aria-label={ts("Assembly source")}
              wrap="off"
            />
            {asm.errors.length > 0 && (
              <ul className="space-y-1 text-xs text-bad">
                {asm.errors.slice(0, 4).map((e, i) => (
                  <li key={i}>
                    {t("line")} {e.line}: {e.msg}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t("Assembled (instruction memory)")} bodyClassName="p-2 sm:p-3">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full font-mono text-[11px]">
                <tbody>
                  {asm.program.map((ins, i) => {
                    const cur = m.curIdx === i && cpu.stage !== null && !cpu.halted;
                    const isPc = cpu.pc === i && !cpu.halted;
                    return (
                      <tr key={i} className={cn("transition-colors duration-300", cur ? "bg-cpu/20" : isPc ? "bg-white/5" : "")}>
                        <td className="w-8 py-1 pl-1 text-dim">{i}</td>
                        <td className="w-6 text-sky-400">{isPc ? "PC▸" : ""}</td>
                        <td className="w-12 text-dim">{hex(ins.word, 4)}</td>
                        <td className={cn("py-1", errByLine.has(ins.line) ? "text-bad" : cur ? "text-ink" : "text-mute")}>{ins.text}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title={t("Registers & PC")}>
          <Registers cpu={cpu} />
        </Panel>
        <div className="space-y-5">
          <Panel title={t("Data memory (16 words, address mod 16)")}>
            <MemoryGrid cpu={cpu} />
          </Panel>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("Cycles")} value={cpu.cycles} color="#a78bfa" />
            <Stat label={t("Instrs")} value={cpu.retired} color="#a78bfa" />
            <Stat label="CPI" value={cpi ? cpi.toFixed(2) : "—"} color="#a78bfa" />
          </div>
        </div>
      </div>

      <Panel title={t("Control signals by opcode (what the decoder produces)")} bodyClassName="p-0 sm:p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-center font-mono text-xs">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-widest text-dim">
                {["Op", "RegWrite", "ALUSrc", "ALUOp", "MemRead", "MemWrite", "MemToReg", "Branch", "Jump"].map((h) => (
                  <th key={h} className="px-2 py-2 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["ADD", "SUB", "AND", "ADDI", "LDI", "LOAD", "STORE", "BEQ", "BNE", "JMP"] as const).map((op) => {
                const c = control(op);
                const live = cpu.ir !== null && decode(cpu.ir).op === op && cpu.stage !== null && cpu.stage !== "F";
                const cell = (b: boolean) => <td className={b ? "font-bold text-cpu" : "text-dim"}>{b ? 1 : 0}</td>;
                return (
                  <tr key={op} className={cn("border-b border-line/50 transition-colors", live && "bg-cpu/15")}>
                    <td className="px-2 py-1.5 text-left font-bold text-ink">{op}</td>
                    {cell(c.regWrite)}
                    <td className={c.aluSrcImm ? "text-mem" : "text-dim"}>{c.aluSrcImm ? "imm" : "reg"}</td>
                    <td className="text-mute">{c.aluOp}</td>
                    {cell(c.memRead)}
                    {cell(c.memWrite)}
                    {cell(c.memToReg)}
                    {cell(c.branch)}
                    {cell(c.jump)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ───────────── page ───────────── */

const PARTS: { name: string; color: string; text: string }[] = [
  { name: "Program counter (PC)", color: "#38bdf8", text: "A register holding the address of the next instruction. Fetch increments it; branches overwrite it." },
  { name: "Instruction register (IR)", color: "#38bdf8", text: "Holds the fetched instruction while it's decoded, so its bit fields can steer the rest of the machine." },
  { name: "Control unit", color: "#a78bfa", text: "Turns the opcode into control signals (RegWrite, ALUSrc, MemRead…) — the datapath's conductor." },
  { name: "Register file", color: "#34d399", text: "A small, very fast array of registers with two read ports and one write port." },
  { name: "ALU", color: "#fbbf24", text: "Combinational logic from Modules 01–02: adds, subtracts, ANDs, shifts — and computes memory addresses and branch conditions." },
  { name: "Memories & buses", color: "#fb7185", text: "Instruction and data memory (Harvard-style here) connected by wires/buses; a mux picks where each value comes from." },
];

export default function CpuModule() {
  const mod = getModule("cpu");
  const { t } = useLang();
  return (
    <div>
      <ModuleHeader mod={mod}>
        {t("A CPU is a loop: fetch an instruction, figure out what it means, do it, and move on. This module opens the box — datapath, ALU, control and a tiny instruction set you can program and single-step.")}
      </ModuleHeader>

      <Section
        mod={mod}
        num="3.1"
        title={t("Anatomy of a processor")}
        lead={t("Two ideas dominate CPU design: a datapath (the hardware that moves and transforms data) and control (the logic that decides what the datapath does this cycle). Every instruction is just a different setting of the control signals.")}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PARTS.map((p) => (
            <div key={p.name} className="rounded-xl border border-line bg-surface/70 p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
                <h3 className="text-sm font-semibold text-ink">{t(p.name)}</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-mute">{t(p.text)}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        mod={mod}
        num="3.2"
        title={t("Run a program, one stage at a time")}
        lead={
          <>
            {t("Pick a program (or edit it), then press")} <Code>{t("Step")}</Code>. {t("Each press runs one stage of the instruction cycle. The coloured components and flowing wires show exactly which hardware is in use. Stages an instruction doesn't need — like")} <em>{t("Memory")}</em> {t("for an ADD — are skipped.")}
          </>
        }
      >
        <Lab />
      </Section>

      <Section
        mod={mod}
        num="3.3"
        title={t("Register transfer & the common bus")}
        lead={
          <>
            {t("Zoom between the gates of module 01 and the programs above: a CPU is registers + one shared bus. Each clock pulse, control logic selects a source onto the bus and pulses one destination's load — a")} <em>{t("micro-operation")}</em>. {t("The fetch cycle you just watched in 3.2 is four of them.")}
          </>
        }
      >
        <BusTransfer />
      </Section>

      <Section
        mod={mod}
        num="3.4"
        title={t("The ALU: arithmetic, logic, shift")}
        lead={t("Modules 01–02 built the pieces; here they click together into the arithmetic–logic unit. One stage = an arithmetic circuit (MUX + adder), a logic circuit (gates + MUX), a shift unit, and a final select: S₃S₂ choose the family, S₁S₀ the operation. This is the box every instruction's execute step keeps calling.")}
      >
        <Alu />
      </Section>

      <Section mod={mod} num="3.5" title={t("The TinyRISC instruction set")} lead={t("A deliberately small, RISC-style ISA: fixed 16-bit instructions, load/store architecture (only LOAD and STORE touch memory), and three simple formats.")}>
        <Panel bodyClassName="p-0 sm:p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-start text-sm">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-widest text-dim">
                  <th className="px-4 py-2.5 text-start font-semibold">{t("Instruction")}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{t("Meaning")}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{t("Stages used")}</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[13px]">
                {[
                  ["ADD / SUB / AND Rd, Rs, Rt", "Rd ← Rs ∘ Rt", "F D X W"],
                  ["ADDI Rd, Rs, imm", "Rd ← Rs + sext(imm)", "F D X W"],
                  ["LDI Rd, imm", "Rd ← imm", "F D X W"],
                  ["LOAD Rd, [Rs+off]", "Rd ← MEM[Rs + off]", "F D X M W"],
                  ["STORE Rd, [Rs+off]", "MEM[Rs + off] ← Rd", "F D X M"],
                  ["BEQ / BNE Ra, Rb, label", "if (Ra ==/!= Rb) PC ← label", "F D X"],
                  ["JMP label", "PC ← label", "F D X"],
                  ["HALT / NOP", "stop / do nothing", "F D X"],
                ].map(([a, b, c]) => (
                  <tr key={a} className="border-b border-line/50">
                    <td className="px-4 py-2 text-ink" dir="ltr">{a}</td>
                    <td className="px-4 py-2 text-mute" dir="ltr">{b}</td>
                    <td className="px-4 py-2 text-dim" dir="ltr">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Callout title={t("Honest simplifications")} tone="warn">
          {t("Branch targets are absolute instruction indices (MIPS/RISC-V use PC-relative offsets), the PC counts instructions rather than bytes, and data memory is only 16 words. Register values are 8-bit and wrap around. The structure — fetch, decode, execute, memory, write-back, driven by decoded control signals — is the real thing.")}
        </Callout>
      </Section>

      <Section
        mod={mod}
        num="3.6"
        title={t("ASM charts & control design")}
        lead={t("Who pulses which register, when? The answer is a state machine, and the Algorithmic State Machine chart is its blueprint: state boxes, decision boxes, conditional outputs. Below, the course's example machine is written as a chart, as a state table, and as real hardware — two MUXes feeding D flip-flops through a decoder.")}
      >
        <AsmControl />
      </Section>
    </div>
  );
}
