import { useEffect, useMemo, useState } from "react";
import { Button, Callout, Code, ModuleHeader, Panel, Section, Segmented, Slider, Stat, Switch, Tag } from "../components/ui";
import {
  PIPE_PRESETS,
  STAGE_DELAY_PS,
  parseProgram,
  schedule,
  sequentialSchedule,
  type PCfg,
} from "../lib/pipeline";
import { STAGES, STAGE_INFO, getModule } from "../lib/theme";
import { useLang } from "../lib/i18n";
import { cn } from "../utils/cn";
import { Gantt } from "./pipeline/Gantt";
import { LivePipe } from "./pipeline/LivePipe";

const HAZARDS = [
  {
    name: "Structural hazard",
    color: "#fbbf24",
    what: "Two instructions need the same hardware in the same cycle.",
    fix: "Duplicate the resource. Here: separate instruction & data memories, and a register file with two read ports and one write port. (A single shared memory would make IF collide with MEM on every load/store.)",
  },
  {
    name: "Data (RAW) hazard",
    color: "#fb7185",
    what: "An instruction reads a register that an earlier, still-in-flight instruction hasn't written yet.",
    fix: "Stall until the write-back happens — or forward the result straight from the EX/MEM or MEM/WB pipeline register into the ALU input. Loads still cost one bubble.",
  },
  {
    name: "Control hazard",
    color: "#a78bfa",
    what: "The next PC isn't known until a branch resolves, but fetch has already moved on.",
    fix: "Stall, predict (here: predict not-taken and flush on a mistake), or resolve branches earlier in the pipeline to shrink the penalty.",
  },
];

export default function PipelineModule() {
  const mod = getModule("pipeline");
  const [presetId, setPresetId] = useState<string | null>("raw");
  const [src, setSrc] = useState(PIPE_PRESETS[1].src);
  const [forwarding, setForwarding] = useState(false);
  const [branchStage, setBranchStage] = useState<PCfg["branchStage"]>("EX");
  const [predictor, setPredictor] = useState<PCfg["predictor"]>("not-taken");
  const [tc, setT] = useState(99);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(650);
  const { t, ts, tf } = useLang();

  const { instrs, errors } = useMemo(() => parseProgram(src), [src]);
  const cfg: PCfg = { forwarding, branchStage, predictor };
  const sched = useMemo(() => schedule(instrs, cfg), [instrs, forwarding, branchStage, predictor]);
  const schedOther = useMemo(() => schedule(instrs, { ...cfg, forwarding: !forwarding }), [instrs, forwarding, branchStage, predictor]);
  const seq = useMemo(() => sequentialSchedule(instrs), [instrs]);
  const total = sched.total;
  const tt = Math.min(tc, total);
  const N = instrs.length;

  useEffect(() => {
    if (!playing) return;
    if (tt >= total) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setT(tt + 1), speed);
    return () => window.clearTimeout(id);
  }, [playing, tt, total, speed]);

  const play = () => {
    if (playing) return setPlaying(false);
    if (tt >= total) setT(0);
    setPlaying(true);
  };

  const noFwd = forwarding ? schedOther : sched;
  const withFwd = forwarding ? sched : schedOther;

  const cpi = N ? total / N : 0;
  const pipeTimeNs = (total * 200) / 1000;
  const singleCycleNs = (N * 800) / 1000;
  const multiNs = (seq.total * 200) / 1000;
  const stageTotal = STAGES.reduce((s, k) => s + STAGE_DELAY_PS[k], 0);

  const dataDeps = sched.deps;
  const flushed = sched.rows.filter((r) => r.ghost).length;
  const hasBranch = instrs.some((i) => i.op === "beq");

  return (
    <div>
      <ModuleHeader mod={mod}>
        {t("If each instruction used the whole datapath alone, most of the hardware would sit idle most of the time. Pipelining is assembly-line thinking: start the next instruction before the last one finishes.")}
      </ModuleHeader>

      {/* ───────── 5.1 ───────── */}
      <Section
        mod={mod}
        num="5.1"
        title={ts("The five-stage pipeline")}
        lead={
          <>
            {t("Split the work into five stages — ")}<span className="text-sky-400">IF</span>, <span className="text-violet-400">ID</span>, <span className="text-amber-400">EX</span>, <span className="text-rose-400">MEM</span>, <span className="text-emerald-400">WB</span>{t(" — with a register between each. While instruction 1 is in EX, instruction 2 is in ID and instruction 3 is in IF. Choose a program, then press ")}<Code>{t("Play")}</Code>{t(" or drag the cycle slider.")}
          </>
        }
      >
        <Panel title={t("Program & options")} bodyClassName="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {PIPE_PRESETS.map((p) => (
                <Button
                  key={p.id}
                  className="!px-2.5 !py-1 !text-xs"
                  active={presetId === p.id}
                  onClick={() => {
                    setPresetId(p.id);
                    setSrc(p.src);
                    setPlaying(false);
                    setT(99);
                  }}
                >
                  {t(p.name)}
                </Button>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-mute">{t(PIPE_PRESETS.find((p) => p.id === presetId)?.blurb ?? "Custom program.")}</p>
            <textarea
              value={src}
              onChange={(e) => {
                setSrc(e.target.value);
                setPresetId(null);
                setT(99);
                setPlaying(false);
              }}
              rows={Math.min(10, Math.max(5, src.split("\n").length + 1))}
              spellCheck={false}
              aria-label={ts("Instruction sequence")}
              className="w-full resize-y rounded-xl border border-line bg-bg/70 p-3 font-mono text-[13px] leading-6 text-ink outline-none focus:border-pipe"
            />
            {errors.length > 0 ? (
              <ul className="space-y-0.5 text-xs text-bad">
                {errors.slice(0, 3).map((e, i) => (
                  <li key={i}>{tf("line {n}: {msg}", { n: e.line, msg: e.msg })}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-relaxed text-dim">
                {t("Syntax:")} <span className="font-mono">add/sub/and/or rd, rs, rt</span> · <span className="font-mono">addi rd, rs, imm</span> · <span className="font-mono">lw/sw rt, off(rs)</span> · <span className="font-mono">beq rs, rt, T|N</span> {t("(T = taken, N = not taken). r0 is hard-wired to zero.")}
              </p>
            )}
          </div>

          <div className="space-y-5 rounded-xl border border-line bg-bg/40 p-4">
            <Switch on={forwarding} onChange={setForwarding} label={t("Data forwarding (bypassing)")} hint={forwarding ? t("results are routed straight to the ALU") : t("operands only come from the register file")} color="#34d399" />
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Branch resolved in")}</div>
              <Segmented
                value={branchStage}
                onChange={setBranchStage}
                color="#34d399"
                options={[
                  { value: "ID", label: "ID" },
                  { value: "EX", label: "EX" },
                  { value: "MEM", label: "MEM" },
                ]}
              />
              <p className="mt-1 text-[11px] text-dim">{t("Earlier = smaller penalty, but needs extra comparator hardware (and forwarding into ID).")}</p>
            </div>
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-dim">{t("Fetch policy after a branch")}</div>
              <Segmented
                value={predictor}
                onChange={setPredictor}
                color="#34d399"
                options={[
                  { value: "not-taken", label: t("predict not-taken") },
                  { value: "stall", label: t("always stall") },
                ]}
              />
            </div>
          </div>
        </Panel>

        <Panel
          title={t("Live pipeline")}
          right={
            <>
              <Tag color="#34d399">{tt === 0 ? t("cycle 0") : tf("cycle {n} / {total}", { n: tt, total })}</Tag>
            </>
          }
        >
          <LivePipe sched={sched} t={tt} />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" color="#34d399" onClick={play} disabled={N === 0}>{playing ? t("‖ Pause") : tt >= total ? t("↺ Replay") : t("▶ Play")}</Button>
            <Button onClick={() => { setPlaying(false); setT(Math.max(0, tt - 1)); }} disabled={tt <= 0}>◂</Button>
            <Button onClick={() => { setPlaying(false); setT(Math.min(total, tt + 1)); }} disabled={tt >= total}>▸</Button>
            <div className="min-w-[160px] flex-1 px-2">
              <Slider label={t("Cycle")} value={tt} min={0} max={Math.max(total, 1)} onChange={(v) => { setPlaying(false); setT(v); }} color="#34d399" format={(v) => `${v}`} />
            </div>
            <Segmented value={speed} onChange={setSpeed} color="#34d399" options={[{ value: 1100, label: t("slow") }, { value: 650, label: t("normal") }, { value: 250, label: t("fast") }]} />
          </div>
        </Panel>

        <Panel
          title={t("Timing diagram")}
          right={
            <div className="flex items-center gap-3 text-[11px] text-dim">
              <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-good" />{t("forwarding path")}</span>
              <span className="flex items-center gap-1"><span className="inline-block h-0.5 w-4 bg-bad" />{t("hazard (stall)")}</span>
            </div>
          }
        >
          {N > 0 ? <Gantt sched={sched} t={tt} /> : <p className="text-sm text-dim">{t("Enter some instructions above.")}</p>}
          <p className="mt-3 text-xs leading-relaxed text-dim">
            {t("Each row is one instruction, each column one clock cycle. A diagonal staircase means a full pipeline. ")}<span className="text-mem">{t("Hatched “stall” cells")}</span>{t(" are cycles an instruction is held back; dashed red rows are wrong-path instructions that were fetched and then flushed.")}
          </p>
        </Panel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={t("Total cycles")} value={total} color="#34d399" sub={tf("ideal: {n} = N + 4", { n: N ? N + 4 : 0 })} />
          <Stat label="CPI" value={N ? cpi.toFixed(2) : "—"} color={cpi > 1.5 ? "#fb7185" : "#34d399"} sub={t("cycles per instruction (incl. fill)")} />
          <Stat label={t("Data stalls")} value={sched.dataStalls} color={sched.dataStalls ? "#fbbf24" : "#e8ecfb"} sub={t("bubbles from RAW hazards")} />
          <Stat label={t("Branch bubbles")} value={sched.branchBubbles} color={sched.branchBubbles ? "#fbbf24" : "#e8ecfb"} sub={hasBranch ? tf("{n} instr flushed", { n: flushed }) : t("no branches")} />
        </div>
      </Section>

      {/* ───────── 5.2 ───────── */}
      <Section
        mod={mod}
        num="5.2"
        title={ts("Hazards: when overlap goes wrong")}
        lead={t("Overlapping instructions assumes they're independent. When they aren't — or when the next PC is uncertain — the pipeline must insert bubbles. Three families of hazard:")}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {HAZARDS.map((h) => (
            <div key={h.name} className="rounded-xl border bg-surface/70 p-4" style={{ borderColor: h.color + "44" }}>
              <h3 className="mb-1 text-sm font-bold" style={{ color: h.color }}>{t(h.name)}</h3>
              <p className="mb-2 text-[13px] text-ink">{t(h.what)}</p>
              <p className="text-xs leading-relaxed text-mute"><b className="text-dim">{t("Fix:")}</b> {t(h.fix)}</p>
            </div>
          ))}
        </div>

        <Panel
          title={t("Hazards in your program")}
          right={<Switch on={forwarding} onChange={setForwarding} label={t("Forwarding")} color="#34d399" />}
          bodyClassName="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn("rounded-xl border p-4 transition-colors", !forwarding ? "border-bad/40 bg-bad/[0.06]" : "border-line bg-bg/40")}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Without forwarding")}</div>
              <div className="mt-1 font-mono text-3xl font-bold text-ink">{noFwd.total}<span className="ms-1 text-sm font-normal text-dim">{t("cycles")}</span></div>
              <div className="text-xs text-dim">{tf("{n} stall cycle{s}", { n: noFwd.dataStalls, s: noFwd.dataStalls === 1 ? "" : "s" })}</div>
            </div>
            <div className={cn("rounded-xl border p-4 transition-colors", forwarding ? "border-good/40 bg-good/[0.06]" : "border-line bg-bg/40")}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-dim">{t("With forwarding")}</div>
              <div className="mt-1 font-mono text-3xl font-bold text-ink">{withFwd.total}<span className="ms-1 text-sm font-normal text-dim">{t("cycles")}</span></div>
              <div className="text-xs text-dim">{tf("{n} stall cycle{s}", { n: withFwd.dataStalls, s: withFwd.dataStalls === 1 ? "" : "s" })}{noFwd.total > withFwd.total ? tf(" · saves {n}", { n: noFwd.total - withFwd.total }) : ""}</div>
            </div>
          </div>

          <ul className="space-y-2">
            {dataDeps.length === 0 && !hasBranch && (
              <li className="rounded-lg border border-line bg-bg/40 px-3 py-2.5 text-sm text-mute">{t("No hazards in this sequence — the pipeline sustains one instruction per cycle once full.")}</li>
            )}
            {dataDeps.map((d, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-bg/40 px-3 py-2.5 text-sm">
                <Tag color="#fb7185">RAW r{d.reg}</Tag>
                <span className="font-mono text-[13px] text-ink">{sched.rows[d.consumer].text}</span>
                <span className="text-dim">{t("needs the result of")}</span>
                <span className="font-mono text-[13px] text-ink">{sched.rows[d.producer].text}</span>
                <span className="ms-auto flex items-center gap-2">
                  {d.stalls > 0 && <Tag color="#fbbf24">{tf("stall × {n}", { n: d.stalls })}</Tag>}
                  {d.forwarded && <Tag color="#34d399">{tf("forward {label}", { label: d.label })}</Tag>}
                </span>
              </li>
            ))}
            {hasBranch && (
              <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-bg/40 px-3 py-2.5 text-sm">
                <Tag color="#a78bfa">{t("Control")}</Tag>
                <span className="text-mute">
                  {predictor === "stall"
                    ? tf("Fetch stalls until each beq resolves in {stage}.", { stage: branchStage })
                    : instrs.some((i) => i.op === "beq" && i.taken)
                      ? tf("Taken beq resolves in {stage}; the {n} instruction{s} fetched behind it were wrong-path and are flushed.", { stage: branchStage, n: flushed, s: flushed === 1 ? "" : "s" })
                      : t("Not-taken branches match the prediction, so there is no penalty.")}
                </span>
                <span className="ms-auto"><Tag color="#fbbf24">{tf("{n} bubble{s}", { n: sched.branchBubbles, s: sched.branchBubbles === 1 ? "" : "s" })}</Tag></span>
              </li>
            )}
          </ul>
          <p className="text-xs leading-relaxed text-dim">
            {t("Try it: on ")}<b className="text-mute">{t("RAW chain")}</b>{t(", turn forwarding on and the two stall cycles vanish — the result of ")}<Code>sub</Code>{t(" is passed from the EX/MEM register straight into the next ALU operation. On ")}<b className="text-mute">{t("Load-use")}</b>{t(", one stall always remains: a load's data only exists at the end of MEM, one stage too late for the very next EX.")}
          </p>
        </Panel>
      </Section>

      {/* ───────── 5.3 ───────── */}
      <Section
        mod={mod}
        num="5.3"
        title={ts("Pipelined vs. non-pipelined")}
        lead={t("Same instructions, same hardware, same clock — one machine finishes each instruction before starting the next, the other overlaps them.")}
      >
        <Panel title={t("Non-pipelined (5 cycles per instruction)")}>
          {N > 0 ? <Gantt sched={seq} t={99} arrows={false} colW={28} labelW={150} rowH={32} /> : null}
        </Panel>
        <Panel title={t("Pipelined (current options)")}>
          {N > 0 ? <Gantt sched={sched} t={99} colW={28} labelW={150} rowH={32} /> : null}
        </Panel>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("Non-pipelined")} value={`${seq.total}`} sub={t("cycles (5 × N)")} />
          <Stat label={t("Pipelined")} value={`${total}`} color="#34d399" sub={t("cycles")} />
          <Stat label={t("Speedup")} value={total ? `${(seq.total / total).toFixed(2)}×` : "—"} color="#34d399" sub={t("in cycles, same clock")} />
          <Stat label={t("Limit as N → ∞")} value="→ 5×" sub={t("(CPI → 1 vs. 5)")} />
        </div>

        <Panel title={t("It's about throughput, not latency")}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 text-sm leading-relaxed text-mute">
              <p>
                {t("Every instruction still takes ")}<b className="text-ink">{t("5 cycles")}</b>{t(" from fetch to write-back — latency didn't improve (it actually gets slightly worse from the pipeline registers). What changed is ")}<b className="text-ink">{t("throughput")}</b>{t(": one instruction completes per cycle once the pipeline is full.")}
              </p>
              <p>
                {t("Real stages aren't perfectly balanced, so the clock must fit the ")}<em>{t("slowest")}</em>{tf(" one. With textbook delays below, the pipelined clock is 200 ps while a single-cycle design needs {n} ps per instruction.", { n: stageTotal })}
              </p>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="rounded-lg border border-line bg-bg/40 p-2.5"><div className="text-dim">{t("single-cycle")}</div><div className="text-base font-bold text-ink">{singleCycleNs.toFixed(1)} ns</div><div className="text-dim">{N} × {stageTotal} ps</div></div>
                <div className="rounded-lg border border-line bg-bg/40 p-2.5"><div className="text-dim">{t("multi-cycle")}</div><div className="text-base font-bold text-ink">{multiNs.toFixed(1)} ns</div><div className="text-dim">{seq.total} × 200 ps</div></div>
                <div className="rounded-lg border border-pipe/40 bg-pipe/[0.07] p-2.5"><div className="text-dim">{t("pipelined")}</div><div className="text-base font-bold text-pipe">{pipeTimeNs.toFixed(1)} ns</div><div className="text-dim">{total} × 200 ps</div></div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-dim">{t("Stage delays (ps) — the slowest sets the clock")}</div>
              <div className="space-y-2">
                {STAGES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span className="w-10 font-mono text-xs font-bold" style={{ color: STAGE_INFO[s].hex }}>{s}</span>
                    <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-line/70">
                      <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(STAGE_DELAY_PS[s] / 200) * 100}%`, background: STAGE_INFO[s].hex + "88" }} />
                      {STAGE_DELAY_PS[s] < 200 && <div className="absolute inset-y-0 end-0 flex items-center pe-2 text-[10px] text-dim">{tf("idle for {n} ps each cycle", { n: 200 - STAGE_DELAY_PS[s] })}</div>}
                    </div>
                    <span className="w-12 text-end font-mono text-xs text-mute">{STAGE_DELAY_PS[s]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-dim">{tf("Ideal speedup over single-cycle = {a} / 200 = {b}×, not 5× — imbalance costs a stage's worth.", { a: stageTotal, b: (stageTotal / 200).toFixed(0) })}</p>
            </div>
          </div>
        </Panel>

        <Callout title={ts("Beyond the 5-stage pipe")} tone="idea">
          {t("Deeper pipelines raise the clock but make hazards costlier. Superscalar cores issue several instructions per cycle; out-of-order cores reorder independent ones to hide stalls; branch predictors guess outcomes far more cleverly than “not taken”. All of them are this same idea — keep every piece of hardware busy — pushed further, and all of them lean on the cache hierarchy from Module 03 to keep the front of the pipe fed.")}
        </Callout>
      </Section>
    </div>
  );
}
